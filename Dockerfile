FROM python:3.6-slim
WORKDIR /app
COPY requirements.txt requirements.txt
# Install build-essential for scientific Python packages
RUN apt-get update && apt-get install -y build-essential gcc g++ make && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt
# Ensure python-dotenv is installed for .env support
COPY app app
COPY tests tests
COPY .env.example .env
ENV PYTHONPATH=/app
EXPOSE 5000
CMD ["flask", "run", "--host=0.0.0.0"]
