# Phase 11 — Secure Backend Foundation (scaffold)

This is a **separate, deny-by-default backend scaffold** for PlayGo Finances. It does not overwrite your React project and does not connect to NMB.

## Run (Node.js 20+)
```powershell
cd "C:\Users\Mbaza\Documents\playgo-finances"
# Extract ZIP into a folder named phase11-foundation
node .\phase11-foundation\server\index.mjs
```
Visit `http://127.0.0.1:8787/health` or `http://127.0.0.1:8787/api/capabilities`.
Try `http://127.0.0.1:8787/api/payments` — it must respond with HTTP 423 and REAL_PAYMENTS_DISABLED.

The `sql/001_foundation.sql` file is a schema proposal for an isolated development PostgreSQL instance; **do not apply it blindly to an existing database**, as it revokes public schema table privileges.

**Not production-ready.** Existing frontend localStorage demo authentication and payment simulations are unchanged. No NMB API credentials, real OTP, or live payment processing are included.
