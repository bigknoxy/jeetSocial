#!/bin/bash

# Docker Installation Script for Linux
# This script detects the Linux distribution, checks if Docker is installed,
# and installs the latest stable version of Docker Engine if needed.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to detect Linux distribution
detect_os() {
    print_status "Detecting Linux distribution..."
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        CODENAME=$VERSION_CODENAME
        print_status "Detected OS: $OS $VER"
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
        CODENAME=$(lsb_release -sc)
        print_status "Detected OS: $OS $VER"
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        OS=$DISTRIB_ID
        VER=$DISTRIB_RELEASE
        CODENAME=$DISTRIB_CODENAME
        print_status "Detected OS: $OS $VER"
    elif [ -f /etc/debian_version ]; then
        OS="Debian"
        VER=$(cat /etc/debian_version)
        print_status "Detected OS: $OS $VER"
    else
        print_error "Cannot detect Linux distribution"
        exit 1
    fi
}

# Function to check if Docker is installed
check_docker() {
    print_status "Checking if Docker is installed..."
    
    if command -v docker >/dev/null 2>&1; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker is already installed: $DOCKER_VERSION"
        
        # Check if Docker daemon is running
        if $SUDO_CMD systemctl is-active --quiet docker; then
            print_success "Docker daemon is running"
        else
            print_warning "Docker daemon is not running"
            return 1
        fi
        return 0
    else
        print_warning "Docker is not installed"
        return 1
    fi
}

# Function to install Docker on Ubuntu/Debian
install_docker_debian() {
    print_status "Installing Docker on $OS..."
    
    # Remove conflicting packages
    print_status "Removing conflicting packages..."
    for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do
        $SUDO_CMD apt-get remove -y $pkg 2>/dev/null || true
    done
    
    # Update package index
    $SUDO_CMD apt-get update
    
    # Install prerequisites
    print_status "Installing prerequisites..."
    $SUDO_CMD apt-get install -y ca-certificates curl gnupg
    
    # Add Docker's official GPG key
    print_status "Adding Docker's GPG key..."
    $SUDO_CMD install -m 0755 -d /etc/apt/keyrings
    if [ "$OS" = "Debian" ]; then
        $SUDO_CMD curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
    else
        $SUDO_CMD curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    fi
    $SUDO_CMD chmod a+r /etc/apt/keyrings/docker.asc
    
    # Add Docker repository
    print_status "Adding Docker repository..."
    if [ "$OS" = "Debian" ]; then
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
          $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
          $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    else
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
          $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
          $SUDO_CMD tee /etc/apt/sources.list.d/docker.list > /dev/null
    fi
    
    # Update package index again
    $SUDO_CMD apt-get update
    
    # Install Docker Engine
    print_status "Installing Docker Engine..."
    $SUDO_CMD apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker service
    print_status "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        print_status "Adding current user to docker group..."
        sudo usermod -aG docker $USER
    else
        print_warning "Running as root - skipping user group addition"
        print_status "Note: When running as root, Docker commands don't require sudo"
    fi
    
    print_success "Docker installation completed!"
}

# Function to install Docker on RHEL/CentOS/Fedora
install_docker_rhel() {
    print_status "Installing Docker on $OS..."
    
    # Remove conflicting packages
    print_status "Removing conflicting packages..."
    for pkg in docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine; do
        $SUDO_CMD yum remove -y $pkg 2>/dev/null || true
    done
    
    # Install prerequisites
    print_status "Installing prerequisites..."
    $SUDO_CMD yum install -y yum-utils
    
    # Add Docker repository
    print_status "Adding Docker repository..."
    $SUDO_CMD yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    
    # Install Docker Engine
    print_status "Installing Docker Engine..."
    $SUDO_CMD yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker service
    print_status "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        print_status "Adding current user to docker group..."
        sudo usermod -aG docker $USER
    else
        print_warning "Running as root - skipping user group addition"
        print_status "Note: When running as root, Docker commands don't require sudo"
    fi
    
    print_success "Docker installation completed!"
}

