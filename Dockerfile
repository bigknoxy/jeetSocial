# Multi-stage Dockerfile for jeetSocial
# Stage 1: Build dependencies
FROM python:3.10-alpine AS builder
WORKDIR /app
# Install build deps
RUN apk add --no-cache build-base postgresql-client postgresql-dev curl
COPY requirements-runtime.txt .
COPY requirements-dev.txt .
# Install runtime deps into /install
RUN pip install --target /install -r requirements-runtime.txt
# Install dev deps for testing
RUN pip install --target /install -r requirements-dev.txt

# Stage 2: Final image
FROM python:3.10-alpine
# Install runtime deps
RUN apk add --no-cache postgresql-client postgresql-dev gcc musl-dev
WORKDIR /app
# Copy runtime packages from builder stage
COPY --from=builder /install /usr/local/lib/python3.10/site-packages
# Copy bin scripts from builder stage
COPY --from=builder /install/bin /usr/local/bin
# Set PATH
ENV PATH=/usr/local/bin:$PATH
# Ensure WebSocket dependencies are available (install directly in final stage)
RUN pip install flask-socketio==5.3.6 python-socketio==5.10.0 gevent==25.9.1 gevent-websocket==0.10.1 eventlet==0.33.3 --no-cache-dir
# Copy application files
COPY app app
COPY migrations migrations
COPY wait-for-it.sh wait-for-it.sh
COPY wait-for-db-healthy.sh wait-for-db-healthy.sh
COPY init_db.py init_db.py
COPY run_migrations.py run_migrations.py
COPY tests tests
# Include pre-generated reports (Trivy JSON) so tests can read them inside the container
COPY reports reports
COPY app/static static
COPY run.py run.py
COPY run_socketio.py run_socketio.py
# Make scripts executable
RUN chmod +x wait-for-it.sh wait-for-db-healthy.sh
# Create instance dir
RUN mkdir -p /app/instance

EXPOSE 5678
CMD ["python", "run.py"]