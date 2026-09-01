#!/bin/bash
# simple deployment and pulling latest changes to the VPS server

set -e # immediately exit

cd /home/ubuntu/lastfm-gamification

echo "=== Pulling latest changes from Github ==="
git pull origin master

echo "=== Restart Service ==="
sudo systemctl restart lastfm-backend

echo "=== Checking Status ==="
sudo systemctl status lastfm-backend --no-pager

echo "=== Checking Health ==="
curl -sf https://43-134-108-8.sslip.io/health

echo "Deployment Completed"
