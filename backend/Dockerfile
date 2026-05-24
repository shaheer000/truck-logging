# syntax=docker/dockerfile:1.6
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings

WORKDIR /app

# System deps: build tools only needed to compile psycopg2 wheels (binary
# wheels are usually fine, but keep libpq-dev for safety on slim images).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Drop privileges.
RUN groupadd -r app && useradd -r -g app app \
    && mkdir -p /app/staticfiles \
    && chown -R app:app /app
USER app

EXPOSE 8000

# Entrypoint runs migrations + collectstatic before starting gunicorn.
COPY --chown=app:app entrypoint.sh /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
