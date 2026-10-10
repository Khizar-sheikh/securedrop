# SecureDrop

**Mobile-first secure file & note sharing.** Share sensitive files and notes with expiring, revocable, one-time links — from your phone, on your own infrastructure.

Security first. Then reliability. Then UX.

---

## Why SecureDrop

Cloud links are broken for sensitive data. A WeTransfer or Drive link, once copied, lives forever, opens from any device, reveals nothing about who accessed it, and gives you one blunt control: delete it. SecureDrop flips the model — the **server decides every access**, every time:

- Links **expire** on a timer you set — 15 minutes to never.
- Links can be **one-time**: the first successful open destroys them, atomically.
- Links can require a **password**, cap the **number of opens**, and be **revoked instantly**.
- Every open, download, failed unlock and revocation is **audited** with time, IP and user agent.
- Recipients need **no account** — the link opens straight into the app.
- **Self-hosted**: your files never touch a third-party cloud.

> **Core rule:** the client never decides access. The backend validates token, expiration, revocation, access limit, ownership and recipient session on *every single request*.

---

## Highlights

| | |
|---|---|
| **Secure links** | Expiry, max opens, one-time consumption, passwords, instant revocation, strict device-environment mode |
| **Recipients** | No account required; password gate; bounded sessions; download can be disabled (view-only) |
| **Files** | 100 MB uploads, MIME allowlist (no SVG), filename normalization, streaming download, SHA-256 checksums |
| **Secure notes** | Markdown editor with preview, syntax-highlighted code blocks, tags, attach files — shared through the *same* share architecture |
| **Activity feed** | Every security-relevant action recorded: uploads, links created/revoked, opens, downloads, note events |
| **Mobile-first** | Expo/React Native, dark mode, skeleton/offline/error/empty states, native deep links (`securedrop://s/<token>`) |
| **Self-hosted** | 3 containers (Postgres, Redis, MinIO), loopback-only, zero external services |

---

## What makes it different (the moat)

1. **Security is the product, not a feature flag.** Most tools bolt auth onto a signed URL. SecureDrop's share model is *stateful*: every request re-validates the share's lifecycle (active → expired / consumed / revoked / limit-reached) before anything is released.
2. **Recipient-grade access control.** Shares create short-lived *recipient sessions* (secret stored as SHA-256 hash). Session, not link, authorizes each download; one-time shares flip to consumed **atomically** in the database, so two devices racing the same link can never both win.
3. **IP as a risk signal — never an identity.** In *strict mode*, an environment change (different IP/user agent mid-share) forces re-authentication instead of silently allowing it.
4. **Zero third-party surface.** Private MinIO bucket, never exposed. The backend streams bytes through its own authorized endpoints — no permanent presigned URLs, no storage credentials ever leave the server.
5. **Files and notes, one architecture.** Notes share the same `Share` table with an exactly-one-target constraint — expiry, passwords, one-time rules and revocation apply identically to both.
6. **Auditable by design.** 135 backend tests, a full audit trail, a health endpoint that reports `ok/degraded/down` per dependency, and a codebase small enough for one person to actually read.
7. **Honest scope.** No accounts to mine, no telemetry, no analytics SDKs. `.env` is gitignored; the repo has never contained a secret.

### How it compares

| Capability | SecureDrop | Cloud drive links | Chat attachments |
|---|---|---|---|
| Expiring links | ✅ built-in | ⚠️ often paid | ❌ |
| True one-time open | ✅ atomic | ❌ | ❌ |
| Password-gated links | ✅ | ⚠️ paid tier | ❌ |
| Open-count limit | ✅ | ❌ | ❌ |
| Instant revocation | ✅ | ⚠️ | ❌ |
| Access audit trail | ✅ full feed | ⚠️ minimal | ❌ |
| View-only (download disabled) | ✅ | ❌ | ❌ |
| Recipient needs an account | ❌ | ✅ | ✅ |
| Self-hosted / your infra | ✅ | ❌ | ❌ |
| Notes + files in one link type | ✅ | ❌ | ❌ |

**Honest limitations (read this):** SecureDrop does transport security and server-side access control — it is **not** end-to-end encrypted, and the server can read file contents (it must, to stream and audit them). E2E/client-side encryption is on the roadmap. Run it behind TLS (reverse proxy) in production; local dev binds to `127.0.0.1`.

---

## Architecture

