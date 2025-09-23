FROM python:3.10-slim

WORKDIR /app

# Install system deps required at runtime (postgres client for DB migrations)
RUN apt-get update && apt-get install -y postgresql-client curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Ensure python-dotenv is available for .env support
COPY app app
COPY migrations migrations
COPY wait-for-it.sh wait-for-it.sh
COPY tests tests
COPY init_db.py init_db.py

# .env is injected by docker-compose, not built into the image
ENV PYTHONPATH=/app
EXPOSE 5000

CMD ["/bin/sh", "-c", "flask db upgrade && flask run --host=0.0.0.0"]
