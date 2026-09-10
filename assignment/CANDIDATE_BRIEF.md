# Northstar Portfolio — Take-Home Exercise (Junior Full-Stack)

## Welcome

We're looking for a junior full-stack developer who's comfortable touching a bit of everything — a simple UI, a small API, some SQL, and basic Docker/deploy concepts. You won't be expected to be an expert in all of these yet. We care much more about how you think, how you handle the parts you're unsure of, and whether your code is clear and correct, than about polish.

This exercise is a **simplified, fictional** version of the kind of work you'd do here: a small internal tool that lets a user upload a CSV of investment holdings and see some basic numbers on a dashboard.

## Time expectation

- Budget **5–6 hours**, spread over a few days if you like. There's no stopwatch — we're not timing you to the minute.
- "Done" means: it runs from the README, the required features work on the happy path, and you've been honest in the README about anything you skipped or would do differently with more time.
- It's completely fine to leave TODOs or a "if I had more time, I would..." section. We'd rather see a clean, smaller solution than a rushed, broken big one.
- You're welcome to use documentation, Stack Overflow, or AI coding assistants — just make sure you understand the code you submit, since we'll ask you to walk through it.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (via Docker Compose)
- No AWS account, no real cloud deploy needed — everything runs on your laptop.

## The story: "Northstar Portfolio"

Northstar is a small, fictional investment-tracking tool. Each client ("tenant") logs in and can see only their own holdings. A client can upload a CSV of their holdings and see:
1. Total market value broken down by asset class
2. A simple return percentage over the period covered by the data

## What you're building

### Must have
- **Login** for 2 seeded users, each belonging to a different tenant (company). Simple email + password is fine — a JWT or session cookie, your choice.
- **CSV upload** of holdings for the logged-in user's own tenant only (a sample file is provided).
- **Basic validation** of the CSV: reject or flag bad rows (missing field, bad date, duplicate row) with a clear error message — don't let bad data silently corrupt the numbers.
- **Backend endpoint(s)** that compute, from the stored holdings:
  - Total market value grouped by asset class
  - A period return, using this simple formula (documented so you don't have to guess):
    ```
    period_return = (end_market_value - start_market_value) / start_market_value
    ```
    (Start value = holdings as of the earliest date in the file; end value = holdings as of the latest date.)
- **Dashboard page** showing:
  - A table of market value by asset class
  - One chart (bar or pie is fine) of the same data
  - The period return shown somewhere visible
- **Tenant isolation:** User from Tenant A must never be able to see Tenant B's data, even by guessing IDs in the URL.
- **Docker Compose** that starts at least Postgres + your API with one command.

### Should have
- Loading / error / empty states in the UI (e.g., "no data yet", "upload failed", spinner while loading).
- A short migration file or SQL script to set up tables, rather than manual `psql` steps.

### Nice to have (do not spend extra time here if short on time)
- A filter control on the dashboard (e.g., by asset class or date range).
- Basic automated tests (even one or two).
- Client served via Nginx instead of just `vite dev` (either is fine — tell us which you picked and why).

## Explicitly out of scope

Please don't spend time on: SSO/OAuth, password reset flows, Redis/caching, Kubernetes, real AWS deployment, pixel-perfect design, or animations. A clean, plain Tailwind admin-style UI is exactly right — no need for anything fancy.

## What's provided

- `sample_good.csv` — a clean holdings file for one tenant.
- `sample_dirty.csv` — the same idea, but with one deliberate data-quality problem (a bad date, a missing field, or a duplicate row — we won't tell you which, that's part of the exercise).
- Seed users/tenants (see `STARTER_KIT.md` if you received the scaffolding version).

## Submission

- A GitHub repo (private, invite `hiring@northstar.example`) or a zip file.
- A `README.md` with:
  - How to run everything locally (commands, not prose)
  - Any assumptions you made
  - What you'd do differently with more time
  - (Optional) a screenshot or two

## A note on how we'll use this

We'll review your code, run it from your README, and then do a friendly 45-minute call where we look at your code together and ask you to make a couple of small changes live. This isn't a gotcha — it's the best way for us to see how you actually work, since that's most of the job.

Good luck, and don't stress about the parts you're less confident in — just be upfront about them.
