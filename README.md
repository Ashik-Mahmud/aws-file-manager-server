# AWS File Manager Server

Production deployment of a NestJS file-management API using Docker, Amazon ECR, Amazon EC2, Nginx, HTTPS, Amazon S3, Amazon DynamoDB, AWS IAM, AWS Systems Manager, and GitHub Actions CI/CD.

## Overview

The application is deployed as a Docker container on an Amazon EC2 instance.

```text
Internet
   |
   | HTTPS
   v
Nginx
   |
   +--> 98.81.220.231.nip.io
   |         |
   |         v
   |    aws-app-container
   |
   +--> file-manager.98.81.220.231.nip.io
             |
             v
      aws-file-manager-container
             |
             +--> Amazon S3
             |
             +--> Amazon DynamoDB
```

File Manager API:

```text
https://file-manager.98.81.220.231.nip.io/api
```

## Tech Stack

- NestJS
- Node.js 22
- TypeScript
- Prisma
- Docker
- Amazon ECR
- Amazon EC2
- Nginx
- Let's Encrypt / Certbot
- Amazon S3
- Amazon DynamoDB
- AWS IAM Roles
- AWS Systems Manager (SSM)
- GitHub Actions
- GitHub OIDC

## Repository Structure

```text
.
├── src/
├── prisma/
├── Dockerfile
├── .dockerignore
├── .gitignore
├── package.json
├── package-lock.json
└── .github/
    └── workflows/
        └── deploy.yml
```

## Docker

The application uses a multi-stage Docker build based on Node.js 22 Alpine.

```text
Source Code
    |
    v
Docker Build
    |
    v
Docker Image
    |
    v
Amazon ECR
```

The production `.env` file is not included in the Docker image.

## Amazon ECR

The Docker image is stored in an Amazon ECR repository named:

```text
aws-file-manager
```

Deployments use the Git commit SHA as the Docker image tag instead of `latest`.

Example:

```text
aws-file-manager:<git-sha>
```

Immutable commit-based tags make deployments traceable and make rollback easier.

## EC2 Deployment

The File Manager container runs on EC2 as:

```text
aws-file-manager-container
```

Docker network:

```text
aws-docker-app_default
```

The container uses:

```text
--restart unless-stopped
```

The production environment file is stored on the EC2 instance at:

```text
/etc/aws-file-manager/.env
```

The container loads runtime configuration with:

```text
--env-file /etc/aws-file-manager/.env
```

## Production Environment Variables

Production configuration can include:

```env
PORT=3000
NODE_ENV=production
AWS_REGION=us-east-1
AWS_DYNAMODB_TABLE=...
AWS_S3_BUCKET=...
JWT_SECRET=...
JWT_EXPIRES_IN=1h
```

Never commit real production secrets to GitHub.

Use a safe `.env.example` for documenting required variables.

## AWS IAM

The EC2 instance uses an IAM role rather than hard-coded AWS credentials.

The application role provides the required access for:

- Amazon S3
- Amazon DynamoDB
- Amazon ECR image pulling
- AWS Systems Manager

This keeps AWS credentials out of source code and Docker images.

## Amazon S3

S3 is used for file/image storage.

Basic application flow:

```text
Client
   |
   v
NestJS API
   |
   v
Amazon S3
```

For larger production workloads, presigned URLs can be used so clients upload directly to S3.

## Amazon DynamoDB

DynamoDB is used for application data configured for the File Manager project.

The application accesses DynamoDB through the EC2 IAM role.

## Nginx

Nginx acts as the reverse proxy.

Current routing:

```text
98.81.220.231.nip.io
    |
    v
aws-app-container:3000
```

```text
file-manager.98.81.220.231.nip.io
    |
    v
aws-file-manager-container:3000
```

Only Nginx ports are exposed publicly:

```text
80  -> HTTP
443 -> HTTPS
```

The application container port `3000` is not directly exposed to the public internet.

## HTTPS

HTTPS is provided using Let's Encrypt certificates managed by Certbot.

HTTP traffic is redirected to HTTPS.

