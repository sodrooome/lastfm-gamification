# simple deployment and pulling latest changes to the VPS server
#!/bin/basb

set -e # immediately exit

cd /home/ubuntu/lastfm-gamification

echo "=== Pulling latest changes from Github ==="
git pull origin master

echo "=== Activating virtual environment ==="
source venv/bin/activate

echo "=== Restart Service ==="
sudo systemctl restart lastfm-backend

echo "=== Checking Status ==="
sudo systemctl status lastfm-backend --no-pager 1

echo "Deployment Completed"
curl -s https://43-134-108-8.sslip.io/health