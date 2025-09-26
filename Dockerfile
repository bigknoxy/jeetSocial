# Multi-stage Dockerfile for jeetSocial
# Stage 1: Build dependencies
FROM python:3.10.12-slim AS builder
WORKDIR /app
# Install build deps and postgres client
RUN apt-get update && apt-get install -y build-essential postgresql-client curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements.txt
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Final image
FROM python:3.10.12-slim
WORKDIR /app
# Create non-root user
RUN useradd --create-home --shell /bin/bash jeetuser
# Install only runtime deps
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=jeetuser:jeetuser /root/.local /root/.local
RUN if [ -d /root/.local/bin ]; then chmod +x /root/.local/bin/*; fi
RUN chmod 755 /root
ENV PATH=/root/.local/bin:$PATH
# Copy application files with correct ownership at copy time
COPY --chown=jeetuser:jeetuser app app
COPY --chown=jeetuser:jeetuser migrations migrations
COPY --chown=jeetuser:jeetuser wait-for-it.sh wait-for-it.sh
COPY --chown=jeetuser:jeetuser wait-for-db-healthy.sh wait-for-db-healthy.sh
COPY --chown=jeetuser:jeetuser init_db.py init_db.py
# Do NOT copy tests into runtime image
# COPY tests tests
# Copy static assets if needed (already included in app/static)
# Minimal chown for runtime-writable dirs only (avoid expensive recursive chown)
RUN mkdir -p /app/instance /app/tmp && chown -R jeetuser:jeetuser /app/instance /app/tmp # Only chown writable dirs, not all of /app
RUN chmod +x wait-for-it.sh wait-for-db-healthy.sh
COPY --chown=jeetuser:jeetuser app/static static
ENV PYTHONPATH=/root/.local/lib/python3.10/site-packages:/app

EXPOSE 5000
USER jeetuser
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5000/ || exit 1
CMD ["/bin/sh", "-c", "flask db upgrade && flask run --host=0.0.0.0"]
