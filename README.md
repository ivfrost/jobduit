# jobduit

Smart job application tracker.

![CI](https://github.com/ivfrost/jobduit/actions/workflows/ci.yml/badge.svg)

## Stack

- Node 22, TypeScript, Express 5
- Postgres 17 (Prisma 7)
- Redis 7 (sessions)
- Zod for validation
- Vitest + Supertest + Testcontainers

## Development

```bash
npm install
cp .env.example .env
npm run dev
```

`predev` starts Postgres and Redis via Docker Compose. Requires Docker.

## Scripts

| Command                | Description                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Start dev server with watch                 |
| `npm run build`        | Compile to `dist/`                          |
| `npm start`            | Run compiled server                         |
| `npm run typecheck`    | Type-check without emitting                 |
| `npm test`             | Run integration tests (spins up containers) |
| `npm run lint`         | Biome check (lint + format + imports)       |
| `npm run lint:fix`     | Biome check with autofix                    |
| `npm run db:seed`      | Seed the database (dev only)                |
| `npm run admin:create` | Create an admin user and API key            |
| `npm run admin:reset`  | Reset an admin password                     |

## Docs

OpenAPI spec at `/openapi.json`, interactive docs at `/docs`.

## API

| Method   | Path                 | Auth    | Description                        |
| -------- | -------------------- | ------- | ---------------------------------- |
| `GET`    | `/health`            | —       | Health check                       |
| `GET`    | `/docs`              | —       | Swagger UI                         |
| `GET`    | `/openapi.json`      | —       | OpenAPI spec                       |
| `POST`   | `/api/auth/login`    | —       | Log in, sets `sid` cookie          |
| `POST`   | `/api/auth/logout`   | —       | Destroy session (idempotent)       |
| `GET`    | `/api/auth/me`       | session | Current user                       |
| `GET`    | `/api/keys`          | session | List API keys                      |
| `POST`   | `/api/keys`          | session | Create API key (raw returned once) |
| `DELETE` | `/api/keys/:id`      | session | Revoke API key                     |
| `GET`    | `/api/companies`     | any     | List companies                     |
| `POST`   | `/api/companies`     | any     | Create or find company             |
| `GET`    | `/api/companies/:id` | any     | Get company                        |
| `PUT`    | `/api/companies/:id` | any     | Update company                     |
| `DELETE` | `/api/companies/:id` | any     | Delete company                     |
| `GET`    | `/api/postings`      | any     | List job postings                  |
| `POST`   | `/api/postings`      | any     | Create or update job posting       |
| `GET`    | `/api/postings/:id`  | any     | Get job posting                    |
| `PUT`    | `/api/postings/:id`  | any     | Update job posting                 |
| `DELETE` | `/api/postings/:id`  | any     | Delete job posting                 |

**Auth**: `session` = `sid` cookie, `any` = session cookie or API key.

## Auth model

Two mechanisms enforced by `requireAuth`:

- **Session cookie** for the web UI — issued by `POST /api/auth/login`, stored in Redis
- **API key** for the browser extension — issued by `POST /api/keys`, sent as `Authorization: Bearer <key>` (or `X-API-Key: <key>`)

API keys are hashed (SHA-256) before storage; the raw value is only returned once, at creation. Key management routes are session-only — a leaked API key can't mint more keys.

## Roadmap

See [ROADMAP.md](./ROADMAP.md).
