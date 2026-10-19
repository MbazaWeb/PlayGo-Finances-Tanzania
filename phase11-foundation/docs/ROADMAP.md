# PlayGo Finances — NMB-first secure backend roadmap

## Current Phase 11 deliverable
- Standalone Node.js built-in HTTP API, no npm dependencies.
- Health and capability endpoints.
- Server-side deny-all on payment, transfer, top-up, merchant payment and bank integration paths.
- Draft PostgreSQL schema for institutions, role memberships, academic years, fee installments, enrollments and **disabled** payment intents.
- Database RLS enabled with **no policies**, meaning non-owner application roles have no access by default.

## Not implemented (do not claim security or production readiness)
- Real student authentication, identity verification, institution-admin login, MFA/OTP, password/PIN hashing, secrets management, ledger, bank integration, webhook verification, rate limits, data migration or production deployment.
- The current React browser demo is unchanged and can still simulate balances locally; it is NOT secured by this standalone API.
- The SQL is a foundation, not a complete financial database design. Schema owners can bypass RLS unless FORCE RLS is used, and database owners must be tightly controlled.

## Next milestones
1. **Phase 11B**: server-side authentication and scoped sessions; no real NIDA collection until a lawful verification path exists.
2. **Phase 11C**: tenant authorization with tested institution-scoped RLS, admin approval workflows and append-only audit log.
3. **Phase 12**: institution fee publishing, installment validation, enrollments and student read-only fee views.
4. **Phase 13**: balanced ledger, idempotency, transaction-state machine, reconciliation, simulated payments only.
5. **Phase 14**: NMB sandbox adapter behind an explicit disabled-by-default capability gate; no production credentials in browser.
6. **Phase 15–17**: security audit, contracts, regulatory determination, bank approval, controlled pilot and signed go-live authorization.

## Production gate
No live financial endpoints or payment-success receipts until bank integration, regulatory and security approvals are independently verified. Demo OTP 123456 must never be accepted by a production authorization endpoint.
