# SecureDrop

Mobile-first secure file sharing. Security first, then reliability, then UX.

## Structure

```text
securedrop/
├── backend/   NestJS + PostgreSQL + Redis + private object storage
├── app/       Expo + React Native + TypeScript
├── docs/      Local development documentation
└── SecureDrop_Application_Plan.md
```

## Core rule

The client never decides access. The backend validates tokens, expiration,
revocation, access limits, ownership and recipient sessions on every request.

## Getting started

See `docs/` for local setup. Secrets live in `.env` files and are never committed.

## Development rules

- Build small. Test small. Secure small. Commit small.
- Do not weaken security to make a feature easier.
- Never expose storage credentials or permanent private storage URLs.
