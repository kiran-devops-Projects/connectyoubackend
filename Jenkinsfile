pipeline {
    agent any

    environment {
        AWS_CREDENTIALS_ID = 'credentials-aws' // ✅ Updated credentials ID
        GITHUB_CREDENTIALS_ID = 'github-token'
        SONARQUBE_ENV = 'sonarqube'
        ACCOUNT_ID = '615492648587'
        REGION = 'us-east-1'
        IMAGE_NAME = 'connectyou'
        IMAGE_TAG = "${BUILD_NUMBER}"
        BACKEND_IMAGE = "${IMAGE_NAME}:${IMAGE_TAG}"
        ECR_BACKEND_IMAGE = "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${IMAGE_NAME}:${IMAGE_TAG}"
        GIT_USER_NAME = 'kiran877'
        GIT_REPO_NAME = 'connectyoubackend'
        GIT_ORG_NAME = 'kiran-devops-Projects'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    cleanWs()
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        userRemoteConfigs: [[
                            credentialsId: GITHUB_CREDENTIALS_ID,
                            url: "https://github.com/${GIT_ORG_NAME}/${GIT_REPO_NAME}.git"
                        ]]
                    ])
                }
            }
        }

        stage('Debug Workspace') {
            steps {
                sh '''
                    echo "📂 Debugging workspace structure..."
                    find . -maxdepth 2
                '''
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube', variable: 'SONAR_TOKEN')]) {
                    script {
                        def scannerHome = tool 'SonarScanner'
                        withSonarQubeEnv(SONARQUBE_ENV) {
                            sh '''
                                ${SCANNER_HOME}/bin/sonar-scanner \
                                -Dsonar.token=$SONAR_TOKEN \
                                -Dsonar.projectKey=connetyou-backend
                            '''.stripIndent().replace('${SCANNER_HOME}', scannerHome)
                        }
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                script {
                    sleep(60)
                    timeout(time: 1, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: false, credentialsId: 'sonarqube'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.build(BACKEND_IMAGE, '-f Dockerfile .')
                }
            }
        }

            stage('Push Docker Image to AWS ECR') {
                steps {
                    withAWS(credentials: AWS_CREDENTIALS_ID, region: REGION) { // ✅ uses updated credentials ID
                        script {
                            sh """
                                if ! aws ecr describe-repositories --repository-names ${IMAGE_NAME} --region ${REGION} >/dev/null 2>&1; then
                                    aws ecr create-repository --repository-name ${IMAGE_NAME} --region ${REGION}
                                    echo "✅ Created ECR repository ${IMAGE_NAME}"
                                fi

                                aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
                                docker tag ${BACKEND_IMAGE} ${ECR_BACKEND_IMAGE}
                                docker push ${ECR_BACKEND_IMAGE}
                            """
                        }
                    }
                }
            }

            stage('Update Deployment File') {
                steps {
                    withCredentials([usernamePassword(credentialsId: "${GITHUB_CREDENTIALS_ID}", usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')]) {
                    script {
                        sh '''
                            DEPLOYMENT_REPO="connectyoubackend-manifest"
                            DEPLOYMENT_FILE="deployment.yaml"
                            IMAGE_TAG=${BUILD_NUMBER}
                            IMAGE_NAME="${IMAGE_NAME}"
                            ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
                            CLONE_DIR="deployment-repo"

                            echo "🔄 Cloning deployment repo (branch: main)..."
                            git clone -b main "https://x-access-token:${GIT_PASSWORD}@github.com/${GIT_ORG_NAME}/${DEPLOYMENT_REPO}.git" "${CLONE_DIR}" || { echo "❌ Clone failed"; exit 1; }

                            cd "${CLONE_DIR}" || { echo "❌ Could not enter clone directory"; exit 1; }

                            if [ -f "${DEPLOYMENT_FILE}" ]; then
                                echo "✅ Found deployment.yaml. Updating image tag..."

                                sed -i'' -E "s|(image: \\\"?)${ECR_REPO}/${IMAGE_NAME}:[^\\\" ]+(\\\"?)|\\1${ECR_REPO}/${IMAGE_NAME}:${IMAGE_TAG}\\2|g" "${DEPLOYMENT_FILE}"

                                echo "📄 Updated image line:"
                                grep "image:" "${DEPLOYMENT_FILE}"

                                git config user.email "kirangavvala078@gmail.com"
                                git config user.name "${GIT_USER_NAME}"
                                git add "${DEPLOYMENT_FILE}"

                                if ! git diff --cached --quiet; then
                                    git commit -m "🔧 Update deployment image to version ${IMAGE_TAG}"
                                    git push origin ms1 || { echo "❌ Push failed"; exit 1; }
                                    echo "✅ Deployment file updated and pushed to ms1 branch."
                                else
                                    echo "ℹ️ No changes to commit in deployment.yaml."
                                fi
                            else
                                echo "⚠️ File not found: ${DEPLOYMENT_FILE}"
                                exit 1
                            fi
                        '''
                    }
                }
            }
        }

    }
}