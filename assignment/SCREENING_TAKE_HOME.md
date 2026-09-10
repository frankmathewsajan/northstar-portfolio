# Northstar Portfolio — Screening Take-Home (2-Day Window)

## Purpose

This is the **screening-stage** exercise — sent early in the pipeline, before any live interview, to filter for candidates who can move across a small full-stack slice (UI → API → SQL → basic Docker). Keep it lean: the goal is a fast, fair pass/fail signal, not a deep evaluation. Save the bigger case study or live pairing sessions for candidates who clear this stage.

## Framing for the candidate

> This is a screening exercise, not a final assessment — it helps us decide who to bring in for a live conversation. You have **2 calendar days** from receipt to submit, so you can fit it around other commitments (a job, other interviews, etc.). The actual hands-on effort should be roughly **4–6 hours**; you do not need to use the full 2 days working, just submit within that window.

## Time & scope

- **Window to submit: 2 calendar days** from when you send it.
- **Expected effort: 4–6 hours.** State this explicitly so candidates don't over-invest — over-scoping under a screening exercise is a mild yellow flag in itself, not a virtue.
- If a candidate needs a short extension (illness, work conflict), granting one is fine and not held against them — flag this in your own tracking so scoring stays consistent.
- Late-with-no-communication submissions can be scored down slightly for communication, but should still be reviewed if they arrive within a reasonable grace period (e.g., same day late).

## Stack

React + TypeScript + Vite + Tailwind (frontend) · Node.js + Express (backend) · PostgreSQL via Docker Compose (database). No AWS account or paid services needed.

## The story

Same fictional "Northstar Portfolio" scenario as before: a small investment-tracking tool where each client ("tenant") logs in and sees only their own holdings.

## What to build (kept intentionally lean for a screening exercise)

### Must have
1. **Login** for 2 seeded users, each in a different tenant.
2. **CSV upload** of holdings for the logged-in user's own tenant only.
3. **Basic validation**: the provided dirty CSV has one planted issue (bad date, missing field, or duplicate row) — reject or flag it with a clear message; don't let it silently corrupt the numbers.
4. **One computed view**: total market value grouped by asset class, plus the period return using this formula:
   ```
   period_return = (end_market_value - start_market_value) / start_market_value
   ```
5. **Dashboard**: a table + one chart showing the above.
6. **Tenant isolation**: Tenant A must never be able to see Tenant B's data, even via a crafted request.
7. **Docker Compose**: Postgres + API startable with one command.

### Explicitly not required at this stage
Filters, transaction history, automated tests, CI files, Nginx, polished design, loading-state animations. If a candidate adds these anyway, it's a nice bonus signal but should not be expected or scored heavily — over-building on a screening exercise is not automatically a positive.

### Explicitly out of scope
SSO, password reset, Redis, Kubernetes, real cloud deployment, pixel-perfect UI.

## Provided materials

- `sample_good.csv`
- `sample_dirty.csv` (one deliberate issue, undisclosed to the candidate)
- Seeded tenant/user credentials (see `STARTER_KIT.md`)

## Submission

- GitHub repo (preferred) or zip, submitted within the 2-day window.
- A short README: run steps, any assumptions, and (optional but appreciated) what you'd add with more time.

## How this is used in the pipeline

1. Candidate clears resume screen →
2. **This take-home is sent** (2-day window) →
3. Score against a **lean pass/fail checklist** (below) — this stage is about filtering, not fine-grained ranking →
4. Candidates who pass move to a live 45-minute pairing session (`LIVE_INTERVIEW_SCRIPTS.md`, E1) →
5. Only candidates who reach a later round get the bigger multi-day case study, if you choose to use one.

## Lean screening checklist (pass/fail, not the full 100-point rubric)

Use this instead of the full `RUBRIC.md` at the screening stage — it's faster to apply consistently across many candidates.

| Check | Pass criteria |
|---|---|
| Runs from README | A grader can get it running in under 15 minutes |
| Happy path works | Login → upload `sample_good.csv` → correct numbers on dashboard |
| Tenant isolation | Server-side enforced; a manual cross-tenant request fails |
| Dirty CSV handled | No uncaught crash; some indication something was wrong |
| No obvious security red flag | No string-concatenated SQL with user input; no secrets committed |

**Pass** = all five checks pass → advance to live interview.
**Borderline** = 1 minor miss (e.g., dirty CSV handling is rough but present) → advance, flag the gap for the interviewer to probe in E1.
**Fail** = any automatic-fail condition from `RUBRIC.md` (tenant leak, committed secrets, SQL injection, can't run at all) → do not advance, but consider a short, kind rejection note pointing out the specific issue if you want to leave the door open for a future round.

Full-precision scoring (the 100-point weighted rubric) is unnecessary at this stage — it's designed for later, higher-stakes rounds where you're comparing finalists closely.
