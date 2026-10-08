FROM python:3.12-slim AS builder
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:$PATH"
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY . /app/
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser
EXPOSE 8000
# Generation can take 10-30s (Gemini + YouTube), so the worker timeout is raised from gunicorn's 30s default.
CMD ["sh", "-c", "python manage.py migrate --noinput && exec gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers ${WEB_CONCURRENCY:-3} --threads 4 --timeout 120"]
