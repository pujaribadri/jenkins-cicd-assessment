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
            when {
                expression {
                    !params.ROLLBACK_TAG?.trim()
                }
            }

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

        stage('Verify Rollback Image') {
            when {
                expression {
                    params.ROLLBACK_TAG?.trim()
                }
            }

            steps {
                script {
                    def rollbackTag = params.ROLLBACK_TAG.trim()

                    sh """
                        echo "Checking rollback image: ${IMAGE_NAME}:${rollbackTag}"

                        docker image inspect ${IMAGE_NAME}:${rollbackTag} >/dev/null 2>&1

                        if [ \$? -ne 0 ]; then
                            echo "ERROR: Rollback image ${IMAGE_NAME}:${rollbackTag} does not exist."
                            exit 1
                        fi

                        echo "Rollback image exists: ${IMAGE_NAME}:${rollbackTag}"
                    """
                }
            }
        }

        stage('Trivy Security Scan') {
            when {
                expression {
                    !params.ROLLBACK_TAG?.trim()
                }
            }

            steps {
                script {
                    sh """
                        echo "Starting Trivy security scan..."

                        docker volume create trivy-cache >/dev/null 2>&1 || true

                        docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v trivy-cache:/root/.cache/trivy \
                        aquasec/trivy:0.74.0 \
                        image \
                        --timeout 20m \
                        --severity HIGH,CRITICAL \
                        --ignore-unfixed \
                        --exit-code 0 \
                        --format table \
                        ${IMAGE_NAME}:${BUILD_NUMBER} \
                        | tee trivy-report.txt

                        echo "Trivy security scan stage completed."
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
                sh '''
                    docker compose up -d --force-recreate
                '''
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
                    echo "Testing application health endpoint..."

                    curl -f http://jenkins-cicd-app:3000/health

                    echo ""

                    echo "Testing application API..."

                    curl -f http://jenkins-cicd-app:3000/api/message

                    echo ""
                '''
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    echo "Removing unused Docker images for this project..."

                    docker image ls "${IMAGE_NAME}" \
                        --filter "dangling=true" \
                        --quiet \
                        | xargs -r docker rmi || true

                    echo "Project-specific Docker image cleanup completed."
                '''
            }
        }
    }

    post {

        always {
            archiveArtifacts(
                artifacts: 'trivy-report.txt',
                allowEmptyArchive: true
            )
        }

        success {
            echo 'CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD pipeline failed. Check the failed stage for details.'
        }
    }
}