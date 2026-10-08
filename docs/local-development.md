# Local Development

## Prerequisites

- Node.js 20+
- npm 11+ (workspaces)
- Docker with Docker Compose

Android Studio is **not** required. The mobile app runs in Expo Go / a dev build.

## One-time setup

```bash
npm install            # installs backend + app (root workspaces)
cp .env.example .env   # then generate real secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Put generated values in `.env` for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`RECIPIENT_SESSION_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`,
`STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

`.env` is gitignored. Never commit it, never put secrets in the mobile app.

## Services

```bash
docker compose up -d    # postgres, redis, minio
docker compose ps       # all should be healthy
```

| Service  | Host port        | Notes                                   |
|----------|------------------|-----------------------------------------|
| Postgres | 127.0.0.1:5433   | db/user `securedrop`                    |
| Redis    | 127.0.0.1:6380   | password required                       |
| MinIO    | 127.0.0.1:9000   | S3 API, private bucket `securedrop-private` |
| MinIO UI | 127.0.0.1:9001   | console (root credentials in `.env`)    |

All ports bind to loopback only.

## Run

```bash
# database schema (after Prisma models exist)
npm run prisma:migrate --workspace backend

# API on http://localhost:3000/api/v1
npm run backend

# mobile app
npm run app
```

Set `EXPO_PUBLIC_API_URL` in `app/.env`:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<your-LAN-IP>:3000`

## Verify

```bash
curl http://localhost:3000/api/v1/health   # all three checks up
node backend/scripts/check-infra.js        # redis + storage direct check
docker compose exec -T postgres psql -U securedrop -d securedrop -c 'select 1;'

npm run typecheck      # backend + app
npm run backend:test   # requires docker services to be running
npm run backend:build
```

## Health endpoint

`GET /api/v1/health` returns `200` with `checks: { database, redis, storage }`,
or `503` with `code: SERVICE_UNAVAILABLE` and a safe per-service summary when
anything is down. Raw dependency errors are logged server-side, never returned.

## Stopping

```bash
docker compose down       # keeps data volumes
docker compose down -v    # DELETES all data — never run against real data
```
