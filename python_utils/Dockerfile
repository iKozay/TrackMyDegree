# Dockerfile for python_utils
FROM python:3.11-slim

WORKDIR /app

# Copy project files
COPY . /app

# Install python deps if requirements.txt exists
RUN pip install --no-cache-dir -r requirements.txt

# Expose application port
EXPOSE 5000

CMD ["python", "/app/main.py"]