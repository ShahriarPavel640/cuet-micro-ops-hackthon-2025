# CI/CD Documentation

This document covers the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the Delineate project.

---

## 🔄 GitHub Actions CI Pipeline

The CI workflow is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### Workflow Triggers

| Event          | Branches                            |
|----------------|-------------------------------------|
| `push`         | `main`, `master`, `azizul`, `pavel` |
| `pull_request` | `main`                              |

### Pipeline Architecture

The pipeline consists of **3 sequential jobs** with fail-fast behavior:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Quality   │────▶│    Test     │────▶│    Build    │
│    Checks   │     │   (E2E)     │     │   (Docker)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

### 1. Code Quality Job

**Runner:** `ubuntu-24.04`  
**Node.js:** v22 (with `--experimental-transform-types` support)

| Step               | Command                | Description                        |
|--------------------|------------------------|------------------------------------|
| Install Dependencies | `npm ci`             | Clean install with locked versions |
| Run ESLint         | `npm run lint`         | Static code analysis               |
| Check Formatting   | `npm run format:check` | Verify code formatting (Prettier)  |
| Type Check         | `npx tsc --noEmit`     | TypeScript type validation         |

---

### 2. E2E Tests Job

**Depends on:** Quality job (runs only if Quality passes)

| Environment Variable       | Value         |
|----------------------------|---------------|
| `NODE_ENV`                 | `development` |
| `PORT`                     | `3000`        |
| `S3_BUCKET_NAME`           | *(empty)*     |
| `S3_REGION`                | `us-east-1`   |
| `DOWNLOAD_DELAY_ENABLED`   | `false`       |
| `DOWNLOAD_DELAY_MIN_MS`    | `0`           |
| `REQUEST_TIMEOUT_MS`       | `30000`       |
| `RATE_LIMIT_MAX_REQUESTS`  | `100`         |

> **Note:** Tests run without S3/MinIO in CI — `S3_BUCKET_NAME` is intentionally empty.

---

### 3. Build Docker Image Job

**Depends on:** Test job (runs only if E2E tests pass)

| Feature              | Details                            |
|----------------------|-----------------------------------|
| Build Action         | `docker/build-push-action@v6`     |
| Dockerfile           | `docker/Dockerfile.prod`          |
| Image Tag            | `delineate-hackathon-challenge:<commit-sha>` |
| Push to Registry     | Disabled (`push: false`)          |
| Layer Caching        | GitHub Actions cache (`type=gha`) |

---

## 🐳 Docker Compose Configurations

### Development Stack (`docker/compose.dev.yml`)

| Service                  | Port(s)         | Description                        |
|--------------------------|-----------------|-----------------------------------|
| `delineate-app`          | `3000`          | Main backend application          |
| `delineate-frontend`     | `5173`          | React frontend (Vite dev server)  |
| `delineate-jaeger`       | `16686`, `4318` | Distributed tracing UI & collector|
| `delineate-minio`        | `9000`, `9001`  | S3-compatible object storage      |
| `delineate-createbuckets`| -               | Auto-creates `downloads` bucket   |

**Command:**
```bash
docker compose -f docker/compose.dev.yml up --build
```

### Production Stack (`docker/compose.prod.yml`)

Same services as development with:
- `NODE_ENV=production`
- Persistent MinIO volume (`minio_storage`)
- `restart: unless-stopped` policies

**Command:**
```bash
docker compose -f docker/compose.prod.yml up --build -d
```

---

## ☁️ Render.com Deployment

Configuration: [`render.yaml`](render.yaml)

### Deployed Services

| Service              | Type | Plan    | Port | Dockerfile                   |
|----------------------|------|---------|------|------------------------------|
| `micro-ops-backend`  | Web  | Free    | 8000 | `docker/Dockerfile.prod`     |
| `micro-ops-frontend` | Web  | Starter | 80   | `docker/Dockerfile.frontend` |

> **⚠️ Note:** Docker-based frontends require the **Starter plan** (not free tier).

### Health Check

Backend includes a health check endpoint at `/health`.

### Required Environment Variables

Configure these in the Render Dashboard:

**Backend:**
- S3 credentials (Access Key, Secret Key, Bucket Name)
- Sentry DSN
- OpenTelemetry configuration

**Frontend:**
- `VITE_API_URL` — URL of the deployed backend service

---

## 📁 CI/CD File Locations

```
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions workflow
├── docker/
│   ├── compose.dev.yml         # Development Docker Compose
│   ├── compose.prod.yml        # Production Docker Compose  
│   ├── Dockerfile.frontend     # Frontend container definition
│   └── Dockerfile.prod         # Production backend container
└── render.yaml                 # Render.com deployment config
```

---

## 🔗 Related Documentation

- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) — Docker deployment guide
- [render_deployment_guide.md](render_deployment_guide.md) — Detailed Render.com instructions
- [OBSERVABILITY.md](OBSERVABILITY.md) — Observability setup (Jaeger, Sentry)
