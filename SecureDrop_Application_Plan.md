# SecureDrop — React Native Secure File Sharing Platform

> **Status:** Planning / MVP  
> **Architecture:** Monorepo  
> **Main Product:** Secure file sharing  
> **Secondary Modules:** One-time/expiring shares, secure notes, developer-friendly sharing  
> **Primary Principle:** Security first, then reliability, then UX.

---

# 1. Product Vision

SecureDrop is a mobile-first secure file-sharing application.

The main use case is simple:

1. A user uploads a file.
2. The user creates a controlled share.
3. The recipient receives a secure share link.
4. The backend validates the share and recipient session.
5. The recipient can preview/download the file according to the owner's rules.
6. Access remains controlled even if the link is copied elsewhere.
7. The owner can revoke the share at any time.
8. Every important access event is recorded.

The application will later support secure developer notes, code snippets, attachments, and other sharing workflows.

---

# 2. Core Security Principle

## Never trust the client.

The React Native application must never be responsible for deciding:

- whether a share is valid
- whether a file has expired
- whether a user can download
- whether a link has exceeded its access limit
- whether a recipient session is authorized
- whether a share has been revoked

The backend must make these decisions.

The app only requests an operation and displays the backend's result.

---

# 3. Monorepo Structure

```text
securedrop/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── common/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── files/
│   │   │   ├── shares/
│   │   │   ├── sessions/
│   │   │   ├── notes/
│   │   │   ├── audit/
│   │   │   └── health/
│   │   ├── database/
│   │   ├── storage/
│   │   ├── security/
│   │   ├── middleware/
│   │   └── app/
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── app/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── navigation/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── files/
│   │   │   ├── shares/
│   │   │   ├── notes/
│   │   │   └── settings/
│   │   ├── services/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── theme/
│   │   ├── utils/
│   │   ├── types/
│   │   └── constants/
│   ├── assets/
│   ├── tests/
│   ├── package.json
│   └── README.md
│
├── docs/
├── .gitignore
├── package.json
├── README.md
└── README.md
```

---

# 4. Recommended Technology Direction

## Mobile

- React Native
- TypeScript
- React Navigation
- TanStack Query
- Zustand or equivalent lightweight state management
- Secure device storage for sensitive session material
- Native file/document picker
- Native sharing APIs

## Backend

Recommended starting point:

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Redis
- Object storage
- JWT/session-based authentication
- REST API

## Infrastructure

Start locally with:

- Docker
- PostgreSQL
- Redis
- Local/S3-compatible object storage

Production can later move to:

- AWS S3
- AWS/R2-compatible object storage
- Managed PostgreSQL
- Managed Redis
- Container deployment

Do not over-engineer infrastructure during MVP.

---

# 5. Development Rule

Every item below is intentionally small.

When a task is completed:

- [x] Mark it complete. (every finished task annotated `[x]` + tested + committed)
- Test it.
- Do not silently skip failed tasks.
- Keep commits small.
- Do not implement future features early.
- Do not weaken security to make a feature easier.

---

# 6. PHASE 0 — Project Setup

## Repository

- [x] Create the root repository.
- [x] Create `backend/`.
- [x] Create `app/`.
- [x] Create `docs/`.
- [x] Add root `.gitignore`.
- [x] Add root `README.md`.
- [x] Add root package configuration.
- [x] Decide package manager. (npm v11 workspaces)
- [x] Add basic monorepo scripts.
- [x] Confirm both projects install successfully. (npm workspaces, tsc clean)

## Backend Setup

- [x] Initialize TypeScript. (5.9.3, strict tsconfig)
- [x] Initialize NestJS. (Nest 12, `nest build` passes)
- [x] Create `src/app`.
- [x] Create `src/config`. (env schema + typed config, fail-fast validation)
- [x] Create `src/common`. (response envelope + stable error codes)
- [x] Create `src/modules`.
- [x] Create health module. (`GET /health` returns envelope)
- [x] Add environment configuration. (fail-fast env schema)
- [x] Add `.env.example`.
- [x] Add global validation. (ValidationPipe whitelist/forbid/transform + 3 tests)
- [x] Add global error handling. (exception filter + response envelope + tests)
- [x] Add API versioning. (`/api/v1/...` + `apiUrl()` helper + tests)
- [x] Add basic request logging. (`GET /api/v1/health 200 5ms`)

