# jeetSocial

[![CI](https://github.com/bigknoxy/jeetSocial/actions/workflows/ci.yml/badge.svg)](https://github.com/bigknoxy/jeetSocial/actions/workflows/ci.yml)
[![Codecov](https://codecov.io/gh/bigknoxy/jeetSocial/branch/main/graph/badge.svg)](https://codecov.io/gh/bigknoxy/jeetSocial)
[![License](https://img.shields.io/github/license/bigknoxy/jeetSocial)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.10-blue.svg)](https://www.python.org/downloads/release/python-3100/)
[![Last Commit](https://img.shields.io/github/last-commit/bigknoxy/jeetSocial)](https://github.com/bigknoxy/jeetSocial/commits/main)
[![Issues](https://img.shields.io/github/issues/bigknoxy/jeetSocial)](https://github.com/bigknoxy/jeetSocial)

> 🌟 **A minimal, anonymous social platform designed to spread kindness and positivity through real-time interactions**

![jeetSocial Homepage](e2e/homepage.png)

## Project Purpose & Kindness Mission

jeetSocial is a minimal, anonymous social platform designed to encourage kindness and privacy. All posts are anonymous and assigned random usernames. No personal data is collected, and all posts are filtered for hate speech using an extensive word/phrase list. The platform exists to spread and encourage kindness through anonymous sharing and support.

### 🎯 Core Features

**Real-Time Social Interaction:**
- **Live Feed**: Posts appear instantly via WebSocket connections
- **Kindness Points**: Award kindness to posts with a single click (token-based to prevent abuse)
- **Dual View Modes**: 
  - **Latest**: Chronological feed (most recent first)
  - **Top**: Ranked by kindness points (last 24 hours, tie-broken by creation time)

**Privacy & Safety:**
- **Complete Anonymity**: Random usernames, no personal data collection
- **Content Moderation**: Comprehensive hate speech filtering
- **Rate Limiting**: Prevents spam and abuse
- **Character Limits**: 280 characters per post (enforced frontend & backend)

**Modern Architecture:**
- **TypeScript Frontend**: Modular, type-safe client-side code
- **WebSocket Real-Time**: Socket.IO for instant updates
- **Responsive Design**: Mobile-first, accessible UI
- **Docker Ready**: Production-ready containerization

![Top Posts View](e2e/homepage.png)

## ✨ Features

### 🚀 Core Functionality
- **Anonymous Posting**: Random usernames, no registration required
- **Real-Time Updates**: WebSocket-powered live feed with instant post delivery
- **Kindness Points System**: Token-based voting system to prevent double-voting
- **Smart Ranking**: Top posts ranked by kindness points (24-hour window)
- **Content Moderation**: Advanced hate speech filtering with comprehensive word lists
- **Character Limits**: 280 characters enforced at both frontend and backend levels
- **Rate Limiting**: Configurable rate limits to prevent spam

### 🎨 User Experience
- **Live Character Counter**: Real-time feedback as you type
- **Mobile-First Design**: Fully responsive, touch-optimized interface
- **Accessibility**: WCAG-compliant design with keyboard navigation
- **Error Handling**: Clear, friendly error messages for all edge cases
- **Progressive Enhancement**: Works without JavaScript, enhanced with it

### 🔧 Technical Features
- **TypeScript Frontend**: Type-safe, modular client architecture
- **WebSocket Real-Time**: Socket.IO for instant cross-device synchronization
- **Docker Support**: Production-ready containerization with health checks
- **Database Migrations**: Automated schema management with Alembic
- **Feature Flags**: Configurable feature toggles for experimental features
- **Comprehensive Testing**: Unit, integration, contract, and E2E test coverage

### 🛡️ Privacy & Security
- **Zero Data Collection**: No personal information, no tracking, no analytics
- **Content Filtering**: Proactive hate speech and toxicity detection
- **Token-Based Voting**: Cryptographic tokens prevent kindness point abuse
- **Secure Headers**: Security-focused HTTP headers and CSP policies

![About Page](e2e/about.png)

## Post Form UI/UX & Accessibility

The jeetSocial post form is designed for mobile-first, accessible, and uplifting interactions:

- **Post Button:**  
  - Prominently placed below the textarea, right-aligned on desktop, full-width on mobile.
  - Large tap area (≥44x44px), bold accent color, high contrast text, subtle shadow and rounded corners.
  - Disabled if input is empty or exceeds 280 characters, with clear feedback.

- **Textarea:**  
  - 120px tall (approx. 4 lines), full-width, 18px horizontal padding, rounded corners, clear focus state.
  - Accessible placeholder: “Share something kind…”, font size ≥16px, high color contrast.

- **Character Counter:**  
  - Positioned bottom-right inside the textarea container.
  - Font: 13px, muted color until near limit, then highlights orange, turns red if limit exceeded.
  - Live updates as you type, with error state if limit exceeded.

- **Spacing & Alignment:**  
  - 18px vertical spacing between elements, 18px horizontal padding.
  - Left-aligned text/labels; button right-aligned or full-width on mobile.

- **Touch Target & Usability:**  
  - All interactive elements ≥44x44px.
  - No overlapping elements.
  - Friendly, uplifting error messages and microcopy.

- **Mobile Usability:**  
  - Form remains visible when keyboard is open.
  - Subtle transitions for button and error states.
  - Fully responsive for all screen sizes.

## Quickstart / Onboarding

### Requirements
- Python 3.10.12
- Docker & Docker Compose (recommended)
- **Linux users:** You may need to run the following command before running `setup.sh` to install required build dependencies for Python:
  ```bash
  sudo apt-get install -y make build-essential libssl-dev zlib1g-dev \
    libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
    libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev \
    liblzma-dev git
  ```

### Setup (Local Development)
You can set up your environment automatically with the provided script, or manually as before.

#### Option 1: Automated Setup (Recommended)
**Preferred for all new contributors.**

1. **Clone the repo:**
   ```bash
   git clone https://github.com/your-org/jeetSocial.git
   cd jeetSocial
   ```
2. **Run the setup script:**
   ```bash
   bash setup.sh
   ```
   - The script will check for [pyenv](https://github.com/pyenv/pyenv), prompt to install if missing, and set up the correct Python version (3.10.12).
   - It will create and activate a virtual environment, install all dependencies, and set up pre-commit hooks.
   - Your environment will match CI and Docker for maximum consistency.

**Troubleshooting pyenv/Python installation:**
- If you see errors about missing libraries or build failures:
  - **Linux (Debian/Ubuntu):** Run:
    ```bash
    sudo apt-get update
    sudo apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev git
    ```
  - **macOS:** Install Xcode Command Line Tools:
    ```bash
    xcode-select --install
    ```
  - **WSL:** Ensure all Linux build dependencies are installed and restart your shell.
- If pyenv is not found after install, restart your shell or run:
  ```bash
  export PATH="$HOME/.pyenv/bin:$PATH"
  eval "$(pyenv init -)"
  eval "$(pyenv virtualenv-init -)"
  ```
- For more help, see [pyenv wiki](https://github.com/pyenv/pyenv/wiki/Common-build-problems).

#### Option 2: Manual Setup
1. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements-runtime.txt
   ```
3. **Copy and edit .env.example:**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```
4. **Run the app:**
   ```bash
   python -m app
   ```

#### Option 3: Run in Docker (Recommended for containers)
```bash
   docker compose up --build
```
- The web container waits for the Postgres database to be ready, runs migrations, and starts Flask.

### Setup (Docker Compose)
```bash
docker compose up --build
```
- The web container waits for the Postgres database to be ready, runs migrations, and starts Flask.

## 🏗️ Architecture

### Project Structure
```
jeetSocial/
├── app/                          # Main Flask application
│   ├── __init__.py              # Flask app factory and configuration
│   ├── models.py                # SQLAlchemy data models
│   ├── routes.py                # HTTP API endpoints
│   ├── utils.py                 # Business logic and utilities
│   ├── websocket.py             # WebSocket event handlers
│   ├── post_service.py          # Post business logic service
│   └── static/                  # Frontend assets
│       ├── index.html           # Main application page
│       ├── about.html           # Mission and guidelines
│       ├── main.js             # Legacy JavaScript (being migrated)
│       ├── dist/               # Compiled TypeScript modules
│       └── src/                # TypeScript source code
│           ├── components/      # UI components
│           ├── services/        # API and WebSocket services
│           └── utils/           # Client utilities
├── migrations/                  # Database schema migrations
│   ├── versions/               # Migration files
│   └── alembic.ini            # Migration configuration
├── tests/                      # Test suite
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── contract/               # API contract tests
│   └── e2e/                    # End-to-end tests
├── specs/                      # Feature specifications
├── docs/                       # Documentation and screenshots
├── scripts/                    # Utility scripts
├── .specify/                   # Project governance and templates
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Development environment
├── package.json               # Frontend dependencies
├── requirements.txt           # Python dependencies
└── README.md                  # This file
```

### Technology Stack

**Backend:**
- **Flask**: Lightweight Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database (production)
- **Flask-SocketIO**: WebSocket support for real-time features
- **Alembic**: Database migration management
- **Flask-Limiter**: Rate limiting functionality

**Frontend:**
- **TypeScript**: Type-safe JavaScript development
- **Socket.IO Client**: Real-time WebSocket communication
- **Modular Architecture**: Component-based UI organization
- **Progressive Enhancement**: Works without JavaScript

**Infrastructure:**
- **Docker**: Containerization for deployment
- **Docker Compose**: Multi-container development environment
- **GitHub Actions**: CI/CD pipeline
- **Playwright**: End-to-end testing framework

### Data Models

**Post Model:**
```python
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), nullable=False)  # Random anonymous username
    message = db.Column(db.Text, nullable=False)         # Post content (≤280 chars)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    kindness_points = db.Column(db.Integer, default=0)    # Kindness points received
```

**KindnessVote Model:**
```python
class KindnessVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("post.id"))
    token_hash = db.Column(db.String(64), unique=True)   # Prevents double-voting
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

## 📡 API Documentation

### Core Endpoints

#### Posts API
- `GET /api/posts`: Fetch posts with pagination and filtering
  - **Parameters**: `page`, `limit`, `view` (`latest`|`top`), `since`
  - **Response**: Paginated post list with metadata
- `POST /api/posts`: Create a new post
  - **Body**: `{ "message": "Your kind message here" }`
  - **Validation**: 280 character limit, hate speech filtering
  - **Response**: Created post with assigned username

#### Kindness Points API
- `POST /api/kindness/token`: Issue a kindness token for voting
  - **Parameters**: `post_id` (query or form)
  - **Response**: `{ "token": "cryptographic_token", "expires_at": "timestamp" }`
- `POST /api/kindness/redeem`: Redeem kindness token for a post
  - **Body**: `{ "post_id": 123, "token": "token_string" }`
  - **Response**: Updated kindness points count

#### Pages
- `GET /feed`: Main application feed (default route)
- `GET /about`: Kindness mission and community guidelines
- `GET /static/*`: Static assets (HTML, CSS, JS, images)

### WebSocket Events

#### Client → Server
- `connect`: Initial connection
- `join_feed`: Subscribe to all new posts
- `leave_feed`: Unsubscribe from feed updates
- `join_post`: Subscribe to specific post kindness updates
- `leave_post`: Unsubscribe from post updates
- `ping`: Connection health check

#### Server → Client
- `welcome`: Connection confirmation with client ID
- `new_post`: Real-time post broadcast
- `kindness_update`: Kindness point changes
- `post_deleted`: Post removal notifications
- `room_joined/room_left`: Room subscription confirmations

### API Examples

#### Fetch Posts
```bash
# Latest posts (default)
curl -X GET 'http://localhost:5678/api/posts?page=1&limit=20'

# Top posts (last 24 hours)
curl -X GET 'http://localhost:5678/api/posts?view=top&limit=20'

# Posts since specific timestamp
curl -X GET 'http://localhost:5678/api/posts?since=2025-01-01T00:00:00Z'
```

**Response:**
```json
{
  "posts": [
    {
      "id": 1,
      "username": "WobblyBigfoot45",
      "timestamp": "2025-01-20T12:34:56Z",
      "message": "You are amazing just the way you are! 🌟",
      "kindness_points": 5
    },
    {
      "id": 2,
      "username": "BubblySasquatch92", 
      "timestamp": "2025-01-20T12:30:00Z",
      "message": "Remember that every small act of kindness creates ripples! 💙",
      "kindness_points": 3
    }
  ],
  "page": 1,
  "total_count": 42,
  "has_next": true,
  "has_prev": false
}
```

#### Create Post
```bash
curl -X POST 'http://localhost:5678/api/posts' \
  -H 'Content-Type: application/json' \
  -d '{"message": "Be kind and spread positivity!"}'
```

**Response:**
```json
{
  "id": 43,
  "username": "JumpyCthulhu42",
  "timestamp": "2025-01-20T12:35:00Z",
  "message": "Be kind and spread positivity!",
  "kindness_points": 0
}
```

#### Award Kindness Points
```bash
# Step 1: Get token
curl -X POST 'http://localhost:5678/api/kindness/token?post_id=43'

# Step 2: Redeem token
curl -X POST 'http://localhost:5678/api/kindness/redeem' \
  -H 'Content-Type: application/json' \
  -d '{"post_id": 43, "token": "your_token_here"}'
```

**Response:**
```json
{
  "success": true,
  "kindness_points": 1,
  "message": "Kindness awarded successfully!"
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FLASK_APP` | Flask application module | `app` | No |
| `FLASK_ENV` | Flask environment | `development` | No |
| `DATABASE_URL` | PostgreSQL connection URI | `postgres://postgres:postgres@localhost:5433/jeet_test` | Yes |
| `SECRET_KEY` | Flask secret key for sessions | `test-secret-key` | Yes |
| `ENABLE_RATE_LIMITING` | Enable rate limiting (1=on, 0=off) | `1` | No |
| `ENABLE_MODERATION` | Enable hate speech filter (1=on, 0=off) | `1` | No |
| `ENABLE_KINDNESS_POINTS` | Enable kindness points system (1=on, 0=off) | `1` | No |
| `PORT` | Application port | `5678` | No |

### Feature Flags

The application supports several feature flags for experimental or optional functionality:

```bash
# Enable/disable core features
ENABLE_RATE_LIMITING=1     # Rate limiting for post creation
ENABLE_MODERATION=1        # Hate speech filtering
ENABLE_KINDNESS_POINTS=1   # Kindness points voting system

# Development settings
FLASK_ENV=development      # Development vs production mode
DEBUG=1                   # Flask debug mode
```

### Database Configuration

**PostgreSQL (Recommended):**
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/jeetsocial
```

**SQLite (Development Only):**
```bash
DATABASE_URL=sqlite:///jeetsocial.db
```

### Security Notes

- **Never commit `.env` files** to version control
- Use strong, unique `SECRET_KEY` values in production
- Ensure database credentials are properly secured
- Configure proper CORS headers for production domains

## 🛠️ Development

### Quick Start

**Option 1: Automated Setup (Recommended)**
```bash
git clone https://github.com/bigknoxy/jeetSocial.git
cd jeetSocial
bash setup.sh  # Handles Python, virtualenv, dependencies, and pre-commit hooks
```

**Option 2: Docker Development**
```bash
docker compose up --build  # Starts app, database, and runs migrations
```

**Option 3: Manual Setup**
```bash
# Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .

# Frontend dependencies
npm install

# Database setup
cp .env.example .env  # Edit as needed
flask db upgrade      # Run migrations

# Start development server
python -m app
```

### Development Commands

#### Backend Development
```bash
# Run development server
python -m app

# Run with SocketIO support
python run_socketio.py

# Database operations
flask db migrate -m "description"  # Create migration
flask db upgrade                   # Apply migrations
flask db downgrade                 # Rollback migration

# Linting and formatting
flake8 .                          # Python linting
black .                           # Code formatting
safety check                      # Security vulnerability check
```

#### Frontend Development
```bash
# TypeScript compilation
npm run build:ts                  # Compile TypeScript
npm run build:ts:watch           # Watch mode compilation

# Testing
npm test                          # Run Jest tests
npm run test:coverage            # Run with coverage report
npm run e2e                       # Run Playwright E2E tests

# Linting
npx eslint .                     # JavaScript/TypeScript linting
```

#### Testing
```bash
# Python tests (unit, integration, contract)
pytest                           # All tests
pytest tests/unit/               # Unit tests only
pytest tests/integration/        # Integration tests only
pytest tests/contract/           # Contract tests only
pytest -v -k "test_create_post" # Specific test

# Docker-based testing (mirrors CI)
docker compose run web pytest
docker compose run web pytest tests/test_posts.py::test_create_post

# Frontend testing
npm test                         # Jest unit tests
npm run e2e                      # Playwright E2E tests

# Coverage reports
pytest --cov=app --cov-report=html
npm run test:coverage
```

### Database Management

```bash
# Create new migration
flask db migrate -m "Add kindness points feature"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade

# View migration history
flask db history

# Reset database (development only)
flask db downgrade base
flask db upgrade
```

### Debugging Tools

```bash
# Debug mode development
FLASK_ENV=development python -m app

# WebSocket debugging
python debug_websocket.py

# Database inspection
python -c "from app import db; print(db.engine.table_names())"

# Test data cleanup
python cleanup_long_posts.py --dry-run  # Preview changes
python cleanup_long_posts.py --delete   # Apply changes
```

## 🚀 Deployment

### Docker Deployment (Production)

```bash
# Production deployment
docker compose -f docker-compose.yml up --build -d

# View logs
docker compose logs -f web
docker compose logs -f db

# Scale application
docker compose up --scale web=3

# Health checks
docker compose ps
curl http://localhost:5678/api/posts
```

### Environment Configuration

**Production Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@db:5432/jeetsocial

# Security
SECRET_KEY=your-very-secure-secret-key-here
FLASK_ENV=production

# Features
ENABLE_RATE_LIMITING=1
ENABLE_MODERATION=1
ENABLE_KINDNESS_POINTS=1

# Performance
PORT=5678
```

### CI/CD Pipeline

**GitHub Actions Workflow:**
- **Linting**: Python (flake8, black, safety) and TypeScript (eslint)
- **Testing**: 
  - Python: pytest with coverage reporting
  - Frontend: Jest unit tests and Playwright E2E tests
  - Database: Migration testing and contract validation
- **Security**: Trivy vulnerability scanning and dependency checks
- **Build**: Docker image building and multi-platform support
- **Deployment**: Manual approval with artifact preservation

**Local CI Testing:**
```bash
# Install act (GitHub Actions runner)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Test workflows locally
act                                    # Full workflow
act -W .github/workflows/ci.yml        # Specific workflow
act -s SECRET_KEY=test -s DATABASE_URL=sqlite:///test.db  # With secrets
```

### Monitoring & Observability

**Application Logs:**
```bash
# Docker logs
docker compose logs -f web

# Application-specific logs
docker compose exec web tail -f /var/log/app.log
```

**Health Checks:**
```bash
# Application health
curl http://localhost:5678/api/posts

# Database connectivity
docker compose exec web python -c "from app import db; print(db.engine.execute('SELECT 1').scalar())"
```

**Performance Monitoring:**
- WebSocket connection tracking
- Database query performance
- Rate limiting metrics
- Error rate monitoring

## 🤝 Contributing

We welcome contributions that align with our kindness mission! Please follow these guidelines:

### Development Workflow

1. **Branch Strategy**
   ```bash
   git checkout -b feature/your-feature-name
   git checkout -b hotfix/urgent-fix
   ```

2. **Development Requirements**
   - **TDD Mandatory**: Write failing tests before implementation
   - **Constitution Compliance**: Follow `.specify/memory/constitution.md`
   - **Code Quality**: All linting must pass (`flake8 .`, `eslint .`)
   - **Test Coverage**: Maintain high test coverage for new features

3. **Pre-Commit Checklist**
   ```bash
   # Run full test suite
   pytest
   npm test
   npm run e2e
   
   # Linting
   flake8 .
   black .
   npx eslint .
   
   # Security checks
   safety check
   ```

4. **Pull Request Process**
   - Include comprehensive description of changes
   - Link to relevant issues
   - Ensure all CI checks pass
   - Request review from maintainers
   - Update documentation as needed

### Contribution Areas

**🐛 Bug Fixes**
- Reproduce with failing test
- Fix with minimal changes
- Update documentation if needed

**✨ Features**
- Follow feature specification in `/specs/`
- Implement with TDD approach
- Include E2E tests for user workflows
- Update API documentation

**📚 Documentation**
- Improve README and guides
- Add code comments where unclear
- Update API documentation
- Create tutorials and examples

**🧪 Testing**
- Improve test coverage
- Add integration tests
- Enhance E2E test scenarios
- Performance testing

### Code Standards

- **Python**: Follow PEP 8, use type hints where appropriate
- **TypeScript**: Strict mode enabled, prefer explicit types
- **Git**: Conventional commit messages
- **Documentation**: Clear, concise, and up-to-date

### Getting Help

- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **AGENTS.md**: Detailed project guidelines and coding standards
- **Constitution**: Mandatory governance rules in `.specify/memory/constitution.md`

### Recognition

Contributors who embody the kindness mission and provide valuable contributions will be recognized in our community. We appreciate everyone who helps make jeetSocial a kinder place!

## 📋 Constitution & Development Standards

### Mandatory Governance

This project follows the **jeetSocial Constitution** (Version 2.1.2) - a mandatory framework that enforces:

- **Kindness & Privacy First**: All design decisions prioritize user safety and anonymity
- **Test-Driven Development (TDD)**: Non-negotiable Red-Green-Refactor cycle
- **Minimal Surface**: YAGNI and KISS principles applied rigorously
- **Integration Testing**: Contract tests for all public APIs
- **Observability**: Structured logging and version discipline

### TDD Requirements (Mandatory)

**Every feature MUST follow this exact sequence:**

1. **Red Phase**: Write failing tests that express the requirement
2. **Green Phase**: Implement minimal code to make tests pass
3. **Refactor Phase**: Improve code while keeping tests green

```bash
# Example TDD workflow
# 1. Write failing test
pytest tests/test_new_feature.py -v  # Should fail

# 2. Implement minimal code
# Edit app/routes.py or relevant module

# 3. Verify tests pass
pytest tests/test_new_feature.py -v  # Should pass

# 4. Refactor if needed
# Improve code while maintaining green tests
```

### Pre-Commit Requirements

**Before ANY commit or PR:**
```bash
# 1. Linting (must pass)
flake8 .
black .
npx eslint .

# 2. Testing (must pass)
pytest                          # Python tests
npm test                        # Frontend tests
npm run e2e                     # E2E tests

# 3. Security checks
safety check                    # Python vulnerabilities
npm audit                       # Node.js vulnerabilities
```

### Constitution Compliance Check

**Every plan MUST include:**
- Constitution Check section
- TDD test creation before implementation
- Privacy and kindness impact assessment
- Surface area analysis (YAGNI compliance)

**Failure Modes:**
- Missing constitution check → Abort implementation
- Skipping TDD → Block PR merge
- Privacy violations → Immediate rejection
- Unnecessary complexity → Require justification

### Quick Verification Commands

```bash
# Full compliance check
flake8 . && pytest && npm test && npm run e2e

# Docker-based (mirrors CI exactly)
docker compose run web pytest

# Individual components
pytest tests/unit/              # Unit tests only
pytest tests/integration/       # Integration tests only
pytest tests/contract/          # Contract tests only
```

**🚨 CRITICAL**: CI will automatically reject any PR that violates the Constitution or fails TDD requirements. No exceptions.


## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## 🔧 Troubleshooting

### Common Issues

**Database Connection Problems:**
```bash
# Check database connectivity
docker compose exec db pg_isready -U postgres

# View database logs
docker compose logs db

# Reset database (development only)
docker compose down -v
docker compose up --build
```

**Migration Issues:**
```bash
# Check migration status
flask db current
flask db history

# Force migration (careful in production)
flask db upgrade head

# Create new migration if needed
flask db migrate -m "Fix migration issue"
```

**Application Startup Problems:**
```bash
# Check application logs
docker compose logs web

# Verify environment variables
docker compose exec web env | grep -E "(DATABASE_URL|SECRET_KEY)"

# Test database connection from app container
docker compose exec web python -c "from app import db; print('DB OK' if db.engine.execute('SELECT 1').scalar() else 'DB FAIL')"
```

**WebSocket Connection Issues:**
```bash
# Check WebSocket connectivity
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: test" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:5678/socket.io/

# View WebSocket logs
docker compose logs web | grep -i websocket
```

**Frontend Issues:**
```bash
# Clear browser cache and localStorage
# Open browser dev tools and run:
localStorage.clear()
sessionStorage.clear()
location.reload()

# Check TypeScript compilation
npm run build:ts

# Verify static files are served
curl http://localhost:5678/static/main.js
```

### Performance Issues

**Slow Database Queries:**
```bash
# Enable query logging (development)
SQLALCHEMY_ECHO=1 python -m app

# Check database connections
docker compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

**High Memory Usage:**
```bash
# Monitor container resources
docker stats

# Check for memory leaks
docker compose exec web python -c "import psutil; print(psutil.virtual_memory())"
```

### Development Environment Issues

**Python Environment:**
```bash
# Verify Python version
python --version  # Should be 3.10.x

# Check virtual environment
which python
pip list | grep flask

# Rebuild environment if needed
rm -rf .venv
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Node.js Environment:**
```bash
# Verify Node.js version
node --version  # Should be recent LTS
npm --version

# Clean install if needed
rm -rf node_modules package-lock.json
npm install
```

## 🌟 Kindness Mission & Community

### Our Values

- **Kindness First**: Every feature, decision, and interaction prioritizes kindness
- **Privacy by Design**: Zero personal data collection, complete anonymity
- **Inclusive Community**: Welcoming to all, regardless of background or identity
- **Positive Impact**: Focused on mental health support and encouragement

### Community Guidelines

1. **Be Kind**: All interactions should be supportive and uplifting
2. **Respect Privacy**: Never share personal information or attempt to identify users
3. **Report Issues**: Help us maintain a safe environment by reporting concerns
4. **Contribute Positively**: Share ideas that enhance our kindness mission

### Resources

- **Mental Health Support**: Links to professional resources on About page
- **Community Feedback**: GitHub Issues for suggestions and improvements
- **Safety Resources**: Comprehensive moderation and filtering systems

### Mobile Accessibility

All components are fully responsive and optimized for mobile devices:
- Touch-friendly buttons (≥44x44px)
- Readable typography at all screen sizes
- Accessible navigation and form interactions
- Progressive enhancement for varying network conditions

---

## 📚 Additional Resources

- **[AGENTS.md](./AGENTS.md)**: Detailed development guidelines and coding standards
- **[Constitution](.specify/memory/constitution.md)**: Project governance and mandatory requirements
- **[Feature Specifications](./specs/)**: Detailed feature documentation and contracts
- **[API Documentation](#-api-documentation)**: Complete API reference with examples
- **[Docker Guide](#-deployment)**: Production deployment instructions

**💬 Need Help?** 
- Open an issue on GitHub
- Start a discussion in our community
- Check the troubleshooting section above

**🚀 Ready to contribute?** See the [Contributing](#-contributing) section to get started!
