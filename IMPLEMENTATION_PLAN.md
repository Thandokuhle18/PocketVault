# PocketVault: Implementation Plan

Built from PRD version v0.2 (`docs/PRD.md`). The PRD is the source of truth: if something here conflicts with it, fix the PRD first, add a change-log row, then update this plan.

Clarifications needed: none.

## 1. Summary and scope
- **Product:** PocketVault, "Home for your finances." A mobile-first web app for small business owners to plan, track and protect their money.
- **Users and roles:** Owner and Staff (PRD 2.4). Admin work is done in the Supabase dashboard.
- **Must (build first):** F1 Account and business setup, F2 Planner, F3 Ledger, F4 Dashboard and Debt Guard, F5 Bills.
- **Should (after all Must):** F6 Approvals, F7 Integrity flags and audit log.
- **Non-goals (never build):** bank connections, payments or lending, tax/VAT/payroll/invoicing, reporting to authorities, multiple businesses per user, AI predictions.
- **Deferred (must NOT be built):** open banking import, receipt photo upload, PDF/Excel export, push or WhatsApp reminders, accountant role.

## 2. Tech stack and setup
React 18, TypeScript 5, Vite 5, React Router 6, Tailwind CSS 3.4, Recharts 2, Supabase (supabase-js 2, PostgreSQL, Auth, RLS), Vitest 2 with Testing Library, ESLint, GitHub Actions, Vercel. Node.js 20 LTS and npm.

Run locally: `npm install`, copy `.env.example` to `.env`, fill the values, then `npm run dev`.
Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## 3. Environment variables
| Name | Public or secret |
|---|---|
| VITE_SUPABASE_URL | Public |
| VITE_SUPABASE_ANON_KEY | Public (safe only because RLS is on for every table) |
| SUPABASE_SERVICE_ROLE_KEY | Secret (seed script only, never in the app) |

`.env` is never committed. `.env.example` is committed with placeholder values.

## 4. Folder structure
src/pages (one file per screen), src/components, src/lib (business rules), src/lib tests next to the code, supabase/migrations, supabase/seed, .github/workflows, docs (PRD.md, designs/), BUSINESS.md, README.md, IMPLEMENTATION_PLAN.md.

## 5. Database (migration order)
1. Helper types (Choice values as check constraints) and a `set_updated_at` function.
2. Tables from PRD section 10: profiles (User), businesses, memberships (user_id unique), invites (unique business_id + email), plan_lines, transactions, transaction_audit, bills, flags. Include every field, default, uniqueness rule and delete behaviour from 10.1.
3. Check constraints for BR1 (amounts above 0.00 up to 10,000,000.00), BR5 (name length, quantity ranges), BR6 (description length, category matches type, date not in the future).
4. Helper functions: `my_business_id()`, `is_owner(business)`, `is_member(business)`.
5. Database functions (called with `supabase.rpc`): `create_business(...)` (creates the business and the Owner membership), `delete_transaction(id, reason)` (BR9), `decide_transaction(id, approve, reason)` (BR7, Owner only), `mark_bill_paid(id)` (BR16, atomic).
6. Triggers: profile and membership on sign-up (match pending invite by lower-case email, BR23); `set_transaction_status` (BR7); audit rows on insert, update, delete, approve and reject (BR9); flags BR17 to BR21; invite limit of 5 staff (BR23); transaction limit of 200 per user per day (BR24); plan line limit of 100 (BR5).
7. RLS enabled on every table with policies from PRD 11.4. No update or delete policy on transaction_audit. No insert policy on flags or transaction_audit for users.

## 6. Permissions
One policy per row of PRD 11.4, enforced by RLS and the functions above. Staff see only their own transactions (BR8). Owner-only: plan lines, invites, flags, audit, bill changes, approvals, edits and deletes.

