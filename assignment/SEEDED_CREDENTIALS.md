# Seeded Login Credentials — Northstar Portfolio Screening Exercise

Use these two accounts to build and test your app. Seed them into your own `tenants` and `users` tables as part of your migration/setup — you don't need to build a signup flow.

| Email | Password | Tenant |
|---|---|---|
| `tenant_a@example.com` | `Password123!` | Tenant 1 — Alpha Capital |
| `tenant_b@example.com` | `Password123!` | Tenant 2 — Beacon Advisors |

## How to use these

1. Create a `tenants` table with rows for `Alpha Capital` (id 1) and `Beacon Advisors` (id 2).
2. Create a `users` table with the two accounts above, each linked to its tenant. Store the password as a bcrypt hash (don't store plaintext) — you can generate the hash yourself at setup/seed time.
3. Log in as `tenant_a@example.com` and upload `sample_good.csv` — you should only ever see Alpha Capital's data while logged in as this user.
4. To test tenant isolation: while logged in as `tenant_a@example.com`, try to fetch Tenant 2's data directly (e.g. by guessing an ID or tenant param in the URL/request). This should fail cleanly (401/403), not succeed.

No other users need to be created. Sign-up, password reset, and multi-user-per-tenant flows are out of scope for this exercise.
