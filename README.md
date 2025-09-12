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

## Using the API

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
