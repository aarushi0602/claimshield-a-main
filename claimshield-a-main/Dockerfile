# Stage 1: build the React UI (frontend/) into /ui/web.
FROM node:22-slim AS ui
WORKDIR /ui/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: the API, serving the built UI from /app/web.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8080
WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY claimshield ./claimshield
COPY data ./data
COPY --from=ui /ui/web ./web

RUN useradd --create-home --uid 10001 app && mkdir -p /app/var && chown app /app/var
USER app

CMD ["sh", "-c", "uvicorn claimshield.api.main:app --host 0.0.0.0 --port ${PORT} --timeout-keep-alive 75"]