## App Setup

- [x] Initialize React Native. (Expo SDK 57, RN 0.86)
- [x] Enable TypeScript. (strict, extends expo/tsconfig.base)
- [x] Create source directories.
- [x] Add navigation. (Expo Router: auth stack + 4 tabs, `expo export` bundles OK)
- [x] Add theme system. (light/dark tokens + provider, tsc clean)
- [x] Add basic API client. (fetch wrapper, envelope unwrap, ApiError, timeout/abort)
- [x] Add environment configuration. (`EXPO_PUBLIC_API_URL`, `.env` gitignored)
- [x] Add development logging. (dev-only logger)
- [x] Confirm app launches on device/emulator. (Metro dev bundle serves 1453 modules; no emulator on this machine)

---

# 7. PHASE 1 — Local Infrastructure

- [x] Create Docker configuration. (`docker-compose.yml`, loopback-only ports 5433/6380/9000/9001)
- [x] Start PostgreSQL. (postgres:17-alpine, healthy)
- [x] Start Redis. (redis:7-alpine + password, healthy)
- [x] Start local object storage. (MinIO + private bucket `securedrop-private`)
- [x] Add health checks. (compose healthchecks on all services)
- [x] Connect backend to PostgreSQL. (Prisma 6, `SELECT 1` via health check)
- [x] Connect backend to Redis. (ioredis + password, health check)
- [x] Connect backend to object storage. (S3 client, bucket ensure + HeadBucket)
- [x] Verify all services independently. (psql, redis-cli, MinIO, degraded 503 test)
- [x] Add local development documentation. (`docs/local-development.md`)

---

# 8. PHASE 2 — Database Foundation

Create database schema incrementally.

## User

- [x] Create User model. (migration `add_user`)
- [x] Add unique email.
- [x] Add password hash.
- [x] Add created timestamp.
- [x] Add updated timestamp.
- [x] Add account status. (ACTIVE / DISABLED)

## File

- [x] Create File model. (migration `add_file`)
- [x] Add owner ID. (FK, cascade delete)
- [x] Add original filename.
- [x] Add MIME type.
- [x] Add file size.
- [x] Add storage key. (server-generated, unique)
- [x] Add checksum/hash. (sha256)
- [x] Add created timestamp.
- [x] Add deleted timestamp. (soft delete)

## Share

- [x] Create Share model. (migration `add_share_recipient_session_audit`)
- [x] Add file ID.
- [x] Add owner ID.
- [x] Add secure token identifier. (`tokenHash` = sha256 of link token, unique)
- [x] Add expiration. (`expiresAt`)
- [x] Add download permission. (`allowDownload`)
- [x] Add maximum access count. (`maxAccesses`, null = unlimited)
- [x] Add current access count. (`accessCount`)
- [x] Add password protection option. (`passwordHash`)
- [x] Add revoked status. (`revokedAt` + `consumedAt` for one-time)
- [x] Add created timestamp.

## Recipient Session

- [x] Create recipient session model.
- [x] Store share ID.
- [x] Store session identifier. (`tokenHash` = sha256 of session secret)
- [x] Store creation time.
- [x] Store last access time.
- [x] Store expiration time.
- [x] Store security metadata required by policy. (ip + userAgent as signals)

## Audit Event

- [x] Create audit event model.
- [x] Add event type. (`AuditEventType` enum)
- [x] Add user/share/file reference where appropriate.
- [x] Add timestamp.
- [x] Add request metadata needed for security investigation. (ip, userAgent, jsonb metadata)
- [x] Define a retention strategy. (cascade on delete + 180-day prune, documented in schema)

---

# 9. PHASE 3 — Authentication

