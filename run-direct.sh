#!/bin/bash
# jeetSocial Direct Python Runner (Docker Alternative)
# For development when Docker has permission issues

set -e

echo "🐍 jeetSocial Direct Python Runner"
echo "================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q flask flask-socketio python-socketio gevent gevent-websocket eventlet psycopg2-binary flask-sqlalchemy flask-limiter python-dotenv

# Set environment variables
echo "🔧 Setting up environment..."
export USE_SOCKETIO=true
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jeetsocial"
export SECRET_KEY="dev-secret-key"
export ENABLE_RATE_LIMITING="true"
export ENABLE_MODERATION="true"

# Check if database is available
echo "🗄️ Checking database connection..."
if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
    echo "⚠️  Database is not running. Start PostgreSQL first:"
    echo "   docker compose up -d db"
    echo "   Or run: sudo systemctl start postgresql"
    exit 1
fi

# Run database migrations if needed
echo "🗄️ Running database migrations..."
python init_db.py

# Start the application
echo "🚀 Starting jeetSocial on http://localhost:5678"
echo "🔌 WebSocket support enabled"
echo ""
echo "📝 Logs will appear below:"
echo "============================="

# Run the SocketIO version
python run_socketio.py