## 7. Business rules: where each runs
| BR | Where |
|---|---|
| BR1 | src/lib/money.ts and database check constraints |
| BR2 to BR4 | src/lib/plan.ts (unit tested) |
| BR5 | database trigger and constraints, UI messages |
| BR6 | database constraints and src/lib/validation.ts |
| BR7 | database trigger and `decide_transaction` |
| BR8 | RLS |
| BR9 | `delete_transaction`, audit triggers |
| BR10 | src/lib/ledger.ts (filters, totals) and query |
| BR11 to BR13 | src/lib/debtGuard.ts (unit tested) |
| BR14, BR15 | src/lib/dashboard.ts and src/lib/insights.ts (unit tested) |
| BR16 | `mark_bill_paid` |
| BR17 to BR21 | database triggers (also mirrored in unit tests of the rule logic) |
| BR22 | flags UI and update policy |
| BR23, BR24 | database triggers |

## 8. Accounts
Every decision in PRD Section 5 (email and password, 18 or older, email verification required, password 8+ characters with a number, reset link 1 hour, 5 wrong passwords then 15 minutes disabled, stay logged in 30 days, log out without confirmation, delete account per role, no email change).

## 9. Navigation and routes
| Route | Screen | Who | Tab bar |
|---|---|---|---|
| / | S1 Welcome | Logged out | No |
| /sign-up | S2 | Logged out | No |
| /log-in | S3 | Logged out | No |
| /forgot-password | S4 | Logged out | No |
| /business-setup | S5 | Owner without a business | No |
| /dashboard | S6 | Owner | Yes |
| /plan | S7 | Owner | Yes |
| /ledger | S8 | Owner, Staff | Yes |
| /bills | S9 | Owner, Staff (view only) | Yes |
| /settings | S10 | Owner, Staff | Yes |
| /review | S11 | Owner | Yes |

Staff opening an Owner-only route sees "You can't do that." and goes to /ledger. After log-in: Owner without a business goes to /business-setup, Owner with a business goes to /dashboard, Staff goes to /ledger. Modals M1 to M6 are opened from S8, S9 and S10.

## 10. Design tokens and components
All values from PRD section 9 live in `tailwind.config.js` (colours, font sizes, radius, shadow). Shared components from PRD 8.3. Designs are in `docs/designs/` and the Stitch link is in the README.

## 11. Notifications, errors, quality, security, privacy
Notifications: PRD 4.5 (in-app only). Error messages: PRD 12.2. Quality, security and POPIA: PRD section 12.

## 12. Seed data and test accounts
PRD 8.4 and 10.4: zodwa@example.com (Owner), lwazi@example.com (Staff), pieter@example.com (Owner of a second business). Passwords are in `supabase/seed/README.md`.

## 13. Build phases
Every phase ends with an app that runs, a pull request linked to its Issue, and CI green.

