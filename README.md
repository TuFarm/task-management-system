# Task Manager System

A full-stack task management system for student team projects: a Kanban board with
roles, search/filter, a charts dashboard, file attachments, comments, CSV export, and
JWT-secured APIs.

- **Backend** — Spring Boot 3.5.6 · Java 17 · MySQL · Spring Security (JWT) · Spring Data JPA · Flyway · Lombok
- **Frontend** — React 19 · TypeScript · Vite · React Router · Chart.js

---

## Features

- 🔐 **JWT authentication** — real tokens (HS256), stateless API, all `/api/v1/**` secured
- 👥 **3 roles** — `ADMIN`, `GROUP_LEADER`, `MEMBER` with permissions enforced at the API
- 🔎 **Search / filter / pagination** — dynamic `Specification` query with 8+ filters
- 📊 **Dashboard** — doughnut + bar charts, metric cards, per-member completion (real data)
- 📎 **Attachments** — upload/list/download/delete (jpg, png, pdf, docx, xlsx; max 10MB)
- 💬 **Comments** — list/create/delete (author or ADMIN)
- 📤 **CSV export** — export filtered tasks (Apache Commons CSV)
- 🗄️ **Zero manual DB setup** — Flyway creates the schema and seeds 100+ records on startup
- 📚 **OpenAPI / Swagger UI** at `/swagger-ui.html`

---

## Prerequisites

- **Java 17+** and **Maven** (or use the included setup)
- **Node.js 20+** and **npm**
- **MySQL 8** running locally — *or* **Docker** (recommended, bundles MySQL)

---

## Two ways to run

### Option A — Docker Compose (recommended)

From the repository root (the folder containing `docker-compose.yml`):

```bash
cp .env.example .env      # edit values if you like
docker compose up --build
```

| Service  | URL                              |
|----------|----------------------------------|
| Frontend | http://localhost:5173            |
| Backend  | http://localhost:8080            |
| Swagger  | http://localhost:8080/swagger-ui.html |
| MySQL    | localhost:3306 (db `task_manager_db`) |

Flyway runs migrations and seeds data automatically on first start.

### Option B — Manual

**1. Backend**

```bash
cd task-manager-system-main/task-manager-system-main/task-manager
# Provide credentials via environment variables (or rely on the defaults in application.yml).
# PowerShell example:
#   $env:DB_USERNAME="root"; $env:DB_PASSWORD="yourpassword"; $env:JWT_SECRET="...32+ chars..."
mvn spring-boot:run
```

The backend connects to MySQL using `createDatabaseIfNotExist=true`, so you only need a
running MySQL server and valid credentials — **no manual schema or table creation**.
Flyway creates everything and seeds 100+ records.

**2. Frontend**

```bash
cd TaskManager_FE-main/TaskManager_FE-main
npm install
npm run dev
```

The app runs at http://localhost:5173 and talks to the backend at
`VITE_API_BASE_URL` (defaults to `http://localhost:8080`).

---

## Environment variables

| Variable        | Default                                   | Description                          |
|-----------------|-------------------------------------------|--------------------------------------|
| `DB_URL`        | `jdbc:mysql://localhost:3306/task_manager_db?...createDatabaseIfNotExist=true` | JDBC URL |
| `DB_USERNAME`   | `root`                                     | MySQL username                       |
| `DB_PASSWORD`   | *(empty)*                                  | MySQL password                       |
| `JWT_SECRET`    | dev placeholder                            | HS256 secret (use 32+ chars in prod) |
| `JWT_EXPIRATION`| `86400000`                                 | Token lifetime (ms, 24h)             |
| `FRONTEND_URL`  | `http://localhost:5173`                    | Allowed CORS origin(s), comma-sep    |
| `UPLOAD_DIR`    | `./uploads`                                | Where attachments are stored         |
| `SERVER_PORT`   | `8080`                                      | Backend port                         |
| `VITE_API_BASE_URL` | `http://localhost:8080`                | Backend base URL (frontend build)    |

Copy `.env.example` → `.env` and fill in your values. `.env` is git-ignored.

---

## Test accounts

All seeded accounts use the password **`Password123`**.

| Username      | Role          |
|---------------|---------------|
| `admin`       | ADMIN         |
| `admin_linh`  | ADMIN         |
| `leader_an`   | GROUP_LEADER  |
| `leader_binh` | GROUP_LEADER  |
| `member_hoa`  | MEMBER        |
| `member_khanh`| MEMBER        |

(14 users total: 2 admins, 4 group leaders, 8 members.)

---

## API documentation

Interactive Swagger UI: **http://localhost:8080/swagger-ui.html**
OpenAPI JSON: **http://localhost:8080/v3/api-docs**

All endpoints are under `/api/v1`. Click **Authorize** in Swagger and paste a JWT
(`Bearer` is added automatically) obtained from `POST /api/v1/auth/login`.

---

## Project structure

```
.
├── docker-compose.yml
├── .env.example
├── task-manager-system-main/.../task-manager/   # Spring Boot backend
│   ├── src/main/java/com/taskmanagement/
│   │   ├── config/        # JWT, security, CORS, OpenAPI
│   │   ├── controller/    # REST controllers (/api/v1/**)
│   │   ├── service/       # business logic
│   │   ├── repository/    # Spring Data JPA repos
│   │   ├── entity/        # JPA entities
│   │   ├── dto/           # request/response DTOs
│   │   ├── spec/          # JPA Specifications (dynamic search)
│   │   └── exception/     # global error handling
│   ├── src/main/resources/db/migration/   # Flyway V1 schema + V2 seed
│   └── Dockerfile
└── TaskManager_FE-main/.../                  # React frontend
    ├── src/context/       # AuthContext (JWT in memory)
    ├── src/utils/api.ts   # fetch interceptor + API helpers
    ├── src/components/    # UI: toast, spinner, dialogs, ProtectedRoute
    ├── src/page/          # dashboard, tasks, task detail, team, trash, profile
    └── Dockerfile
```

---

## Screenshots

_TODO: add screenshots of the dashboard, Kanban board, and task detail._

## Live demo

_TODO_

---

## Known limitations

- The JWT is held **in memory** (mirrored to `sessionStorage`), so a hard browser
  refresh requires logging in again. This is intentional — the token is never stored
  in `localStorage`. A refresh-token flow could be added later.
- Attachments are stored on the local filesystem (`UPLOAD_DIR`), not on cloud storage.
- The Kanban board filters/paginates client-side; the backend `/api/v1/tasks/search`
  endpoint provides full server-side pagination and is used for CSV export.
- Login rate limiting is a simple in-memory sliding window (per instance), suitable for
  a single-node deployment.
