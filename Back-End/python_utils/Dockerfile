# ---------- Build stage ----------
FROM python:3.11-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/packages -r requirements.txt

RUN mkdir -p /app/data

# ---------- Runtime stage ----------
FROM gcr.io/distroless/python3-debian12:nonroot

WORKDIR /app

COPY --from=builder                    /app/packages /app/packages
COPY --from=builder --chown=65532:65532 /app/data     /app/data
COPY . /app

ENV PYTHONPATH=/app/packages
ENV DATA_CACHE=/app/data

EXPOSE 15001

CMD ["-m", "gunicorn", "-b", "0.0.0.0:15001", "--timeout", "300", "main:app"]