```text
┌─────────────────────┐        deep link: securedrop://s/<token>
│  Expo / React Native│◄──────────────────────────────────────────┐
│  mobile app (owner  │   REST /api/v1 (JWT access + refresh)     │
│  & recipient flows) │────────────────────────────┐              │
└─────────────────────┘                            ▼              │
                                        ┌─────────────────────┐   │
                                        │  NestJS 12 backend  │   │
                                        │  - JWT rotation     │   │
                                        │  - scrypt passwords │   │
                                        │  - share lifecycle  │   │
                                        │  - audit log        │   │
                                        └──┬───────┬───────┬───┘   │
                          Prisma ORM ──────┘       │       │       │
                                                   │       │       │
                    ┌──────────────────────────────┤       │       │
                    ▼                              ▼       ▼       │
           ┌────────────────┐            ┌────────────┐ ┌────────┐│
           │ PostgreSQL 17  │            │ Redis 7    │ │ MinIO  ││
           │ users, files,  │            │ rate limits│ │private ││
           │ shares, notes, │            │ auth lockout│ │ bucket ││
           │ audit          │            │ sessions   │ │ (S3)   ││
           └────────────────┘            └────────────┘ └────────┘│
                                                                 └──
```

### Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo SDK 57, React Native 0.86, TypeScript, Expo Router, `@expo/vector-icons`, `react-native-markdown-display` |
| Website | Next.js 16 (App Router, Turbopack), React 19.2, Tailwind 4 — landing, user dashboard, admin (`web/`) |
| Backend | NestJS 12, TypeScript 5.9 (strict), class-validator, `@nestjs/throttler`, `@nestjs/jwt`, multer |
| Data | PostgreSQL 17 + Prisma 6.19 (migrations), Redis 7 (limits/sessions), MinIO (S3 API via `@aws-sdk/client-s3`) |
| Infra | Docker Compose (3 containers + one-shot bucket init), npm workspaces |

---

## Containers

Started by `docker compose up -d` (project name `securedrop` — containers are prefixed `securedrop-*` and use their own volumes, so they never touch other projects on your machine):

| Container | Image | Host port (loopback) | Purpose |
|---|---|---|---|
| `securedrop-postgres` | `postgres:17-alpine` | `127.0.0.1:5433` | Primary database |
| `securedrop-redis` | `redis:7-alpine` | `127.0.0.1:6380` | Rate limits, auth lockout, sessions |
| `securedrop-minio` | `bitnamilegacy/minio` | `127.0.0.1:9000` (API), `9001` (console) | Private object storage |
| `securedrop-minio-init` | `bitnamilegacy/minio-client` | — (one-shot) | Creates the private bucket, disables anonymous access |

> ⚠️ Ports are fixed in `docker-compose.yml` / `.env` (`5433`, `6380`, `9000/9001`). If you already run Postgres on `5432` or Redis on `6379`, nothing changes — SecureDrop never binds those ports and only ever dials `localhost:5433` / `localhost:6380`.

---

## Complete setup

### 1. Prerequisites

- **Node.js 20+** and npm 11+ (workspaces)
- **Docker Desktop** (or Docker Engine + Compose)
- A phone with **Expo Go** (for local development)
- Android Studio / Xcode are **not** required

### 2. Install & configure

```bash
git clone <your-repo-url> securedrop
cd securedrop

npm install                      # installs backend + app (workspaces)

cp .env.example .env             # then generate real secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Fill `.env` (root) with generated values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RECIPIENT_SESSION_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

- `.env` is **gitignored** — never commit it, never put secrets in the mobile app.
- Defaults are already consistent: `POSTGRES_PORT=5433`, `REDIS_PORT=6380`, `DATABASE_URL=…localhost:5433/securedrop…`.

### 3. Start the containers

```bash
npm run docker:up                # = docker compose up -d
docker compose ps                 # postgres / redis / minio → (healthy)
npm run infra:check              # verifies all three are reachable
```

### 4. Database schema

```bash
npm run prisma:generate --workspace backend   # generate Prisma client
npm run prisma:deploy --workspace backend     # apply migrations
```

> ⚠️ **Windows:** stop the backend first (`Ctrl+C`, or the running `npm run backend`).
> While it runs, the Prisma query-engine DLL is locked and `prisma generate` fails with
> `EPERM: rename … query_engine-windows.dll.node`.

### 5. Backend API

```bash
npm run backend                  # = start:dev, http://localhost:3000
```

Verify: <http://localhost:3000/api/v1/health> → `"status": "ok"` with `db` / `redis` / `storage` checks.

### 6. Mobile app

```bash
npm run app                      # = expo start
```

- Scan the QR code with **Expo Go** (same Wi-Fi as your machine).
- Real device can't reach `localhost` — set in `app/.env`:
  `EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000` (Android emulator: `http://10.0.2.2:3000`).

