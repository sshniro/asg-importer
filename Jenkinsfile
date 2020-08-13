#!/usr/bin/env groovy

node('nimble-jenkins-slave') {

    stage('Clone and Update') {
        git(url: 'https://github.com/nimble-platform/asg-importer.git', branch: env.BRANCH_NAME)
    }

    if (env.BRANCH_NAME == 'master') {
        stage('Build Docker') {
            sh 'docker build -t nimbleplatform/asg-importer:latest .'
        }

        stage('Push Docker') {
            sh 'docker push nimbleplatform/asg-importer:latest'
        }
    }
}
