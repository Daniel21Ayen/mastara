# Mastara — Local Development Setup

## Prerequisites

| Tool | Min Version | Install |
|---|---|---|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | bundled with Node |
| Docker + Docker Compose | 24.x / v2 | https://docs.docker.com/get-docker |

---

## 1. Clone & Install

```bash
git clone <repo-url> mastara
cd mastara
npm install
```

---

## 2. Environment Variables

```bash
# Root .env (API + worker)
cp .env.example .env
```

Edit `.env` — the defaults work out of the box with Docker Compose:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://mastara:mastara_secure_pass_2026@127.0.0.1:5433/mastara?schema=public` | Port **5433** (compose maps to 5432 inside) |
| `REDIS_URL` | `redis://:mastara_redis_pass_2026@127.0.0.1:6380` | Port **6380** |
| `QUEUE_DRIVER` | `redis` | |
| `STORAGE_DRIVER` | `local` | Use `s3` to use MinIO |
| `STORAGE_LOCAL_DIR` | `./uploads` | |
| `JWT_ACCESS_SECRET` | *(change me)* | Use a random 64-char string |
| `JWT_REFRESH_SECRET` | *(change me)* | Use a different random 64-char string |

```bash
# Admin web
cp apps/admin-web/.env.example apps/admin-web/.env.local
```

---

## 3. Start Infrastructure (Docker)

```bash
# Start PostgreSQL, Redis, and MinIO in the background
docker compose up -d

# Verify all services are healthy
docker compose ps
```

Expected output — all services should show `healthy`:
```
NAME                STATUS           PORTS
mastara-postgres    Up (healthy)     0.0.0.0:5433->5432/tcp
mastara-redis       Up (healthy)     0.0.0.0:6380->6379/tcp
mastara-minio       Up               0.0.0.0:9002->9000/tcp, 0.0.0.0:9003->9001/tcp
```

---

## 4. Database Setup

```bash
# Run Prisma migrations
npx prisma migrate dev --schema packages/database/prisma/schema.prisma

# (Optional) Seed the database
bash infra/scripts/seed.sh
```

---

## 5. Run the Apps

Open separate terminals (or use tmux/a process manager):

```bash
# Terminal 1 — API (NestJS) → http://localhost:4001
npm run dev:api

# Terminal 2 — Admin Web (Next.js) → http://localhost:3001
npm run dev:admin
```

### Useful endpoints

| URL | Description |
|---|---|
| http://localhost:4001/api/v1 | REST API |
| http://localhost:4001/api/docs | Swagger UI |
| http://localhost:3001 | Admin dashboard |
| http://localhost:9003 | MinIO console (admin UI) |

---

## 6. Stop Everything

```bash
docker compose down          # stop containers (keeps volumes)
docker compose down -v       # stop + delete all data volumes
```

---

## Troubleshooting

### Docker permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker   # or log out and back in
```

### Port already in use
The compose file uses non-standard host ports to avoid conflicts:
- PostgreSQL → `5433` (not 5432)
- Redis → `6380` (not 6379)
- MinIO API → `9002`, Console → `9003`

### Prisma client out of date
```bash
npx prisma generate --schema packages/database/prisma/schema.prisma
```
