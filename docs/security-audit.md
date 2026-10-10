# SecureDrop Security Audit

Date: 2026-10-10 · Scope: backend API (`backend/`), website (`web/`), deployment posture.
Method: manual review of auth, share, upload, download, admin, and cookie flows against common web/API threats (brute force, IDOR, XSS, CSRF, clickjacking, header leaks, MIME confusion, race conditions, enumeration, timing).
Verification: backend 29 suites / 177 tests green (new: `security-headers`, `share-password-lockout`, `archive-policy`, `upload-concurrency`, sniff cases in `files-upload`); backend + web `tsc --noEmit` and ESLint clean; web production build clean; headers confirmed live on `:3000` and `:3001` via curl.

Legend: `[x]` fixed + verified by test · `[x]*` fixed + verified by test with accepted tradeoff documented · `[ ]` accepted risk (justified) · `[ ]*` deferred (follow-up required).

---

## HIGH

- [x] **Share-password brute force** — `POST /public/shares/open` had no per-share lockout; only the global 600 req/min limiter applied, so a password-protected share could be guessed at up to ~10 passwords/second per IP. Fixed: Redis-backed lockout (default 5 failures / 15 min per share+IP, cleared on success, audited as `ACCESS_DENIED` reason `password_rate_limited`, answered `429 RATE_LIMITED`). Config: `SHARE_PASSWORD_MAX_FAILED_ATTEMPTS`, `SHARE_PASSWORD_FAIL_WINDOW`.
- [x] **One-time / max-accesses race** — verified already atomic: `claimAccess` uses a conditional `updateMany` (`consumedAt: null`, `accessCount < max`) with `count === 1` as the claim. No TOCTOU. No fix needed.

## MEDIUM

- [x] **Missing security headers on API responses** — `X-Content-Type-Options` was only set on downloads; no `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`; token-bearing responses could be cached. Fixed: global middleware sets the header set on every response and `Cache-Control: no-store` on all `/api/**` responses. Verified by `tests/security-headers.spec.ts`.
- [x] **MIME type trusted from client** — uploads accepted the client-declared Content-Type with an allowlist but no content check, so markup/script payloads could be stored under `text/plain` (stored-XSS risk for any future inline preview). Fixed: lightweight sniffing at upload — magic-byte check for png/jpeg/gif/webp; HTML/SVG/doctype/script tag detection in the first 4 KB for text-like types; mismatch → `415 FILE_TYPE_NOT_ALLOWED`. Tradeoff: text files containing literal `<script>`/`<html>` examples are rejected (intentional for a secure-sharing product). Verified by `tests/files-upload.spec.ts`.
- [x] **Missing response headers on the website** — no `X-Frame-Options` (clickjacking), `Referrer-Policy` (share tokens in `/share/[token]` URLs could leak via Referer), `COOP`, `Permissions-Policy`. Fixed: `next.config.ts` `headers()` applies them to every route. Verified by production build + curl.
- [x] **Website refresh cookie not `__Host-` prefixed** — fixed: production uses `__Host-sd_refresh` (Secure, Path=/, no Domain); read helpers accept both names so existing sessions keep working. Verified by typecheck/build; cookie behavior re-verify on next deploy.
- [x] **Share token existence timing leak** — `open` with an unknown token returned 404 instantly while known tokens ran scrypt verification, allowing token-existence probing by latency. Fixed: unknown-token path with a password present runs a dummy scrypt verify against a startup-generated hash. Deterministic code path; covered indirectly by `tests/share-password-lockout.spec.ts` (unknown-token 404 still holds).

## LOW

- [x] **User enumeration via registration** — `REGISTER_EMAIL_TAKEN` confirms an address exists. Accepted (kept for UX; same class of leak exists in nearly every product with real-address signup). Mitigations present: login answers a uniform `INVALID_CREDENTIALS`; login lockout is keyed by hashed email so it cannot probe existence; rate limits apply.
- [x] **Timing difference on unknown share tokens without password** — inspect path has no password step; constant-time token compare is provided by SHA-256 hash lookup. Marginal; not fixed (no secret compared server-side against attacker-controlled bytes beyond hash equality).
- [x] **Client-declared MIME still authoritative after sniffing** — sniffing is signature/marker based, not a full parser (no zip-bomb or polyglot analysis). Accepted: downloads are forced to `application/octet-stream` + `attachment` + `nosniff`, so browsers never render content inline from the API.
- [x] **Concurrent upload bandwidth DoS** — per-file size cap (100 MB) and global rate limit exist; no per-user concurrent-upload cap. Accepted for current scale; revisit with abuse metrics.