Current File Manager host:

```text
file-manager.98.81.220.231.nip.io
```

Certbot is configured for automatic renewal.

## GitHub Actions CI/CD

Deployment is automated from the `main` branch.

```text
git push origin main
        |
        v
GitHub Actions
        |
        v
GitHub OIDC
        |
        v
AWS IAM deployment role
        |
        v
Docker Build
        |
        v
Amazon ECR
        |
        v
AWS Systems Manager
        |
        v
EC2
        |
        v
Pull new image
        |
        v
Replace aws-file-manager-container
        |
        v
Load /etc/aws-file-manager/.env
        |
        v
Application is live
```

No long-lived AWS access key is required in GitHub Actions.

GitHub OIDC is used to assume a dedicated deployment IAM role restricted to this repository's `main` branch.

## Deployment Workflow

The workflow is located at:

```text
.github/workflows/deploy.yml
```

The workflow:

1. Checks out the repository.
2. Authenticates to AWS using GitHub OIDC.
3. Logs in to Amazon ECR.
4. Builds the Docker image.
5. Tags the image with the Git commit SHA.
6. Pushes the image to ECR.
7. Sends an AWS Systems Manager command to EC2.
8. Pulls the exact image version.
9. Stops and removes the old File Manager container.
10. Starts the new container using the existing server-side `.env`.
11. Cleans unused Docker images.

## Updating the Application

For normal code changes:

```bash
git add .
git commit -m "your change"
git push origin main
```

GitHub Actions handles the deployment automatically.

Normally you do not need to manually run:

```text
docker build
docker push
docker pull
docker stop
docker rm
docker run
```

for every code change.

## Adding a New Environment Variable

Production environment variables live on EC2, not in GitHub.

Example:

```env
MAX_FILE_SIZE=10485760
```

Add the required production variable to:

```text
/etc/aws-file-manager/.env
```

The CI/CD workflow does not need to change just because a new runtime variable is added.

For a more advanced production setup, AWS Systems Manager Parameter Store or AWS Secrets Manager can replace the server-side `.env` file.

## Local Development

Install dependencies:

```bash
npm install
```

Run the application:

```bash
npm run start:dev
```

Generate the Prisma client when needed:

```bash
npx prisma generate
```

## Prisma and Production Database

Prisma schema files are not uploaded directly to a database.

Production database structure is updated through Prisma migrations.

Development:

```bash
npx prisma migrate dev --name <migration-name>
```

Production:

```bash
npx prisma migrate deploy
```

When Amazon RDS PostgreSQL is introduced, the production `DATABASE_URL` should point to the RDS endpoint.

## Security Notes

- Never commit `.env` files containing real secrets.
- Never hard-code AWS access keys in source code.
- Prefer IAM roles on EC2.
- Prefer GitHub OIDC instead of long-lived AWS keys in GitHub Actions.
- Keep S3 buckets private unless public access is explicitly required.
- Restrict IAM permissions to only the resources the application needs.
- Use immutable Docker image tags for deployments.
- Do not expose application port `3000` directly when Nginx is the public reverse proxy.

## Future Improvements

- Amazon RDS PostgreSQL
- AWS Secrets Manager or Parameter Store
- Amazon CloudWatch logs and alarms
- Route 53 with a real domain
- CloudFront for S3 content delivery
- SQS for background jobs
- Lambda for event-driven tasks
- ECS/Fargate for container orchestration
- Automated health checks and rollback

## Current Deployment Status

```text
Docker                 ✅
Amazon ECR             ✅
Amazon EC2             ✅
IAM Roles              ✅
Amazon S3              ✅
DynamoDB               ✅
Nginx                  ✅
HTTPS / Let's Encrypt  ✅
AWS SSM                ✅
GitHub OIDC            ✅
GitHub Actions CI/CD   ✅
Immutable image tags   ✅
```

## Project Goal

The goal is to maintain a reusable, production-oriented deployment pattern where application code can be updated with:

```bash
git push origin main
```

and the Docker image, ECR version, EC2 container, and application deployment are updated automatically.
