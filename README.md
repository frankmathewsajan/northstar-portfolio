# Northstar Portfolio

A minimal multi-tenant investment-tracking application built with Node.js/Express, PostgreSQL, and React + TypeScript using pnpm.

Assignment requirements, specs, and sample CSVs are stored in the [`assignment/`](assignment/) folder.

## Quick Start

### Option 1: Docker Compose (Recommended)

Starts PostgreSQL and the backend API with one command:

```bash
docker compose up --build -d
```

In a separate terminal, start the frontend:

```bash
pnpm --filter northstar-frontend dev
```

Open your browser at `http://localhost:5173`.

---

### Option 2: Local Setup with pnpm (with existing PostgreSQL)

1. Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE northstar;
```

2. Install all workspace dependencies:
```bash
pnpm install
```

3. Start backend and frontend:
```bash
# Terminal 1 - Backend
pnpm --filter northstar-backend dev

# Terminal 2 - Frontend
pnpm --filter northstar-frontend dev
```

---

## Seed Credentials

Seeded automatically on database startup:

| Tenant | Email | Password | Role / Tenant ID |
|---|---|---|---|
| Alpha Capital | `tenant_a@example.com` | `Password123!` | Tenant 1 |
| Beacon Advisors | `tenant_b@example.com` | `Password123!` | Tenant 2 |

Password hashes are generated using bcrypt (10 rounds). Quick-login buttons are provided on the login page for testing.

---

## Verification & Key Flows

### 1. Happy Path
- Log in as `tenant_a@example.com`.
- Upload `assignment/sample_good.csv`.
- Confirm dashboard metrics:
  - Total Market Value (as of 2026-06-30): `$96,400.00`
  - Starting Market Value (as of 2026-01-01): `$92,600.00`
  - Period Return: `+4.10%`
  - Breakdown by Asset Class: Equity ($55,850.00 / 57.94%), Bond ($35,550.00 / 36.88%), Cash ($5,000.00 / 5.19%).

### 2. Dirty CSV Handling
- Upload `assignment/sample_dirty.csv`.
- The upload is rejected with `400 Bad Request`.
- The UI displays: `Line 20: Duplicate holding entry for ticker 'AAPL' on date '2026-06-30'`.
- Existing portfolio numbers remain unaffected.

### 3. Tenant Isolation
- Log in as `tenant_b@example.com`.
- Confirm Tenant B dashboard has zero access to Tenant A's uploaded holdings.
- Click "Test Tenant Isolation" in the header (or request `GET /api/portfolio/tenant/1` with Tenant B token):
  - Expected: `403 Forbidden` (`Access denied: tenant isolation policy enforced`).
- All portfolio queries strictly enforce `WHERE tenant_id = $1` using the verified JWT payload.

---

## Assumptions Made

1. **Latest Date Snapshot for Asset Breakdown**: Total market value and asset class distribution reflect holdings as of the latest recorded date (`2026-06-30`).
2. **Period Return Formula**:
   ```
   period_return = (end_market_value - start_market_value) / start_market_value
   ```
   where start value is the sum of holdings at the earliest date and end value is the sum of holdings at the latest date.
3. **Duplicate Prevention**: A single tenant cannot have duplicate records for the same ticker on the exact same date. Duplicate rows within a CSV or against the database are rejected to prevent value inflation.

---

## What I Would Do Differently With More Time

1. **Streaming CSV Processing**: For massive CSV uploads (>100,000 rows), use streams with chunked database inserts rather than in-memory parsing.
2. **Portfolio History & Multi-date Filtering**: Add interactive date range pickers and historical time-series performance charts.
3. **Automated End-to-End Test Suite**: Add Playwright integration tests covering login, upload, validation errors, and cross-tenant boundary verification.
