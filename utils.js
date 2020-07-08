const fetch = require("node-fetch");

let util = {
    getMatchingRoute: ((asgJson, hostPort, prefix, path, rootPrefix) => {
        let routeID = null;
        let nodes = asgJson.node.nodes;

        let uri = `${rootPrefix}/${prefix}/${path}`;

        if (nodes !== undefined && nodes.length !== 0) {
            for (let i = 0; i < nodes.length; i++) {
                let node = nodes[i];
                if (node.value.uri === `/${rootPrefix}/${prefix}${path}` && node.value.upstream.nodes.hasOwnProperty(hostPort)) {
                    let key = nodes[i].key;
                    routeID = key.substring(key.lastIndexOf("/") + 1, key.length);
                    break;
                }
            }
        }
        return routeID;
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

            fetch(`${efsURL}/apisix/admin/routes/1`, {
                method: 'PUT',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': X_API_KEY
                },
            })
                .then(res => {
                    return res.json()
                })
                .then(json => {
                    console.log(`created default route ${JSON.stringify(json)}`)
                })
                .catch((err) => {
                    console.log(`error occurred while creating the route: ${err}`)
                })
        }
    })
};

module.exports = util;
