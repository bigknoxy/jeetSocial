#!/bin/bash
set -e

PYTHON_VERSION_FILE=".python-version"
REQUIRED_PYTHON_VERSION=""
if [ -f "$PYTHON_VERSION_FILE" ]; then
  REQUIRED_PYTHON_VERSION=$(cat "$PYTHON_VERSION_FILE")
fi

# Check for pyenv
if ! command -v pyenv &> /dev/null; then
  echo "pyenv is not installed."
  read -p "Would you like to install pyenv now? (y/n): " install_pyenv
  if [[ "$install_pyenv" =~ ^[Yy]$ ]]; then
    # Check for leftover .pyenv directory
    if [ -d "$HOME/.pyenv" ]; then
      echo "WARNING: The directory $HOME/.pyenv already exists."
      echo "This may be from a previous failed or partial pyenv installation."
      echo "The pyenv installer cannot proceed until this directory is removed."
      read -p "Would you like to remove $HOME/.pyenv and continue? (y/n): " remove_pyenv
      if [[ "$remove_pyenv" =~ ^[Yy]$ ]]; then
        rm -rf "$HOME/.pyenv"
        echo "$HOME/.pyenv has been removed. Proceeding with pyenv installation..."
      else
        echo "Please remove $HOME/.pyenv manually and re-run setup.sh."
        exit 1
      fi
    fi
    # Install system build dependencies for Python (Debian/Ubuntu)
    if [ -x "$(command -v apt-get)" ]; then
      echo "Installing system build dependencies for Python..."
      apt-get update
      apt-get install -y make build-essential libssl-dev zlib1g-dev \
        libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
        libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev \
        liblzma-dev git
    fi
    # Install pyenv (user must have curl and git)
    if ! command -v curl &> /dev/null; then
      echo "curl is required to install pyenv. Please install curl and re-run."
      exit 1
    fi
    if ! command -v git &> /dev/null; then
      echo "git is required to install pyenv. Please install git and re-run."
      exit 1
    fi
    curl https://pyenv.run | bash
  fi
fi

# Ensure pyenv is initialized for this shell session
if [ -d "$HOME/.pyenv" ]; then
  export PATH="$HOME/.pyenv/bin:$PATH"
  eval "$(pyenv init -)"
  eval "$(pyenv virtualenv-init -)"
fi

# Use pyenv to install and activate required Python version
if [ -n "$REQUIRED_PYTHON_VERSION" ]; then
  echo "Ensuring Python $REQUIRED_PYTHON_VERSION is installed via pyenv..."
  if ! pyenv install -s "$REQUIRED_PYTHON_VERSION"; then
    echo "ERROR: pyenv failed to install Python $REQUIRED_PYTHON_VERSION."
    echo "Troubleshooting tips:"
    echo "- Make sure all build dependencies are installed (see README.md)."
    echo "- If you see errors about missing libraries, run:"
    echo "    sudo apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev git"
    echo "- For macOS, install Xcode Command Line Tools: xcode-select --install"
    echo "- For WSL, ensure you have all build dependencies and restart your shell."
    exit 1
  fi
  pyenv local "$REQUIRED_PYTHON_VERSION"
  PYTHON_BIN="$(pyenv which python)"
else
  PYTHON_BIN="python3"
fi

# Create and activate virtualenv
if [ ! -d "venv" ]; then
  $PYTHON_BIN -m venv venv
fi
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install pre-commit and set up hooks
pip install pre-commit
if [ -f .pre-commit-config.yaml ]; then
  pre-commit install
fi

# Show versions for verification
echo "Python version: $(python --version)"
echo "Black version: $(black --version)"
