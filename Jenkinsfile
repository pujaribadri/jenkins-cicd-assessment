pipeline {
    agent any

    parameters {
        string(
            name: 'ROLLBACK_TAG',
            defaultValue: '',
            description: 'Optional Docker image tag to deploy instead of the current build'
        )
    }

    environment {
        IMAGE_NAME = 'jenkins-cicd-demo'
        APP_PORT = '3000'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                dir('app') {
                    sh 'npm install'
                }
            }
        }

        stage('Test') {
            steps {
                dir('app') {
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        docker build \
                        -t ${IMAGE_NAME}:${BUILD_NUMBER} \
                        .
                    """
                }
            }
        }

        stage('Trivy Security Scan') {
            steps {
                script {
                    sh """
                        docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:0.74.0 \
                        image \
                        --severity HIGH,CRITICAL \
                        --ignore-unfixed \
                        --exit-code 0 \
                        --format table \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        | tee trivy-report.txt
                    """
                }
            }
        }

        stage('Prepare Deployment') {
            steps {
                script {
                    def deployTag = params.ROLLBACK_TAG?.trim()
                        ? params.ROLLBACK_TAG.trim()
                        : env.BUILD_NUMBER

                    sh """
                        cp .env.example .env
                        sed -i 's/^APP_VERSION=.*/APP_VERSION=${deployTag}/' .env
                        sed -i 's/^APP_PORT=.*/APP_PORT=${APP_PORT}/' .env

                        echo "Deploying image: ${IMAGE_NAME}:${deployTag}"
                    """
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh 'docker compose up -d --force-recreate'
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sh '''
                        echo "Waiting for application health check..."

                        for i in 1 2 3 4 5 6 7 8 9 10; do
                            STATUS=$(docker inspect \
                                --format='{{.State.Health.Status}}' \
                                jenkins-cicd-app 2>/dev/null || true)

                            echo "Health status: $STATUS"

                            if [ "$STATUS" = "healthy" ]; then
                                echo "Application is healthy."
                                exit 0
                            fi

                            sleep 5
                        done

                        echo "Application failed health check."
                        docker compose ps
                        exit 1
                    '''
                }
            }
        }

        stage('Application Test') {
            steps {
                sh '''
                    echo "Testing application endpoint..."
                    curl -f http://localhost:3000/health

                    echo ""
                    echo "Testing application API..."
                    curl -f http://localhost:3000/api/message
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    echo "Removing unused Docker images..."
                    docker image prune -f
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
        }

        success {
            echo 'CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD pipeline failed. Check the failed stage for details.'
        }
    }
}