**Phase 1: Setup and first screen (Issue #2).** Vite scaffold, tokens, folders, `.env.example`, CI, money helper with tests, S1 Welcome.
- [ ] `npm run lint`, `typecheck`, `test` and `build` pass and CI is green
- [ ] S1 shows the tagline and both buttons

**Phase 2: Auth screens and shared components.** S2 to S4 UI and PRD 8.3 components. F1, US1 to US2, BR1.
- [ ] T-US1-3 (UI part)

**Phase 3: Backend.** Supabase project in South Africa (Cape Town), migrations, RLS, functions, triggers, seed. Backend started.
- [ ] Seed loads
- [ ] Logging in as Pieter shows no bakery data (manual RLS check)
- [ ] CI runs on every PR

**Phase 4: F1 wiring.** US1 to US4. S2 to S5, S10, M4, M5.
- [ ] T-US1-1, T-US1-2, T-US1-3
- [ ] T-US2-1, T-US2-2, T-US2-3, T-US2-4
- [ ] T-US3-1, T-US3-2, T-US3-3
- [ ] T-US4-1, T-US4-2, T-US4-3, T-US4-4

**Phase 5: Deploy.** Vercel with the three env vars (service role key NOT added), live link in README, log-in and database working on the live link.
- [ ] Log in as zodwa@example.com on the live link

**Phase 6: F2 Planner.** US5, US6. S7. BR1 to BR5.
- [ ] T-US5-1, T-US5-2, T-US5-3, T-US5-4
- [ ] T-US6-1, T-US6-2, T-US6-3, T-US6-4

**Phase 7: F3 Ledger.** US7 to US9. S8, M1, M2. BR6 to BR10, BR24, BR13.
- [ ] T-US7-1, T-US7-2, T-US7-3, T-US7-4
- [ ] T-US8-1, T-US8-2, T-US8-3, T-US8-4
- [ ] T-US9-1, T-US9-2, T-US9-3, T-US9-4

**Phase 8: F5 Bills.** US11. S9, M3. BR16.
- [ ] T-US11-1, T-US11-2, T-US11-3, T-US11-4

**Phase 9: F4 Dashboard.** US10. S6. BR11 to BR15.
- [ ] T-US10-1, T-US10-2, T-US10-3, T-US10-4

**Phase 10: F6 Approvals (Should).** US12. M6.
- [ ] T-US12-1, T-US12-2, T-US12-3

**Phase 11: F7 Flags and audit log (Should).** US13. S11. BR17 to BR22.
- [ ] T-US13-1, T-US13-2, T-US13-3, T-US13-4

**Phase 12: Polish and submission.** Responsive check at 360, 390, 768 and 1440 px, contrast check, README complete (screenshots, architecture, known issues), Loom (max 5 min), portfolio.

## 14. Testing checklist
Automated = Vitest. Manual = checked in Chrome and on an Android phone.

- [ ] T-US1-1 manual
- [ ] T-US1-2 manual
- [ ] T-US1-3 manual
- [ ] T-US2-1 manual
- [ ] T-US2-2 manual
- [ ] T-US2-3 manual
- [ ] T-US2-4 manual
- [ ] T-US3-1 manual
- [ ] T-US3-2 manual
- [ ] T-US3-3 manual
- [ ] T-US4-1 manual
- [ ] T-US4-2 manual
- [ ] T-US4-3 manual
- [ ] T-US4-4 manual
- [ ] T-US5-1 manual
- [ ] T-US5-2 manual
- [ ] T-US5-3 manual
- [ ] T-US5-4 manual
- [ ] T-US6-1 automated (BR2, BR3, BR4)
- [ ] T-US6-2 automated (BR3)
- [ ] T-US6-3 automated (BR4)
- [ ] T-US6-4 manual
- [ ] T-US7-1 manual
- [ ] T-US7-2 manual
- [ ] T-US7-3 automated (BR13)
- [ ] T-US7-4 manual
- [ ] T-US8-1 automated (BR7) and manual
- [ ] T-US8-2 automated (BR7) and manual
- [ ] T-US8-3 manual (RLS)
- [ ] T-US8-4 manual (BR24)
- [ ] T-US9-1 automated (BR10)
- [ ] T-US9-2 manual
- [ ] T-US9-3 manual
- [ ] T-US9-4 manual
- [ ] T-US10-1 manual
- [ ] T-US10-2 automated (BR12)
- [ ] T-US10-3 automated (BR12)
- [ ] T-US10-4 automated (BR15)
- [ ] T-US11-1 manual
- [ ] T-US11-2 manual (BR16)
- [ ] T-US11-3 manual
- [ ] T-US11-4 manual
- [ ] T-US12-1 manual
- [ ] T-US12-2 manual
- [ ] T-US12-3 manual
- [ ] T-US13-1 automated (BR17) and manual
- [ ] T-US13-2 manual
- [ ] T-US13-3 manual
- [ ] T-US13-4 manual

Also automated: BR12 at five scenarios (G4), BR11, BR14, BR18 to BR21.

## 15. Git workflow
Issues, then branch, then pull request, then merge. One Issue per branch (`feat/...`, `docs/...`, `fix/...`). Small, clear commits using `feat:`, `fix:`, `docs:`, `test:`, `chore:`. Every PR must pass CI (lint, typecheck, tests, build) before merge. PRs say `Closes #<issue>` in the description. Merge with squash and delete the branch.