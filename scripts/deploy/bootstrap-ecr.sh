#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

AWS_REGION="${AWS_REGION:-}"
ECR_REPOSITORY="${ECR_REPOSITORY:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [[ -z "$AWS_REGION" || -z "$ECR_REPOSITORY" ]]; then
  echo "Usage: AWS_REGION=<region> ECR_REPOSITORY=<name> [IMAGE_TAG=latest] bash scripts/deploy/bootstrap-ecr.sh"
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: aws CLI is not installed"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed"
  exit 1
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo "Logging in to ECR: $ECR_REGISTRY"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

echo "Building image: $IMAGE_URI"
docker build -t "$IMAGE_URI" "$ROOT_DIR"

echo "Pushing image to ECR"
docker push "$IMAGE_URI"

echo "Bootstrap image pushed: $IMAGE_URI"
