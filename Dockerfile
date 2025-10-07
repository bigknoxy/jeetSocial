# Multi-stage Dockerfile for jeetSocial
# Stage 1: Build dependencies
FROM python:3.10-alpine AS builder
WORKDIR /app
# Install build deps
RUN apk add --no-cache build-base postgresql-client curl
COPY requirements-runtime.txt .
COPY requirements-dev.txt .
# Install runtime deps into /install
RUN pip install --target /install -r requirements-runtime.txt
# Install dev deps for testing
RUN pip install --target /install -r requirements-dev.txt

# Stage 2: Final image
FROM python:3.10-alpine
# Install runtime deps
RUN apk add --no-cache postgresql-client
WORKDIR /app
# Copy runtime packages
COPY --from=builder /install /usr/local/lib/python3.10/site-packages
# Copy bin scripts
COPY --from=builder /install/bin /usr/local/bin
# Set PATH
ENV PATH=/usr/local/bin:$PATH
# Copy application files
COPY app app
COPY migrations migrations
COPY wait-for-it.sh wait-for-it.sh
COPY wait-for-db-healthy.sh wait-for-db-healthy.sh
COPY init_db.py init_db.py
COPY tests tests
# Include pre-generated reports (Trivy JSON) so tests can read them inside the container
COPY reports reports
COPY app/static static
COPY run.py run.py
# Make scripts executable
RUN chmod +x wait-for-it.sh wait-for-db-healthy.sh
# Create instance dir
RUN mkdir -p /app/instance

EXPOSE 5000
CMD ["python", "run.py"]