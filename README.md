# PlayGo Finances Tanzania

Student-focused finance UI for Tanzania. The current release contains a browser-only demo mode and an opt-in Supabase Auth integration. **No live banking or payment execution is enabled.**

## Development

```bash
npm ci
npm run build
npm run dev
```

Copy `.env.example` to `.env.local`, configure a Supabase publishable/legacy anon key and select secure mode with `VITE_PLAYGO_AUTH_MODE=supabase`. Do **not** commit `.env.local`, keys with elevated privileges or student personal data.

## Modes

- **Demo (default):** Browser-only simulated wallet flows; fictitious data only. Demo PINs in browser storage are not suitable for production.
- **Supabase Auth:** Email/password authentication, protected student dashboard, and read-only profiles, enrollments, and published installments. Payment execution is disabled.

## Structure

- `src/App.tsx`, `src/Wallet.tsx`, `src/Merchant.tsx`, `src/Services.tsx`: demo features
- `src/SecureApp.tsx`: Supabase-authenticated student interface
- `phase11-foundation/`: backend security reference scaffold; SQL here is illustrative and **not** the schema installed on Supabase.

## Safety

Proposed banking partner: NMB Tanzania, subject to agreement and regulatory approval. This repository contains **no NMB integration credentials or live payment connectors**. Do not use the simulated balance or OTP as proof of financial settlement.
