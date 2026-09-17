# ==============================================================================
# BHARAT-DRISHTI // Production Backend Dockerfile
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system compilation and native library dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create isolated Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies into /opt/venv
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Runtime Stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only minimal runtime shared libraries (libpq for postgres, libgl for OpenCV/RapidOCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create non-root system user for security
RUN groupadd -r drishti && useradd -r -g drishti -d /app -s /sbin/nologin drishti

# Copy backend application code and required modules
COPY backend /app/backend
COPY benford /app/benford
COPY forensics /app/forensics
COPY llm /app/llm
COPY models /app/models
COPY pipelines /app/pipelines
COPY scraper /app/scraper
COPY data /app/data
COPY tests /app/tests

# Set directory permissions for non-root user
RUN chown -R drishti:drishti /app

USER drishti

EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT:-8000}/api/health || exit 1

# Production server start with Uvicorn supporting dynamic Render $PORT
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
