# Multi-stage: `builder` installs runtime-only dependencies into a venv so
# the prod image never carries pip's cache, the build toolchain (gcc, etc.
# that scikit-learn's wheels sometimes pull in transitively), or test
# tooling (pytest/httpx — see requirements-dev.txt).
FROM python:3.12-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS prod

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY app ./app

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Dev target: the docker-compose dev workflow bind-mounts the source tree for
# hot reload, same convention as Dockerfile.api's dev target. Installs
# requirements-dev.txt on top of the builder's venv so pytest is available.
FROM builder AS dev

WORKDIR /app
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
