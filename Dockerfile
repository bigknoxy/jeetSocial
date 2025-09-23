# Multi-stage Dockerfile for jeetSocial
# Stage 1: Build dependencies
FROM python:3.10.12-slim AS builder
WORKDIR /app
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
RUN chmod +x /root/.local/bin/*
RUN chmod 755 /root
ENV PATH=/root/.local/bin:$PATH
COPY app app
COPY migrations migrations
COPY wait-for-it.sh wait-for-it.sh
COPY wait-for-db-healthy.sh wait-for-db-healthy.sh
COPY tests tests
COPY init_db.py init_db.py
# Set executable permissions before switching to non-root user
RUN chmod +x wait-for-it.sh wait-for-db-healthy.sh
# Fix ownership for /app
RUN chown -R jeetuser:jeetuser /app
ENV PYTHONPATH=/root/.local/lib/python3.10/site-packages:/app
EXPOSE 5000
USER jeetuser
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://localhost:5000/ || exit 1
CMD ["/bin/sh", "-c", "flask db upgrade && flask run --host=0.0.0.0"]
