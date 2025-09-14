# Intro

This project showcases an event-driven, hexagonal architecture for generating monthly reports. It is composed of two Dockerized Node.js services—an HTTP API and a background aggregator—that communicate via Google Cloud Pub/Sub.

## Features

- Dockerized **api** and **aggregator** services
- Event-driven and Hexagonal Architecture
- Google Cloud emulators for `@google-cloud/pubsub` and `@google-cloud/datastore`
- PostgreSQL database + Sequelize ORM
- OpenAPI documentation served at `http://localhost:3001/openapi.json` & `http://localhost:3001/docs`
- Metrics with Prometheus `http://localhost:3001/metrics` & `http://localhost:3002/metrics`
- Distributed tracing via OpenTelemetry `http://localhost:16686` (run `bash docker run --rm -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one`)
- Redis caching layer
- GitHub Actions for CI/CD
- Vitest tests with coverage above 80%

# How to Run

## Prerequisites

- Node.js \>= 22
- [pnpm](https://pnpm.io/) package manager
- Docker and Docker Compose

## Installation

Install dependencies for all workspaces:

```bash
pnpm install
```

## Run with Docker

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

Build and start the full development stack:

```bash
docker-compose up --build
```

This command launches the following containers:

- **postgres-db** – PostgreSQL database initialized with sample data
- **gcp-emulators** – Pub/Sub and Datastore emulators `http://127.0.0.1:8086`
- **aggregator** – background worker that processes Pub/Sub messages and writes reports
- **api** – HTTP API available at `http://localhost:3001`

The API will log `API listening on port 3001` when ready.
The aggregator will log `Aggregator service ready to process messages` when it starts.

## Run services without Docker

You can also run the TypeScript services directly on your machine. Make sure Postgres and the emulators are running, then in separate terminals run:

```bash
pnpm dev:aggregator
pnpm dev:api
```

To start the API without hot reloading, run:

```bash
pnpm --filter api start
```

## Testing

Run the test suite with coverage:

```bash
pnpm test
```

The project maintains over 80% code coverage using Vitest.

## Using the API

The repository includes a request collection at `apps/api/http.rest` for use with tools like the "REST Client" extension. It contains ready-to-run examples for the endpoints below. The API also exposes an OpenAPI 3.0 schema at `http://localhost:3001/openapi.json` for exploration and client generation.

Assuming the stack is running, interact with the service via HTTP:

### List months with completed orders

```bash
curl http://localhost:3001/api/reports/available-months
```

### Request report generation

```bash
curl -X POST http://localhost:3001/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "month": 7}'
```

### Retrieve a generated report

```bash
curl http://localhost:3001/api/reports/monthly/2025/7
```

Each endpoint returns JSON. Report generation is asynchronous—after calling `generate`, use the `monthly` endpoint to fetch the report once ready.

## Metrics

Both services expose Prometheus metrics.

- **API** – visit `http://localhost:3001/metrics`.
- **Aggregator** – metrics are available at `http://localhost:3002/metrics`. The Docker setup already exposes this port.

Point your Prometheus server at these endpoints to enable scraping.

## Tracing

Both services emit OpenTelemetry traces. Spans are exported using OTLP to the endpoint configured by `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4318/v1/traces`).

To view traces locally, run a collector with a Jaeger UI:

```bash
docker run --rm -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one
```

With the collector running and the services started, open `http://localhost:16686` to explore traces.

## Caching

Responses for `available-months` and individual `monthly` reports are cached in Redis to reduce load on the database and Datastore. Cached entries expire after `REPORTS_CACHE_TTL_SECONDS` (default `3600`), which can be tuned in the environment. To invalidate the cache manually—for example, immediately after generating new reports—delete the keys `available-months` or `monthly:{year}-{month}` from Redis. Otherwise, stale data is automatically refreshed once the TTL elapses.

## CI/CD

GitHub Actions orchestrate continuous integration and delivery. The [`ci.yml`](.github/workflows/ci.yml) workflow checks formatting, runs tests, and builds the project on every push or pull request. The [`cd.yml`](.github/workflows/cd.yml) workflow builds and publishes Docker images for both services to the GitHub Container Registry.

## Stop and Clean Up

When you are finished working with the application, shut down all running services.

### Docker stack

If you started the stack with Docker Compose, stop and remove the containers:

```bash
docker-compose down
```

To also remove volumes and reset state, run:

```bash
docker-compose down --volumes --remove-orphans
```

### Local processes

For services started with `pnpm dev:aggregator` or `pnpm dev:api`, press `Ctrl+C` in each terminal to terminate them.