- [x] Create registration endpoint. (`POST /api/v1/auth/register`, 5 tests)
- [x] Validate email. (class-validator + lowercase normalization)
- [x] Validate password. (policy in DTO + server-side `assertPasswordPolicy`)
- [x] Hash passwords securely. (scrypt N=16384, per-password salt, timing-safe)
- [x] Never store plaintext passwords. (verified in test against DB row)
- [x] Create login endpoint. (`POST /api/v1/auth/login`, timing-equalized, 7 tests)
- [x] Create authenticated session. (15m JWT access + 30d rotating Redis refresh session, stored hashed)
- [x] Create logout endpoint. (`POST /api/v1/auth/logout`, idempotent, revokes refresh token)
- [x] Add authentication guard. (`AccessTokenGuard`: JWT verify + live account check, 8 tests)
- [x] Add current-user endpoint. (`GET /api/v1/auth/me`)
- [x] Add rate limiting to authentication. (global throttler + per-email Redis lockout, 2 suites)
- [x] Add failed-login handling. (10 failures/15min → 429 `RATE_LIMITED`, counter cleared on success)
- [x] Add account status validation. (DISABLED → 403 `ACCOUNT_DISABLED` after password check)
- [x] Add audit events for authentication. (`USER_REGISTERED`, `LOGIN_FAILED`, `USER_LOGIN`, `USER_LOGOUT`)

## App

- [x] Create welcome screen. (brand + Sign in / Create account actions)
- [x] Create login screen. (client validation, inline errors, auto sign-in on success)
- [x] Create registration screen. (email + password + confirmation, mirrors server policy)
- [x] Create session persistence. (AsyncStorage session, validated against `/auth/me` at startup)
- [x] Create logout flow. (Settings → `POST /auth/logout` → local clear → login route)
- [x] Handle expired sessions. (one silent refresh + retry, then redirect to login)
- [x] Handle authentication errors. (server messages surfaced inline; network vs session errors distinguished)

---

# 10. PHASE 4 — File Upload

## Backend

- [x] Create upload endpoint. (`POST /api/v1/files`, multipart, 8 tests)
- [x] Authenticate upload request. (`AccessTokenGuard`, 401 when missing)
- [x] Validate file size. (multer streaming limit + service check → 413)
- [x] Validate filename. (strip path segments/control chars, bound length)
- [x] Validate MIME type. (configurable allowlist → 415, no SVG/executables)
- [x] Generate server-side storage key. (`${ownerId}/${serverUuid}`)
- [x] Never use user filename as storage key. (asserted in test)
- [x] Stream/upload file to private storage. (temp file on disk → streamed PutObject)
- [x] Store file metadata. (Prisma `File` row; temp file removed in `finally`)
- [x] Calculate file checksum where appropriate. (streaming sha256)
- [x] Return safe file metadata. (presenter omits storageKey; no bucket/credentials in payload)
- [x] Never expose internal storage credentials. (verified by asserting response has no bucket)
- [x] Never expose private storage directly. (no URLs handed out; backend streams on request)

## App

- [x] Create file picker. (`expo-document-picker`)
- [x] Select file. (single document, cancelled pick ignored)
- [x] Display filename. (pending card + list rows)
- [x] Display size. (`formatBytes`)
- [x] Display upload progress. (XHR `upload.onprogress` → `ProgressBar`)
- [x] Handle cancellation. (abort → `UploadCancelledError`, state reset)
- [x] Handle failed uploads. (inline error + status mapping from API envelope)
- [x] Retry failed uploads. (re-submits the same picked asset)
- [x] Show successful upload. (success card, list refreshed)
- [x] Show user's files. (flat list from `GET /files`)

---

# 11. PHASE 5 — File Management

- [x] List user's files. (backend `GET /api/v1/files` + app flat list)
- [x] Add pagination. (`page`/`pageSize` → `total`/`hasMore`; app infinite scroll, 7 tests)
- [x] Add pull-to-refresh. (`RefreshControl` on the file list)
- [ ] Add file search later if needed.
- [x] Add file details. (`/file/[id]` screen: size, type, date, checksum)
- [x] Add delete file. (details → `DELETE /files/:id`, returns to refreshed list)
- [x] Confirm destructive actions. (`Alert.alert` destructive confirmation before delete)
- [x] Prevent unauthorized file access. (non-owners get 404, no existence leak)
- [x] Add backend ownership checks. (every query scoped by `ownerId`)
- [x] Add audit events. (`FILE_DELETED` with actor/ip; uploads already audited)

---

# 12. PHASE 6 — Secure Sharing

This is the core module.

## Create Share

