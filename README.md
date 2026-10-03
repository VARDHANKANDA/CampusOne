# Campus One

Campus One is a unified smart campus operations and infrastructure management platform that digitizes classroom booking, lab reservations, hostel maintenance, QR attendance, equipment inventory, and campus events across five role-specific dashboards.

## Features

- **Classroom & Space Booking**: Real-time availability search, conflict prevention with database exclusion constraints, and admin approval workflows.
- **Specialized Lab Reservations**: Workstation and seat reservations with automated waitlist promotion upon cancellation.
- **Hostel Maintenance & SLA Tracking**: Complete complaint lifecycle (submission, warden assignment, technician progress, resolution photos, and student verification) with automated SLA escalations.
- **Dynamic QR Attendance**: Time-expiring QR session generation for faculty and rapid camera scanning for students with anti-proxy validation.
- **Equipment Inventory**: Asset checkout requests, return verification, and condition tracking.
- **Campus Events & RSVPs**: Venue scheduling, conflict-free calendars, and attendee RSVP management.
- **Lost & Found Registry**: Public catalog with photo uploads, claim verification, and resolved status matching.
- **Analytics, Audit & Governance**: Real-time room utilization charts, complaint breakdown reports, and immutable audit logs.
- **Role-Based Access Control**: Tailored workflows for Students, Faculty, Hostel Wardens, Maintenance Staff, and Administrators.

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query, React Router 7, Chart.js |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic, Uvicorn |
| **Database & Auth** | PostgreSQL 16 (with `btree_gist`), Supabase Auth & Realtime |
| **Testing & Tooling** | Vitest, Testing Library, Pytest, Ruff, Mypy, Docker & Docker Compose |

## Run Locally

### 1. Prerequisites
- Node.js 20+
- Python 3.12+
- PostgreSQL 16 (or Docker)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the application.

## Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
JWT_SECRET=your-supabase-jwt-secret
DATABASE_URL=postgresql+psycopg://campus:campus@localhost:5432/smart_campus
ALLOWED_CORS_ORIGINS=http://localhost:5173
ENV=local
```

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Deploy

The recommended deployment method is **Docker Compose** with a managed PostgreSQL / Supabase database.

1. **Configure Environment Variables**
   Create production `.env` files for backend and frontend with your production domain and credentials:
   - In `backend/.env`: set `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `ALLOWED_CORS_ORIGINS=https://your-domain.com`, and `ENV=production`.
   - In `frontend/.env`: set `VITE_API_BASE_URL=https://api.your-domain.com/api/v1`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

2. **Apply Migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

3. **Build and Start Containers**
   ```bash
   docker compose up -d --build
   ```

4. **Verify Deployment Health**
   ```bash
   curl https://api.your-domain.com/health
   # Returns: {"status":"ok"}
   ```

## Project Structure

```text
CampusOne/
├── backend/
│   ├── app/
│   │   ├── core/          # Database, security, JWT auth, Supabase client, logging
│   │   ├── models/        # SQLAlchemy models (users, bookings, complaints, events, etc.)
│   │   ├── services/      # Modular business logic and API routers
│   │   └── main.py        # FastAPI application and CORS setup
│   ├── migrations/        # Alembic database migrations
│   └── tests/             # Unit and integration test suites
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI elements, AppShell layout, command palette
│   │   ├── core/          # Auth context, API client, theme context, Supabase client
│   │   ├── features/      # Feature modules (admin, bookings, complaints, events, etc.)
│   │   └── routes/        # App routing and role-based navigation definitions
│   └── nginx.conf         # Production Nginx SPA configuration
├── docker-compose.yml     # Multi-container orchestration
└── README.md              # Project documentation
```

## License

This project is licensed under the [MIT License](LICENSE).
