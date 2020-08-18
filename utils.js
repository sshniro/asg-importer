const fetch = require("node-fetch");

let apiRequest = ((URL,X_API_KEY, method,body) => {
    let options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': X_API_KEY
        },
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    fetch(URL, options)
        .then(res => {
            return res.json()
        })
        .then(json => {
            console.log(`created default route ${JSON.stringify(json)}`)
        })
        .catch((err) => {
            console.log(`error occurred while creating the route: ${err}`)
        });

});

let util = {
    getMatchingRoute: ((asgJson, hostPort, prefix, path, rootPrefix) => {
        let routeID = null;
        let nodes = asgJson.node.nodes;

        let uri = `${rootPrefix}/${prefix}/${path}`;

        if (nodes !== undefined && nodes.length !== 0) {
            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                if (node.value.uri.includes(`/${rootPrefix}/${prefix}`) && node.value.upstream.nodes.hasOwnProperty(hostPort)) {
                    let key = nodes[i].key;
                    routeID = key.substring(key.lastIndexOf("/") + 1, key.length);
                    break;
                }
            }
        }
        return routeID;
    }),

    createServiceRegistryEndpoint: ((SR_URL, efsURL, X_API_KEY) => {

        let url_split = SR_URL;
        url_split = url_split.split("/services/")[0];
        let url = new URL(url_split);

        let host = url.hostname;
        let port = url.port;

        if(port === undefined || port === ""){
            if (url.protocol === "http:") {
                port = 80
            }else {
                port = 443
            }
        }
        let hostPort = `${host}:${port}`;

        const srGetBody = {
            "methods": ["GET"],
            "uri": "/apis/sr*",
            "plugins": {
                "proxy-rewrite": {
                    "regex_uri": ["^/apis/sr(.*)", "/services/$1"],
                    "scheme": "https"
                },
                "authz-keycloak": {
                    "token_endpoint": `${efsURL}/auth/realms/master/protocol/openid-connect/token`,
                    "permissions": ["service_registry#sr_view"],
                    "audience": "apisix",
                    "ssl_verify": false
                }
            },
            "upstream": {
                "type": "roundrobin",
                "nodes": {
                    [hostPort]: 1
                }
            }
        };


        const srAdminBody = {
            "methods": ["POST", "PUT", "PATCH", "DELETE"],
            "uri": "/apis/sr*",
            "plugins": {
                "proxy-rewrite": {
                    "regex_uri": ["^/apis/sr(.*)", "/services/$1"],
                    "scheme": "https"
                },
                "authz-keycloak": {
                    "token_endpoint": `${efsURL}/auth/realms/master/protocol/openid-connect/token`,
                    "permissions": ["service_registry#sr_admin"],
                    "audience": "apisix",
                    "ssl_verify": false
                }
            },
            "upstream": {
                "type": "roundrobin",
                "nodes": {
                    [hostPort]: 1
                }
            }
        };

        apiRequest(`${efsURL}/apisix/admin/routes/2`, X_API_KEY, "PUT", srGetBody);
        apiRequest(`${efsURL}/apisix/admin/routes/3`, X_API_KEY, "PUT", srAdminBody);
    }),

    createOrUpdateEcoEndpoint: ((asgJson, efsURL, X_API_KEY) => {
        let routeExists = false;
        let nodes = asgJson.node.nodes;
        if (nodes !== undefined && nodes.length !== 0) {
            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                if (node.value.uri === "/apis/bin/get" && node.key === "/apisix/routes/1") {
                    routeExists = true;
                    break;
                }
            }
        }

        if (!routeExists) {
            const body = {
                "uri": "/apis/bin/get",
                "plugins": {
                    "proxy-rewrite": {
                        "regex_uri": ["^/apis/bin/get(.*)", "/get$1"],
                        "scheme": "https"
                    }
                },
                "upstream": {
                    "type": "roundrobin",
                    "nodes": {
                        "httpbin.org:443": 1
                    }
                }
            };

            apiRequest(`${efsURL}/apisix/admin/routes/1`, X_API_KEY, "PUT", body);
        }
    })
};

module.exports = util;