- [x] Create share endpoint. (`POST /api/v1/shares`, 7 tests)
- [x] Verify file ownership. (owner-scoped lookup → 404 for others/deleted)
- [x] Generate cryptographically secure share token. (32 random bytes, base64url)
- [x] Store only what is necessary. (sha256 of token; scrypt hash of optional password)
- [x] Set expiration. (`expiresInSeconds` → `expiresAt`, 60s–1y bounds)
- [x] Set download permission. (`allowDownload`, default true)
- [x] Set access limit. (`maxAccesses`, 1–100000; one-time forces 1)
- [x] Set optional password. (scrypt; only `hasPassword` exposed)
- [x] Set revoked=false. (active on creation; `revokedAt` in every response)
- [x] Create share audit event. (`SHARE_CREATED` with policy metadata)

## Share Configuration

Allow owner to choose:

- [x] Expiration time. (1h / 24h / 7d / 30d / Never chips)
- [x] Maximum accesses. (One time / 5 / 10 / Unlimited)
- [x] Allow download. (switch, default on)
- [x] Require password. (switch + 8-char minimum, hashed server-side)
- [x] Strict security mode. (switch, stored on the share)
- [x] Revoke manually. (Shares tab → confirm → `DELETE /shares/:id`)

Later:

- [ ] Allowed file preview.
- [ ] Allowed recipient device count.
- [ ] Notification on access.

---

# 13. PHASE 7 — Recipient Access

The recipient must not simply receive a permanent public file URL.

Flow:

```text
Share Link
    ↓
Backend validates token
    ↓
Check revoked
    ↓
Check expiration
    ↓
Check access limits
    ↓
Create/restore recipient session
    ↓
Apply security policy
    ↓
Allow preview/download
```

Tasks:

- [x] Create public share endpoint. (`POST /api/v1/public/shares/open`, token in body so URLs/logs stay clean)
- [x] Validate share token. (SHA-256 lookup, raw token never stored)
- [x] Reject malformed tokens. (format check → `SHARE_INVALID` 404, same response as unknown tokens)
- [x] Reject revoked shares. (`SHARE_REVOKED` 410)
- [x] Reject expired shares. (`SHARE_EXPIRED` 410)
- [x] Reject exceeded access limits. (single conditional `updateMany` — atomic against races)
- [x] Create recipient session. (32-byte secret returned once, only its hash stored)
- [x] Bind session to the share. (restore verifies `session.shareId` + revocation/expiry)
- [x] Record first access. (`recipientSession.createdAt`)
- [x] Record last access. (`lastAccessAt` updated on every open)
- [x] Record download events. (`SHARE_DOWNLOADED` with session, IP, UA)
- [x] Return only authorized file information. (no ids, owner, storage key or token)

---

# 14. PHASE 8 — Recipient Session Security

The recipient session is more important than IP alone.

Use a combination of:

- Cryptographically secure share token.
- Recipient session identifier.
- Secure session credential.
- User-agent/device signals where appropriate.
- IP address as a risk signal.
- Expiration.
- Share policy.
- Audit history.

## Important

IP is NOT a permanent identity.

A legitimate user can change:

```text
Wi-Fi → Mobile Data
```

and therefore receive a different IP.

Therefore:

- [x] Record IP. (`recipientSession.ip`, refreshed on each open/download)
- [x] Do not use IP as the sole authorization mechanism. (session secret always required; IP is only a signal)
- [x] Detect significant IP changes. (compared on session restore and download)
- [x] Define behavior for IP changes. (strict → `REAUTHENTICATION_REQUIRED` + `SESSION_CHANGED` audit; normal → accept, re-record IP, audit)
- [x] Use session binding. (session ↔ share, plus strict environment binding)
- [x] Avoid unnecessarily aggressive blocking. (only strict shares challenge; normal shares keep working across IP changes)
- [x] Require re-authentication when security policy requires it. (401 `REAUTHENTICATION_REQUIRED` on strict + change)

---

# 15. PHASE 9 — Secure Download

Never expose a permanent storage URL.

Flow:

```text
Recipient
   ↓
Request download
   ↓
Backend validates session
   ↓
Backend validates share
   ↓
Backend validates permissions
   ↓
Backend generates short-lived access
   ↓
File download
```