# Function to install Docker on Arch Linux
install_docker_arch() {
    print_status "Installing Docker on $OS..."
    
    # Update package database
    $SUDO_CMD pacman -Sy
    
    # Install Docker
    print_status "Installing Docker..."
    $SUDO_CMD pacman -S --noconfirm docker
    
    # Start and enable Docker service
    print_status "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        print_status "Adding current user to docker group..."
        sudo usermod -aG docker $USER
    else
        print_warning "Running as root - skipping user group addition"
        print_status "Note: When running as root, Docker commands don't require sudo"
    fi
    
    print_success "Docker installation completed!"
}

# Function to install Docker using convenience script (fallback)
install_docker_convenience_script() {
    print_status "Installing Docker using convenience script..."
    
    # Download and run the official Docker installation script
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO_CMD sh get-docker.sh
    
    # Start and enable Docker service
    print_status "Starting Docker service..."
    $SUDO_CMD systemctl start docker
    $SUDO_CMD systemctl enable docker
    
    # Add current user to docker group
    print_status "Adding current user to docker group..."
    sudo usermod -aG docker $USER
    
    # Clean up
    rm -f get-docker.sh
    
    print_success "Docker installation completed!"
}

# Function to verify Docker installation
verify_docker() {
    print_status "Verifying Docker installation..."
    
    # Wait a moment for Docker to start
    sleep 3
    
    # Test Docker with hello-world container
    if $SUDO_CMD docker run hello-world >/dev/null 2>&1; then
        print_success "Docker verification successful!"
        print_status "Docker is properly installed and working."
    else
        print_error "Docker verification failed!"
        return 1
    fi
}

# Main installation function
install_docker() {
    case "$OS" in
        "Ubuntu"|"Linux Mint"|"Pop!_OS")
            install_docker_debian
            ;;
        "Debian"*)
            install_docker_debian
            ;;
        "CentOS"*|"Red Hat"*|"Fedora"|"Rocky Linux"|"AlmaLinux")
            install_docker_rhel
            ;;
        "Arch Linux"|"Manjaro")
            install_docker_arch
            ;;
        *)
            print_warning "Unsupported distribution: $OS"
            print_status "Falling back to convenience script..."
            install_docker_convenience_script
            ;;
    esac
}

# Main script execution
main() {
    print_status "Docker Installation Script Starting..."
    echo "========================================"
    
    # Check if running as root and adjust behavior
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root user"
        print_status "Docker will be installed for root user only"
        SUDO_CMD=""
    else
        print_status "Running as regular user"
        SUDO_CMD="sudo"
    fi
    
    # Detect OS
    detect_os
    
    # Check Docker installation
    if check_docker; then
        print_success "Docker is already installed and running!"
        echo ""
        if [ "$EUID" -ne 0 ]; then
            print_status "Current Docker version: $(sudo docker --version)"
            print_status "Docker Compose version: $(sudo docker compose version)"
            echo ""
            print_status "To run Docker without sudo, either:"
            print_status "1. Log out and log back in (recommended)"
            print_status "2. Run: newgrp docker"
        else
            print_status "Current Docker version: $(docker --version)"
            print_status "Docker Compose version: $(docker compose version)"
            echo ""
            print_status "Running as root - Docker commands work without sudo"
        fi
        exit 0
    fi
    
    # Install Docker
    echo ""
    print_status "Proceeding with Docker installation..."
    install_docker
    
    # Verify installation
    echo ""
    verify_docker
    
    echo ""
    print_success "Installation completed successfully!"
    echo ""
    print_status "Next steps:"
    if [ "$EUID" -ne 0 ]; then
        print_status "1. Log out and log back in to use Docker without sudo"
        print_status "2. Or run: newgrp docker"
        print_status "3. Test with: docker run hello-world"
        echo ""
        print_status "Docker version: $(sudo docker --version)"
        print_status "Docker Compose version: $(sudo docker compose version)"
    else
        print_status "1. Test with: docker run hello-world"
        print_status "2. Docker commands work without sudo when running as root"
        echo ""
        print_status "Docker version: $(docker --version)"
        print_status "Docker Compose version: $(docker compose version)"
    fi
}

# Run main function
main "$@"