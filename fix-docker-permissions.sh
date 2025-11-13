#!/bin/bash
# jeetSocial Docker Permission Fix Script
# Addresses sysctl net.ipv4.ip_unprivileged_port_start permission denied error

set -e

echo "🔧 jeetSocial Docker Permission Fix"
echo "=================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

echo "📋 Issue: Docker containers fail with 'sysctl net.ipv4.ip_unprivileged_port_start permission denied'"
echo "🔍 Root Cause: Recent Docker/kernel changes affecting container runtime"

# Solution 1: System-level sysctl configuration
echo ""
echo "🛠️  Applying Solution 1: System-level sysctl configuration..."

# Create Docker-specific sysctl configuration
cat > /etc/sysctl.d/99-docker.conf << EOF
# Docker container runtime fix for unprivileged port access
# Addresses: sysctl net.ipv4.ip_unprivileged_port_start permission denied
net.ipv4.ip_unprivileged_port_start=0
EOF

# Apply sysctl configuration
echo "📡 Applying sysctl configuration..."
sysctl --system

# Solution 2: Restart container services
echo ""
echo "🛠️  Applying Solution 2: Restart container services..."

# Restart containerd
echo "🔄 Restarting containerd..."
systemctl restart containerd

# Restart Docker
echo "🔄 Restarting Docker..."
systemctl restart docker

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 5

# Solution 3: Verify Docker functionality
echo ""
echo "🛠️  Applying Solution 3: Verify Docker functionality..."

# Test basic Docker functionality
echo "🧪 Testing basic Docker functionality..."
if docker run --rm alpine echo "Docker works!" > /dev/null 2>&1; then
    echo "✅ Basic Docker functionality: WORKING"
else
    echo "❌ Basic Docker functionality: FAILED"
    echo "🔧 Additional troubleshooting may be required"
    exit 1
fi

# Test jeetSocial container
echo ""
echo "🧪 Testing jeetSocial container..."
cd /root/code/jeet

# Stop any existing containers
docker compose down > /dev/null 2>&1 || true

# Start jeetSocial with host network mode as fallback
echo "🚀 Starting jeetSocial with host network mode..."
if docker compose up --no-deps web -d; then
    echo "✅ jeetSocial container: STARTED"
    echo ""
    echo "🌐 Application should be available at: http://localhost:5678"
    echo "🔌 WebSocket connections should work on host network"
else
    echo "❌ jeetSocial container: FAILED"
    echo "🔧 Check Docker logs: docker compose logs web"
    exit 1
fi

echo ""
echo "✅ Docker permission fix completed successfully!"
echo ""
echo "📝 Summary of changes:"
echo "   • Added sysctl configuration for unprivileged port access"
echo "   • Restarted containerd and Docker services"  
echo "   • Started jeetSocial with host network mode"
echo "   • Verified container functionality"
echo ""
echo "🔍 To verify: curl http://localhost:5678"
echo "📚 For more details: see DOCKER_PERMISSION_FIX.md"