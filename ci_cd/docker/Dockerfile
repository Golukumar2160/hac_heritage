# ==============================================================================
# BHARAT-DRISHTI // Unified All-In-One Production Dockerfile
# ==============================================================================
# Stage 1: Build Frontend Assets
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend & Runtime
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install minimal runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create system user
RUN groupadd -r drishti && useradd -r -g drishti -d /app -s /sbin/nologin drishti

# Copy backend application source
COPY backend /app/backend
COPY benford /app/benford
COPY forensics /app/forensics
COPY llm /app/llm
COPY models /app/models
COPY pipelines /app/pipelines
COPY scraper /app/scraper
COPY data /app/data
COPY tests /app/tests

# Copy built frontend assets to static serving location
COPY --from=frontend-builder /frontend/dist /app/frontend/dist

RUN chown -R drishti:drishti /app

USER drishti

ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
