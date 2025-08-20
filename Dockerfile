# Dockerfile for jeetSocial
# Builds the Flask app and runs migrations before starting the server.
# See README.md for usage and troubleshooting.

FROM python:3.10-slim
WORKDIR /app
# Install Postgres client for pg_isready
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
# Ensure python-dotenv is installed for .env support
COPY app app
COPY migrations migrations
COPY wait-for-it.sh wait-for-it.sh
COPY wait-for-db-healthy.sh wait-for-db-healthy.sh
COPY tests tests
COPY init_db.py init_db.py
COPY app/static static
# COPY .env.example .env
# .env is injected by docker-compose, not built into the image
ENV PYTHONPATH=/app
EXPOSE 5000
CMD ["/bin/sh", "-c", "flask db upgrade && flask run --host=0.0.0.0"]
