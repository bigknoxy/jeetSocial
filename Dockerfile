# Multi-stage Dockerfile for jeetSocial
# Stage 1: Build dependencies
FROM python:3.10.12-slim AS builder
WORKDIR /app
# Upgrade pip and setuptools to avoid known setuptools issues
RUN python -m pip install --upgrade pip setuptools
# Install build deps and postgres client (used only in builder)
RUN apt-get update && apt-get install -y build-essential postgresql-client curl && rm -rf /var/lib/apt/lists/*
COPY requirements-runtime.txt requirements-runtime.txt
COPY requirements-dev.txt requirements-dev.txt
# Install runtime deps into builder's site-packages
RUN pip install --no-cache-dir -r requirements-runtime.txt
# Install dev deps for running tests inside builder (not copied to final image)
RUN pip install --no-cache-dir -r requirements-dev.txt

# Stage 2: Final image
FROM python:3.10.12-slim
WORKDIR /app
# Create non-root user
RUN useradd --create-home --shell /bin/bash jeetuser
# Install only runtime OS packages
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client curl && rm -rf /var/lib/apt/lists/*
# Copy runtime site-packages from builder (contains only runtime Python deps)
COPY --from=builder --chown=jeetuser:jeetuser /usr/local /usr/local
RUN if [ -d /usr/local/bin ]; then chmod +x /usr/local/bin/*; fi
RUN chmod 755 /root
ENV PATH=/usr/local/bin:$PATH
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
ENV PYTHONPATH=/usr/local/lib/python3.10/site-packages:/app

EXPOSE 5000
USER jeetuser
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5000/ || exit 1
CMD ["/bin/sh", "-c", "flask db upgrade && flask run --host=0.0.0.0"]