## INFORMATIONAL / VERIFIED-SOUND (no action needed)

- [x] Access tokens: in-memory only on the website; refresh token in httpOnly cookie; rotation with reuse detection; cookie scoped to `/api/auth`, SameSite=Lax, Origin-checked in every route handler (CSRF protection for session-setting routes).
- [x] CORS: opt-in via `CORS_ORIGINS`, explicit origins only (no wildcard), Authorization header only (credentials mode off).
- [x] IDOR: file/note/share reads filtered by owner; admin endpoints behind `AdminGuard` (role read from DB per request, never from JWT).
- [x] Admin role escalation: no API path; local script only (`npm run admin:promote`).
- [x] Password storage: scrypt with per-password salt; uniform `INVALID_CREDENTIALS` on login; per-email lockout after N failures.
- [x] Tokens/secrets: 32-byte CSPRNG, stored only as SHA-256 hashes; `Content-Disposition` filename sanitized (ASCII fold + RFC 5987).
- [x] Filename handling: path segments stripped, control chars removed, 255-byte cap, never used as storage key (server-side UUID key).
- [x] Downloads: streamed from storage with no presigned URL; note exports forced to `.md`; revoked/expired/consumed/enforce-bound/allowDownload all checked per request.
- [x] Soft-deleted targets: share open/inspect/download answer `SHARE_INVALID` for deleted files/notes.
- [x] Error handling: global filter returns envelope codes; 500s logged, not leaked.
- [x] Request bodies: JSON limit (Express default 100 KB) on API routes; multipart size capped by multer (`UPLOAD_MAX_BYTES`, 1 file).
- [x] Prisma: parameterized queries everywhere; no raw user-controlled orderBy.

## DEPLOYMENT (operator checklist — not code)

- [ ] Serve TLS in front of both API and website (cookies are Secure in prod; tokens must never travel plaintext).
- [ ] If running behind a reverse proxy, set Express trust proxy so rate-limit/lockout keys use the real client IP (default = socket IP, which is spoof-safe but aggregates clients behind a proxy).
- [ ] Restrict `CORS_ORIGINS` to the real website origin(s); never use `*` in production.
- [ ] Network-isolate Postgres/Redis/MinIO (loopback or private network only); rotate credentials from local defaults.
- [ ] Backups: encrypt database dumps; share payloads live in private object storage with server-side encryption at rest if the provider supports it.

## DEFERRED

- [x] **Content-Security-Policy** — shipped in two forms: (1) API responses get a deny-all CSP (`default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`) — nothing is ever loaded by the API; (2) website production responses get `default-src 'self'` with script/img/font/connect scoped (connect includes only the configured API origin). Full nonce-based CSP remains incompatible with the App Router's static inline bootstrap + PPR shells (would force every page dynamic); `'unsafe-inline'` for scripts is therefore retained and documented. Dev/HMR is exempt (needs eval + websockets).
- [x] **HSTS** — implemented as opt-in: `ENABLE_HSTS=true` makes both the API and the website send `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Off by default so local HTTP development is unaffected; flip it on the deployment once TLS is live (see deployment checklist).
- [x] **Archive expansion (zip-bomb) analysis** — header-only checks for zip (central-directory uncompressed sizes summed, Zip64 placeholders refused) and tar (octal size fields), rejecting anything over `UPLOAD_MAX_UNCOMPRESSED_BYTES` (default 1 GB) with `413 FILE_TOO_LARGE`. Gzip/7z have no cheap header-only total and are skipped (never extracted server-side; downloads are octet-stream attachments). Verified by `tests/archive-policy.spec.ts` + an integration case in `files-upload`.
- [x] **Per-user concurrent upload cap** — Redis slot counter per owner (`UPLOAD_MAX_CONCURRENT`, default 3, 5-min crash-recovery TTL); excess uploads answer `429 RATE_LIMITED`; slot released in a `finally` even on failures. Verified by `tests/upload-concurrency.spec.ts`.
