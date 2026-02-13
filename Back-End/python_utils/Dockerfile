# Dockerfile for python_utils
FROM python:3.11-slim

WORKDIR /app

# Copy project files
COPY . /app

# Install python deps if requirements.txt exists
RUN pip install --no-cache-dir -r requirements.txt

# Expose application port
EXPOSE 15001

# Create non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser -m appuser && chown -R appuser:appuser /app

USER appuser

ENV DATA_CACHE=/app/data_cache

CMD ["gunicorn", "-b", "0.0.0.0:15001", "main:app"]