### 7. Smoke test the flow

1. Register → land on **Files**.
2. Upload a file → **Create secure link** (expiry / one-time / password) → copy link.
3. Open the link on a second device (or after logout) → recipient flow: inspect → open → download.
4. Revoke from **Shares** → the link is dead immediately.
5. **Notes** tab → write Markdown → attach a file → share the note.

### 8. Website + admin access

1. `npm run web` → Next.js dev server on `http://localhost:3001` (backend must be running).
2. Admin access is a first-class backend concern: every user has a `role` (`USER`/`ADMIN`), and all `/api/v1/admin/*` routes require `ADMIN`, checked against the database on every request.
3. Promote yourself after registering:

```bash
npm run admin:promote --workspace backend -- you@example.com
```

4. Sign in on the website and open `/admin` (metrics, users, shares, audit trail).

---

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install all workspaces |
| `npm run docker:up` / `docker:down` | Start / stop the 3 containers |
| `npm run infra:check` | Ping Postgres, Redis, MinIO |
| `npm run backend` | Backend in watch mode (:3000) |
| `npm run app` | Expo dev server |
| `npm run web` | Website in watch mode (:3001) |
| `npm run web:build` | Production website build |
| `npm run admin:promote --workspace backend -- <email>` | Grant (or revoke) the ADMIN role |
| `npm run backend:test` | Backend test suite (Jest) |
| `npm run typecheck` | TS strict check for backend **and** app |
| `npx expo lint` | Mobile app lint (in `app/`) |
| `npx expo export --platform android` | Production bundle sanity check |
| `npm run prisma:migrate --workspace backend` | Create a new migration (dev) |

---

## Environment variables

Root `.env` (see `.env.example` for the full list):

| Variable | Default / notes |
|---|---|
| `PORT` | `3000` — backend API port |
| `POSTGRES_PORT` / `REDIS_PORT` | `5433` / `6380` — avoid common conflicts |
| `DATABASE_URL` | must point at `localhost:5433` |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `30d` (refresh tokens rotate) |
| `UPLOAD_MAX_BYTES` | `104857600` (100 MB) |
| `UPLOAD_ALLOWED_MIME` | extend the default allowlist (no SVG by default) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_TTL_MS` | `600` requests / `60s` (global) |
| `AUTH_MAX_FAILED_ATTEMPTS` / `AUTH_FAIL_WINDOW` | `10` / `15m` per email |
| `CLEANUP_ENABLED` / `CLEANUP_INTERVAL_MS` | hourly session/audit housekeeping |
| `AUDIT_RETENTION_DAYS` | `180` |
| `CORS_ORIGINS` | comma-separated trusted browser origins (e.g. `http://localhost:3001`); CORS stays off when empty |

App (`app/.env`): `EXPO_PUBLIC_API_URL` — backend base URL for the device.

---

## Security model

**At rest / in transit**
- Passwords: **scrypt** (N=16384, r=8, p=1) with per-user salt — never reversible.
- Share tokens & recipient-session secrets: stored only as **SHA-256 hashes**.
- JWT access tokens (15 min) + refresh tokens with **rotation**: each session keeps exactly one live refresh token, and an already-used (rotated) token is rejected atomically.
- Storage bucket is **private**; objects are streamed through the API — no public URLs, credentials never leave the server.
- TLS is your reverse proxy's job in production (local dev is loopback-only).

**Abuse controls**
- Global rate limit: 600 req/min.
- Login lockout: 10 failures / 15 min per email — counted even for *non-existent* accounts, so it can't be used to enumerate users.
- Share-password lockout: 5 failures / 15 min per share+IP (`429 RATE_LIMITED`), cleared on success and audited.
- Upload policy: size cap, MIME allowlist, filename normalization, path traversal stripped, **content sniffing** (image magic-byte checks; HTML/SVG markup rejected in text uploads), **archive expansion checks** (zip/tar declared uncompressed size capped at `UPLOAD_MAX_UNCOMPRESSED_BYTES`), **per-user concurrency cap** (`UPLOAD_MAX_CONCURRENT` slots).
- Security headers on every API response: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, **deny-all CSP**; `Cache-Control: no-store` on all API responses. Website adds the same set plus `Cross-Origin-Opener-Policy` and a scoped production CSP.
- **HSTS** behind `ENABLE_HSTS=true` (API + website).
- Response logging **redacts secrets** (`redactSecrets`).

