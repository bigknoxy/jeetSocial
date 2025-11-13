#!/bin/bash

# Fix Docker Compose permission issues
# This script addresses the sysctl permission denied error

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "Fixing Docker Compose permission issues..."

# Check current sysctl setting
print_status "Current sysctl setting:"
sysctl net.ipv4.ip_unprivileged_port_start || print_error "Cannot read sysctl"

# Solution 1: Update sysctl to allow unprivileged ports
print_status "Setting sysctl for unprivileged ports..."
echo "net.ipv4.ip_unprivileged_port_start = 80" >> /etc/sysctl.conf
sysctl -p

# Solution 2: Configure Docker daemon for better compatibility
print_status "Configuring Docker daemon..."
mkdir -p /etc/docker

# Create or update Docker daemon configuration
cat > /etc/docker/daemon.json << 'EOF'
{
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "exec-opts": ["native.cgroupdriver=systemd"]
}
EOF

print_status "Restarting Docker daemon..."
systemctl restart docker
systemctl enable docker

# Solution 3: Clean up any existing containers that might be causing issues
print_status "Cleaning up existing containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker system prune -f

print_success "Docker configuration updated!"
echo ""
print_status "Try running your docker compose command again:"
print_status "docker compose up"
echo ""
print_warning "If the issue persists, try these additional steps:"
print_status "1. Reboot the system: reboot"
print_status "2. Or run with elevated privileges: docker compose up --force-recreate"