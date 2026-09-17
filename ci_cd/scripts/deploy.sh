#!/usr/bin/env bash
# ==============================================================================
# BHARAT-DRISHTI // Zero-Downtime Deployment Script
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

echo "================================================================================"
echo "  BHARAT-DRISHTI // Starting Automated Deployment"
echo "================================================================================"

# 1. Pull latest Docker images
echo "[*] Pulling latest production images..."
docker compose -f ci_cd/docker/docker-compose.yml pull || echo "[!] Using locally built images."

# 2. Rebuild containers if needed
echo "[*] Building and starting service containers..."
docker compose -f ci_cd/docker/docker-compose.yml up -d --build --remove-orphans

# 3. Wait for backend liveness probe
echo "[*] Executing automated deployment health check..."
python3 ci_cd/scripts/health_check.py --url http://127.0.0.1:8000 --retries 15 --delay 2

echo "================================================================================"
echo "  [SUCCESS] BHARAT-DRISHTI Deployment Complete and Verified Healthy!"
echo "================================================================================"