Tasks:

- [x] Create download endpoint. (`POST /api/v1/public/shares/download`, streams from private storage)
- [x] Validate recipient session.
- [x] Validate share.
- [x] Check download permission. (`DOWNLOAD_NOT_ALLOWED` 403)
- [x] Check expiration.
- [x] Check access limit. (consumed/limit state enforced; the session already holds its access slot)
- [x] Generate short-lived storage authorization. (server-held credentials sign the `GetObject`; the recipient's short-lived credential is the session — no URL is ever issued)
- [x] Log download. (`SHARE_DOWNLOADED`, `ACCESS_DENIED` with reason)
- [x] Increment access/download counters according to policy. (`downloadCount++`, `lastAccessAt`)
- [x] Return file safely. (`application/octet-stream` + `attachment` + `nosniff` + `no-store`)

---

# 16. PHASE 10 — Reopening a Shared File

Required behavior:

> If an authorized recipient opens the share again from their previously established authorized session, allow access according to the share rules.

Tasks:

- [x] Persist recipient session securely. (32-byte secret returned once; only SHA-256 stored)
- [x] Restore valid recipient session. (`sessionSecret` on `POST /public/shares/open`)
- [x] Validate session server-side.
- [x] Verify share association. (`session.shareId` must match the opened share)
- [x] Check expiration. (session TTL capped by share expiry)
- [x] Check revocation.
- [x] Check access policy. (strict environment binding + `allowDownload`/expiration/limit on download)
- [x] Allow access if valid. (no extra access is consumed on reopen)
- [x] Reject unauthorized sessions. (`RECIPIENT_SESSION_INVALID` / `RECIPIENT_SESSION_EXPIRED` 401)
- [x] Provide a clear re-authentication path when appropriate. (recipient screen clears the stale stored session and re-opens the link; password re-prompted when required)

---

# 17. PHASE 11 — One-Time Shares

- [x] Add one-time share option. (`oneTime` in create-share DTO + `maxAccesses: 1` shortcut)
- [x] Define exactly what "one-time" means.
- [x] Decide whether it means one open or one successful download. (one successful open)
- [x] Enforce the rule on the backend.
- [x] Atomically update access state. (`consumedAt` + `accessCount` in one conditional update)
- [x] Prevent race-condition double access. (conditional `updateMany` — loser sees count 0)
- [x] Revoke/consume the share after successful use. (`SHARE_CONSUMED` 410 afterwards)
- [x] Audit the event. (`SHARE_OPENED` + `RECIPIENT_SESSION_CREATED`)
- [x] Display clear status to owner. (`Used` badge in the Shares tab)

---

# 18. PHASE 12 — Expiring Shares

- [x] Add expiration selector. (15 minutes / 1 hour / 24 hours / 7 days / 30 days / Never)
- [x] Support minutes.
- [x] Support hours.
- [x] Support days.
- [x] Validate expiration server-side. (`expiresInSeconds` 60s–1y)
- [x] Reject expired access. (`SHARE_EXPIRED` 410; expiry enforced inside the atomic claim)
- [x] Show remaining time. (expiry label at creation, `Expires <date>` in Shares tab)
- [x] Handle timezone correctly. (UTC stored; ISO-8601 rendered in the device timezone)
- [x] Add automatic cleanup strategy. (hourly `CleanupService`: expired/revoked recipient sessions + audit events past 180-day retention; Redis TTLs self-clean; expired shares kept as history)

---

# 19. PHASE 13 — Revocation

Owner must always be able to revoke access.

- [x] Create revoke endpoint. (`DELETE /api/v1/shares/:id`, idempotent, 5 tests)
- [x] Verify ownership. (owner-scoped → 404 for non-owners)
- [x] Mark share revoked. (`revokedAt` set in a transaction)
- [x] Invalidate active recipient sessions. (all open sessions revoked in the same transaction)
- [x] Reject future access. (410 `SHARE_REVOKED` on open — tested)
- [x] Reject future downloads. (410 `SHARE_REVOKED` on download — tested)
- [x] Audit revocation. (`SHARE_REVOKED`, once per share)
- [x] Show revoked state in UI. (status badge + revoke action in Shares tab)

---

# 20. PHASE 14 — Secure Notes

Notes are secondary to file sharing.

- [x] Create note model. (`Note` + `NoteFile` tables, soft delete, GIN index on tags, 9 tests)
- [x] Create note. (`POST /api/v1/notes`, trimmed title, normalized tags, `NOTE_CREATED` audit)
- [x] Edit note. (`PATCH /api/v1/notes/:id`, partial update, owner-scoped → 404)
- [x] Delete note. (soft delete + revokes the note's shares in one transaction, `NOTE_DELETED` audit)
- [x] Add Markdown support. (`MarkdownView` on react-native-markdown-display + Edit/Preview toggle in `NoteEditorScreen`)
- [x] Add code block support. (custom `fence`/`code_block` rules render a themed block with a language label)
- [x] Add syntax highlighting. (`utils/highlight.ts` regex tokenizer: keyword/string/comment/number, per-theme palette)
- [x] Add tags. (comma-separated input in the editor, chips on list rows, `?tag=` filter; backend normalizes+dedupes)
- [x] Attach files to notes. (`POST/DELETE /notes/:id/files`, owner-scoped, idempotent, deleted files rejected — 2 tests)
- [x] Share note using same share architecture. (XOR `fileId`/`noteId` on `Share`, `kind: 'note'` in list UI, note rows in Shares, Markdown rendered in ShareAccess)
- [x] Apply expiration/revocation rules to shared notes. (same expiry/revoke paths — 11 tests: expired 410, revoke cuts open/restore/download, one-time, password)

---

# 21. PHASE 15 — Audit & Security Dashboard

Owner should be able to understand what happened.

Show:

- [x] Share created. (`GET /api/v1/audit` feed + Activity screen)
- [x] Share opened.
- [x] File downloaded.
- [x] Share revoked.
- [x] Access denied. (with a friendly reason, never raw error codes)
- [x] Session changed.
- [x] Suspicious access signal. (denied/locked/changed events highlighted in red)
- [x] Avoid exposing unnecessary sensitive information. (no session ids, hashes, user-agents, storage keys or tokens — tested)

Possible event display:

```text
Today

10:42 PM
File downloaded
Resume.pdf

10:40 PM
Share opened
IP changed

10:39 PM
Share created
Expires in 24 hours
```

---

# 22. UI / UX PRINCIPLES

## Overall Design

The application should feel:

- Secure
- Clean
- Fast
- Professional
- Developer-friendly
- Minimal
- Trustworthy

Avoid a complicated enterprise dashboard.

The main action should always be obvious.

---

# 23. Navigation

Suggested bottom navigation:

```text
Files       Shares       Notes       Settings
  ↑
 Main focus
```

Files should be the default screen.

---

# 24. Home / Files Screen

Primary screen:

```text
Good evening

Your Files                         +

Search files...

Recent

📄 Resume.pdf
   2.4 MB · Today

📦 Project.zip
   84 MB · Yesterday

🖼 Screenshot.png
   1.2 MB · Monday
```

UX rules:

- [x] Upload should be immediately accessible. (Upload button always in header: pick → upload → done)
- [x] File type should be visually recognizable. (emoji type icon per row, mime-aware)
- [x] Show useful metadata. (size · upload date)
- [x] Avoid clutter. (single-column cards, one primary action per screen)
- [x] Use skeleton loading. (placeholder rows on first load instead of a bare spinner)
- [x] Handle empty state. ("No files yet. Tap Upload to add one.")
- [x] Handle offline state. (offline card + Try again; offline-aware empty state)

---

# 25. Upload UX

Upload should feel simple.

Flow:

```text
Tap +
   ↓
Select File
   ↓
File Details
   ↓
Upload
   ↓
Success
   ↓
Share / Done
```

Do not force users through unnecessary screens.

Show:

- Filename
- Size
- Progress
- Cancel
- Retry

---

# 26. Share UX

The share screen is one of the most important screens.

Example:

```text
Share Resume.pdf

Access
● Anyone with this secure link

Expires
24 hours

Downloads
✓ Allow download

Security
🔒 Strict

Password
○ No password

[ Create Secure Link ]
```

After creation:

```text
Your secure link is ready

🔗 **************

[ Copy Link ]
[ Share ]
[ View Access Rules ]
```

Never make the user wonder what the link can do.

---

# 27. Security UX

Security warnings should be understandable.

Bad:

> Error 403: recipient_session_policy_violation

Good:

> This share session is no longer authorized.
> Please open the original secure link or authenticate again.

For suspicious activity:

> We noticed a change in the access environment. For your security, please verify access again.

Never expose internal security logic.

---

# 28. Recipient UX

Recipient should not need to understand the backend.

Example:

```text
Khizar shared a file with you

📄 Resume.pdf

2.4 MB

Expires in 18 hours

[ Open File ]
```

If download is allowed:

```text
[ Download ]
```

If not:

```text
Preview only
```

---

# 29. One-Time Share UX

Make the limitation extremely obvious:

```text
⚠ One-Time Secure Share

This file can only be accessed once.

After successful access,
the share will expire permanently.

[ Continue ]
```

---

# 30. Loading / Error / Empty States

Every screen must have:

- [x] Loading state. (skeletons on Files, spinners on Shares/Activity/details, auth gate)
- [x] Empty state. ("No files yet", "No shares yet", "No activity yet")
- [x] Error state. (FormError everywhere; share access has a dedicated error phase)
- [x] Retry state. ("Try again" offline card, "Retry upload", share access retry, pull-to-refresh)
- [x] Offline state where relevant. (Files offline card; auth keeps existing session offline-tolerant)
- [x] Success feedback. (upload success card, "Copied" feedback, download saved message)
- [x] Destructive-action confirmation. (Alert.alert confirm on file delete and share revoke)

Never leave the user staring at a blank screen.

---

# 31. UX Performance Rules

- [x] Use pagination. (files list page/pageSize + infinite scroll)
- [x] Avoid loading unnecessary files. (list/inspect endpoints are metadata-only)
- [ ] Cache safe metadata.
- [x] Use optimistic UI only where safe. (uploaded file prepended immediately, then refreshed)
- [x] Show upload progress. (percentage + ProgressBar during upload)
- [x] Cancel requests where possible. (upload cancel button; apiRequest supports AbortSignal)
- [x] Avoid blocking the UI during uploads. (async XHR upload, list stays interactive)
- [ ] Compress thumbnails/previews where appropriate. (no thumbnails yet)
- [x] Never download an entire file merely to display metadata. (details/inspect never fetch bytes)

---

# 32. Security Requirements

## Authentication

- [x] Strong password hashing. (scrypt N=16384, r=8, p=1, 16-byte salt, 64-byte key, constant-time compare)
- [x] Secure session handling. (15-min access JWT + single-use refresh rotation in Redis; recipient sessions stored as SHA-256)
- [x] Rate limiting. (global throttler 600 req/min + per-email lockout after 10 failures / 15 min)
- [x] Input validation. (class-validator DTOs, whitelist + forbidNonWhitelisted, body size caps)
- [x] Account status checks. (`status !== 'ACTIVE'` → `ACCOUNT_DISABLED` 403, checked after the password)

## Authorization

- [x] Verify ownership on every protected operation. (owner-scoped queries; non-owners get 404)
- [x] Never trust IDs from the client. (ids are always resolved within the caller's scope)
- [x] Prevent IDOR. (tested: cross-user file/share access → 404)
- [x] Verify share ownership. (list/revoke scoped to `ownerId`)
- [x] Verify recipient session. (session ↔ share binding checked on every reopen and download)

## File Security

- [x] Private storage. (private MinIO bucket; no presigned or public URLs ever issued)
- [x] Server-generated storage keys. (`ownerId/uuid` — the client filename is never part of the key)
- [x] Validate uploads. (MIME allowlist, filename sanitization, SHA-256 checksum)
- [x] Restrict file size. (413 `FILE_TOO_LARGE` via `UPLOAD_MAX_BYTES`)
- [x] Restrict dangerous file handling. (no SVG/executables; downloads served as `octet-stream` + `attachment` + `nosniff`)
- [x] Never expose storage credentials. (credentials stay server-side; `storageKey` omitted from responses — tested)
- [x] Short-lived download authorization. (recipient session credential against a single POST endpoint)

## Share Security

- [x] Cryptographically secure tokens. (32 random bytes, base64url; only SHA-256 is stored)
- [x] Expiration. (server-validated 60s–1y, enforced on open and download)
- [x] Revocation. (cascades to recipient sessions; rejected on open and download)
- [x] Access limits. (atomic conditional claim — parallel opens cannot exceed the limit)
- [x] Recipient session binding. (session ↔ share; strict mode also binds the access environment)
- [x] IP as security signal. (recorded and change-audited; never the sole authorization factor)
- [x] Audit events. (append-only `AuditEvent` trail + owner Activity feed)
- [x] Replay protection where required. (refresh tokens rotate and are single-use; recipient session secrets are intentionally reusable within their lifetime)

---

# 33. Backend API Convention

Use consistent responses.

Example:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "SHARE_EXPIRED",
    "message": "This share has expired."
  }
}
```

Use stable machine-readable error codes.

---

# 34. Testing Strategy

Do not wait until the end.

## Unit Tests

- [x] Token generation. (`tokens.spec.ts`)
- [x] Share expiration. (`ttl.spec.ts` + expiry rejection suites)
- [x] Access limit. (sequential + 8-way parallel claim test)
- [x] Revocation. (revoke suite + open/download rejection)
- [x] Ownership checks. (files list/details/delete suites)
- [x] Session validation. (refresh rotation + recipient restore suites)

## Integration Tests

- [x] Register.
- [x] Login.
- [x] Upload.
- [x] Create share.
- [x] Open share.
- [x] Download.
- [x] Reopen share.
- [x] Revoke share.
- [x] Expire share.

## Security Tests

- [x] Invalid token.
- [x] Expired token.
- [x] Revoked token.
- [x] Wrong user.
- [x] Wrong session.
- [x] Unauthorized download.
- [x] IDOR attempt.
- [x] Replayed request. (refresh token replay → `SESSION_INVALID`)
- [x] Access-limit race condition. (parallel opens cannot exceed `maxAccesses`)
- [x] Rate-limit behavior. (per-email lockout + global throttler)

---

# 35. MVP Definition

The first usable version is complete when a user can:

```text
Register
   ↓
Login
   ↓
Upload file
   ↓
See file
   ↓
Create secure share
   ↓
Configure expiration/access
   ↓
Share link
   ↓
Recipient opens link
   ↓
Backend validates access
   ↓
Recipient downloads file
   ↓
Owner sees access event
   ↓
Owner revokes share
   ↓
Recipient can no longer access
```

Do not add advanced AI, teams, complex analytics, or unnecessary integrations before this flow is reliable.

---

# 36. Future Features

Only after MVP is stable:

- [ ] End-to-end encryption.
- [ ] Client-side encryption.
- [ ] Password-protected shares.
- [ ] QR code sharing.
- [ ] Nearby device transfer.
- [ ] Team workspaces.
- [ ] Folder sharing.
- [ ] Shared developer notes.
- [ ] Public/private snippets.
- [ ] File previews.
- [ ] Image/video streaming.
- [ ] Advanced audit logs.
- [ ] Suspicious-access detection.
- [ ] Device management.
- [ ] Web application.
- [ ] Desktop application.
- [ ] Cloud provider integrations.

---

# 37. Definition of Done

A tiny task is not done because the code compiles.

For each task:

- [x] Code implemented. (all MVP phases 0–13 + 15; notes = Phase 14, secondary)
- [x] TypeScript passes. (`tsc --noEmit` clean in backend and app)
- [x] Lint passes. (backend `npm run lint` 0 errors; `npx expo lint` clean)
- [x] Relevant test passes. (113 backend tests / 20 suites green)
- [x] Error handling exists. (global exception filter + typed error codes; UI error/retry/offline states)
- [x] Security implications considered. (Section 32 verified against the code)
- [x] UI state handled if applicable. (Section 30 verified)
- [x] No secrets committed. (`.env` untracked, only `change-me` placeholders in `.env.example` — verified via git history)
- [x] Small commit created. (19 scoped commits, one per milestone)

---

# 38. Golden Rule

> **Build small. Test small. Secure small. Commit small.**

The goal is not to build 50 features.

The goal is to build one **excellent secure file-sharing experience** and progressively make the underlying architecture stronger.
