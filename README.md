# FormMaker

A self-hosted form builder with one admin. Build a form, publish it at `/forms/<slug>`, collect anonymous responses (including file uploads), then review them or export a CSV. The interface is in Turkish.

Built with Next.js 16, React 19, Prisma 6 and PostgreSQL.

## Run it locally

You need Node 22 or newer, pnpm and Docker.

```bash
pnpm install
cp .env.example .env.local
docker compose -f docker-compose.dev.yml up -d
```

Set `DATABASE_URL` and `DIRECT_URL` in `.env.local` to the local database, and leave the Supabase values empty so uploads stay on disk:

```
postgresql://formmaker:formmaker_dev@127.0.0.1:5433/formmaker
```

The Prisma CLI reads only `.env`, so pass the same URL to it when you create the tables and, if you want, a sample form:

```bash
DATABASE_URL="<local url>" DIRECT_URL="<local url>" npx prisma migrate deploy
DATABASE_URL="<local url>" DIRECT_URL="<local url>" npx prisma db seed
```

Then start the app:

```bash
pnpm dev
```

Sign in at http://localhost:3000/login. Outside production the login is `admin` / `admin123` unless you set `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions runs these on every pull request and on pushes to `main`.

## Deploy with Docker

Copy `.env.example` to `.env` and fill in the production section. The server refuses to start if `AUTH_SECRET` or `ADMIN_PASSWORD` is missing or a known default.

```bash
docker compose up -d --build
```

This starts PostgreSQL and the app, applies migrations at startup, and keeps uploads on a Docker volume. The app listens on `127.0.0.1:3000`, so put a reverse proxy in front of it:

- **The server already has a web server** (for example DirectAdmin): proxy a subdomain to `127.0.0.1:3000`, forward `X-Forwarded-Proto` and `X-Forwarded-For`, and set `COOKIE_SECURE=true`.
- **Nothing else uses ports 80 and 443:** `docker compose --profile caddy up -d --build` adds Caddy, which handles HTTPS. Set `DOMAIN_NAME` first.

`/api/health` reports whether the app can reach its database, and the Docker healthcheck uses it.

`scripts/backup.sh` backs up the database and uploaded files; the script's comments explain how to schedule and restore it. Copy backups off the server too.

## License

See [LICENSE](LICENSE).