**Production notes**
- Terminate TLS in front of API + website (cookies are `Secure` in production), then set `ENABLE_HSTS=true`.
- Behind a reverse proxy, configure Express trust proxy so lockout/rate-limit keys use the real client IP.
- Keep `CORS_ORIGINS` limited to the real website origin(s). Website CSP keeps `'unsafe-inline'` for scripts because the Next App Router bootstrap requires inline scripts (see `docs/security-audit.md`).

**Share lifecycle (enforced server-side on every request)**
`active → expired (timer) / consumed (one-time, atomic) / revoked / access-limit-reached` — checked *before* recipient-session state, so revoking a link kills open sessions too. Password-protected shares return `SHARE_PASSWORD_REQUIRED` until unlocked; `allowDownload: false` still allows governed viewing but blocks byte release.

**Audit**
Every action writes an `AuditEvent` (actor, action, share/file/note id, IP, user agent, reason). Hourly cleanup removes expired sessions and prunes audit rows past `AUDIT_RETENTION_DAYS`.

**Verified:** 177 backend tests across 29 suites (auth, uploads incl. content sniffing + archive expansion + concurrency cap, shares, one-time/expiry/revocation, recipient sessions, notes, note-shares, cleanup, security headers, share-password lockout), plus `tsc --noEmit` and ESLint on both workspaces. Security review: `docs/security-audit.md`.

---

## API surface (summary)

All under `/api/v1`, envelope `{success, data}` / `{success:false, error:{code,message}}`:

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register` `login` `refresh` `logout`, `GET /auth/me` |
| Files | `GET/POST /files`, `GET/DELETE /files/:id` |
| Shares (owner) | `GET/POST /shares`, `DELETE /shares/:id` |
| Recipient | `POST /public/shares/open` (inspect / open / restore via `sessionSecret`), `POST /public/shares/download` |
| Notes | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:id`, `POST /notes/:id/files`, `DELETE /notes/:id/files/:fileId` |
| Activity | `GET /audit` |
| Admin | `GET /admin/metrics`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/shares`, `DELETE /admin/shares/:id`, `GET /admin/audit` (ADMIN only) |
| System | `GET /health` |

---

## Project structure

```text
securedrop/
├── backend/                 NestJS API
│   ├── prisma/              schema + migrations
│   ├── src/
│   │   ├── modules/         auth, files, shares, notes, audit, admin, cleanup, health
│   │   ├── security/        scrypt, token hashing, upload policy
│   │   └── app/             bootstrap, global guards, logging
│   └── tests/               25 Jest suites (153 tests)
├── app/                     Expo mobile app
│   └── src/
│       ├── app/             routes (tabs, auth, file/, share/, note/, s/)
│       ├── screens/         Files, Shares, Notes, editor, ShareAccess, Activity…
│       ├── components/      Button, TextField, MarkdownView…
│       ├── services/        typed API clients
│       └── theme/           tokens: light/dark palettes, spacing, typography
├── web/                     Next.js website (landing, dashboard, admin)
├── design/tokens.json       canonical design tokens shared by app + website
├── docker-compose.yml       postgres + redis + minio (+ bucket init)
├── docs/local-development.md
└── SecureDrop_Application_Plan.md   full spec (phases, DoD)
```

---

## Documentation

- `docs/local-development.md` — detailed local setup
- `docs/security-audit.md` — threat review of API + website: findings, fixes, accepted risks, deployment checklist
- `SecureDrop_Application_Plan.md` — the full product spec: 15 phases, UX rules, security requirements, Definition of Done (all in-scope items checked off)

## Roadmap (deferred on purpose)

File search, file previews, access notifications, recipient device caps, cached metadata — see the plan. Future: E2E/client-side encryption, QR sharing, web app. See *Future Features* in the plan.

---

*Build small. Test small. Secure small. Commit small. Never weaken security to make a feature easier.*
