# Multi-stage: `builder` installs dependencies into a venv so the final
# image never carries pip's cache or build toolchain (gcc, etc. that
# scikit-learn's wheels sometimes pull in transitively).
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
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Dev target: the docker-compose dev workflow bind-mounts the source tree for
# hot reload, same convention as Dockerfile.api's dev target.
FROM builder AS dev

WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
