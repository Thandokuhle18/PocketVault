# IMPLEMENTATION_PLAN.md: PocketVault

---

## 0. Plan details

| Field | Value |
| --- | --- |
| App name | PocketVault: "Home for your finances." |
| Built from PRD version | v0.1 (`docs/PRD.md`). Section 18 lists the PRD changes still needed; bump the PRD to v0.2 when they are made. |
| Screen designs | Stitch project https://stitch.google.com/projects/14648157237388159118 ; exported PNGs in `docs/designs/` (one file per S# and M#: `S1.png` … `S11.png`, `M1.png` … `M6.png`) |
| Plan version | v1.0 |
| Repository | https://github.com/Thandokuhle18/PocketVault |
| Status | Draft (becomes "Ready to build" when every row in Section 18 is Answered) |
| Last updated | 23 Nov 2026 |

---

## 1. Start here (instructions for the coding agent)

Before writing any code:

1. Read this whole file from top to bottom.
2. Read `docs/PRD.md`.
3. Look at the screen designs in `docs/designs/` listed in Section 7.3.
4. Check Section 18. If any clarification is still **Open**, stop and ask the human. Do not start.
5. Check that the prerequisites in Section 4.2 are installed.
6. Start **Phase 1 only**. Follow Section 2 at all times.

---

## 2. Rules for the coding agent (copy word for word, do not edit)

1. **One phase at a time.** Only work on the phase the human asked for. When that phase's Definition of Done is complete, stop and wait for the human to say "Start Phase <number>".
2. **Test-driven development (TDD) for every task.** Follow the cycle in Section 12.1:
    - Write the test.
    - Run it and see it fail for the right reason.
    - Write the smallest code that makes it pass.
    - Run all tests.
    - Refactor while all tests still pass.
3. **Never cheat a test.** Never delete, skip, weaken or change a test just to make it pass. If you believe a test is wrong, stop and explain why to the human.
4. **Never break earlier work.** Every test from earlier phases must still pass before a phase is done.
5. **Build only what is planned.** Build only what is in this file and `docs/PRD.md`. Never build anything in Section 3.3 (Deferred).
6. **Ask, don't guess.** If anything is missing, unclear or contradictory, stop, add it to Section 18, and ask the human.
7. **Match the designs.** Every screen must match its design in Section 7.3: layout, order, labels, text, colours and spacing. Use the design tokens in Section 7.1. Never hard-code colours, font sizes or spacing.
8. **Every state, every screen.** Each screen must handle every state listed for it in Section 7.3 (chosen from normal, empty, loading, error, offline, success, plus any screen-specific states).
9. **Exact wording.** Use the exact labels and messages from the PRD. Never invent wording.
10. **Security first.**
    - Never put secret keys in app code, logs, test files or Git.
    - Every permission rule in Section 9 must be enforced on the server or database, never only in the app.
    - Every permission rule must have a test.
11. **Full check before "done".** Run the full check command (Section 4.3) before saying a phase is done, then add a short summary of the results to the Progress log (Section 17).
12. **Record your progress.** After each phase:
    - tick the checkboxes for that phase in this file;
    - add a row to the Progress log;
    - commit using the commit message given in the phase.
13. **No surprise libraries.** Do not add, remove or upgrade any library or tool not listed in Section 4.1 without asking the human first.
14. **Stuck rule.** If the same problem is still failing after 3 attempts, stop and report:
    - what you tried;
    - the exact error;
    - what you need from the human.
15. **Clean code.** Follow the folder structure in Section 5. Use the PRD's key terms (Section 3.4) for names in code. Keep files small and focused.

---

## 3. Project summary and scope

### 3.1 Summary

PocketVault helps small business owners to plan, track and protect their money so that they stay profitable and debt-free. The Owner builds a plan of startup costs, monthly expenses and income, records every sale and purchase in a ledger, adds bills, and sees a Debt Guard level (Safe, Watch or At risk) on one dashboard. Staff record sales and purchases; larger staff expenses wait for the Owner's approval, and every change is kept in an audit trail with advisory integrity flags.

**Platform:** Web app (works in a browser). Mobile first (390 px wide), then desktop (1440 px wide). Test devices: latest Chrome on a laptop and Chrome on an Android phone.

### 3.2 Features in scope

| ID | Feature | Priority | Built in phase |
| --- | --- | --- | --- |
| F1 | Account and business setup | Must | 3 |
| F2 | Business Financial Planner | Must | 4 |
| F3 | Income and Expense Ledger | Must | 5 |
| F4 | Dashboard and Debt Guard | Must | 7 |
| F5 | Bills | Must | 6 |
| F6 | Approvals | Should | 8 |
| F7 | Integrity flags and audit log | Should | 9 |

All Must features (Phases 3 to 7) are built before any Should feature (Phases 8 and 9).

### 3.3 Deferred: do NOT build

- Bank connections and automatic bank imports (open banking import)
- Payments, lending or loans
- Tax, VAT, payroll or invoicing
- Reporting to authorities (FIC or SARS)
- More than one Business per user; a planning period setting (the plan is always one month of running costs plus startup costs)
- AI predictions (every insight is a fixed calculation, BR15)
- Receipt photo upload; any file or image storage
- Export to PDF and Excel
- Push, WhatsApp, SMS or marketing email (in-app notifications only; the only emails are the Supabase account emails)
- Accountant read-only role
- Sign-in with Google or any other social provider (email + password only)
- Changing the email address
- Users under 18
- Dark mode
- A profile screen, onboarding slides, or admin screens (admin work is done in the Supabase dashboard)
- Scheduled jobs (Overdue is calculated when a screen loads)

### 3.4 Key terms (use these names in code)

| Term (PRD 1.7) | Name in code | Meaning |
| --- | --- | --- |
| User | `Profile`, table `profiles` | One person with an account (same id as the Supabase Auth user) |
| Business | `Business`, table `businesses` | The one workspace that holds a plan, transactions, bills and team |
| Membership | `Membership`, table `memberships` | One user's role (`Owner` or `Staff`) in one Business |
| Invite | `Invite`, table `invites` | An Owner's invitation for a staff email (`Pending`, `Accepted`, `Revoked`) |
| Plan line | `PlanLine`, table `plan_lines` | One row in the plan: a startup cost, a monthly expense or an income item |
| Transaction | `Transaction`, table `transactions` | One real income or expense recorded in the ledger |
| TransactionAudit | `TransactionAudit`, table `transaction_audit` | One history row for a transaction change |
| Bill | `Bill`, table `bills` | A payment due on a date, once-off or repeating |
| Safe-to-spend | `safeToSpend` | Cash on hand minus the unpaid bills due in the next 30 days (BR12) |
| Debt Guard level | `RiskLevel` (`Safe`, `Watch`, `At risk`, `Not enough data yet`) | The level shown by the Risk badge |
| Flag | `Flag`, table `flags` | An advisory warning created automatically by a rule in BR17 to BR21 |
| Pending | `status = 'Pending'` | A staff expense of R2,000.00 or more waiting for the Owner |

Database values keep the PRD's exact spelling and capital letters (for example `'Startup cost'`, `'Once-off'`, `'Large cash'`).

---

## 4. Tech stack, prerequisites and commands

### 4.1 Stack

| Layer | Tool | Version | Used for |
| --- | --- | --- | --- |
| Frontend | React with React Router, Vite | React 18, React Router 6, Vite 5 | Screens and routes |
| Language | TypeScript (strict mode) | 5 | All app, test and script code |
| Styling | Tailwind CSS | 3.4 | Styling using the tokens in `src/theme/tokens.ts` |
| Charts | Recharts | 2 | Income and expense bar chart on S6 |
| Icons | `lucide-react` | Latest stable at setup | Outline icons (filled when active) |
| Font | `@fontsource/inter` | Latest stable at setup | Self-hosted Inter (400, 600, 700): no external font request, less mobile data |
| Backend client | `@supabase/supabase-js` | 2 | Talking to Supabase |
| Backend and database | Supabase: PostgreSQL, Auth, Row-Level Security (RLS), database functions and triggers | Supabase CLI, latest stable at setup (run as `npx supabase`) | Data, log-in, permissions, business rules |
| Server functions | None | — | Account deletion is a database function (Section 18 #18) |
| Data fetching and caching | None (a small `useAsyncData` hook in `src/hooks/`) | — | Loading, error and retry states |
| Unit and component tests | Vitest with `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Vitest 2; others latest stable at setup | Business rules, components, screens |
| Coverage | `@vitest/coverage-v8` | Same as Vitest | Line coverage of `src/lib/` (Section 12.5) |
| Database and permission tests | pgTAP via `npx supabase test db` | Supabase CLI | Constraints, triggers, functions, RLS |
| Integration tests | Vitest + `supabase-js` against the local Supabase (own config `vitest.integration.config.ts`) | Vitest 2 | Every backend operation |
| End-to-end tests | Playwright (Chromium) | Latest stable at setup | PRD flows 1 to 6 in a real browser |
| Lint and type check | ESLint with `typescript-eslint` and `eslint-plugin-react-hooks`, TypeScript compiler (`tsc`) | Latest stable at setup | Code quality |
| Seed script runner | `tsx` | Latest stable at setup | Runs `supabase/seed/seed.ts` |
| Secret scan | `secretlint` with the recommended rule preset | Latest stable at setup | Finds keys committed by mistake (T-NFR-9) |
| CI | GitHub Actions | — | Runs lint, type check, tests and build on every pull request |
| Build and hosting | Vercel (frontend) and a hosted Supabase project in South Africa (Cape Town) | — | Live link |
| Runtime and packages | Node.js 20 LTS, npm | 20 LTS | Running tools |

Money is never handled with a library: `src/lib/money.ts` formats and parses `R1,234.50` (the `en-ZA` locale is NOT used, it prints `R 1 234,50`). Dates are written `03 Nov 2026`, times in 24-hour SAST, by `src/lib/format.ts` (no date library).

### 4.2 Prerequisites on the computer

- [ ] Node.js 20 LTS and npm
- [ ] Git and a GitHub account (repository `Thandokuhle18/PocketVault`)
- [ ] Docker Desktop, running (the local Supabase needs it)
- [ ] Google Chrome (laptop) and an Android phone with Chrome (real-device checks)
- [ ] Playwright browser installed once: `npx playwright install chromium`
- [ ] Accounts: Supabase (hosted project in Phase 11) and Vercel (deploy in Phase 11)

### 4.3 Commands

| Purpose | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Start the local backend | `npx supabase start` (prints the local URL and keys; also run `npx supabase status`) |
| Reset the database (migrations + seed data) | `npm run db:reset` (= `npx supabase db reset` then `npm run seed`) |
| Load the seed data only | `npm run seed` (= `node --env-file=.env --import tsx supabase/seed/seed.ts`; safe to run again: it deletes and recreates the 3 seed users and their businesses) |
| Start the app | `npm run dev` (Vite, http://localhost:5173) |
| Unit and component tests | `npm test` (= `vitest run`, excludes `tests/integration`) |
| Database and permission tests | `npx supabase test db` |
| Integration tests | `npm run test:integration` (= `node --env-file=.env node_modules/vitest/vitest.mjs run -c vitest.integration.config.ts`) |
| End-to-end tests | `npm run test:e2e` (= `playwright test`; starts `npm run dev` itself) |
| Lint | `npm run lint` (= `eslint .`) |
| Type check | `npm run typecheck` (= `tsc --noEmit`) |
| Coverage | `npm test -- --coverage` |
| Secret scan | `npx secretlint "**/*"` |
| **Full check (run before every "done")** | `npm run check` (= `npm run lint && npm run typecheck && npm test && npx supabase test db && npm run test:integration`). `npx supabase start` must be running and `npm run db:reset` must have been run first. |
| Build for release | `npm run build` (= `tsc --noEmit && vite build`); preview with `npm run preview` |

E2E tests (Playwright) are run at the end of each feature phase and in Phase 10. They are not part of `npm run check`, because they start a browser and the dev server. CI runs `npx supabase start`, `npm run db:reset`, `npm run check` and `npm run build`, with a `.env` it builds from `npx supabase status -o env`.

---

## 5. Folder structure

```
PocketVault/
  src/
    main.tsx                         App entry
    App.tsx                          Router, route guards (Section 11)
    pages/                           One file per screen
      Welcome.tsx                    S1 Welcome
      SignUp.tsx                     S2 Sign Up
      LogIn.tsx                      S3 Log In
      ForgotPassword.tsx             S4 Forgot Password (request mode + set-new-password mode, Section 18 #3)
      BusinessSetup.tsx              S5 Business Setup
      Dashboard.tsx                  S6 Dashboard
      Planner.tsx                    S7 Planner
      Ledger.tsx                     S8 Ledger
      Bills.tsx                      S9 Bills
      Settings.tsx                   S10 Settings
      Review.tsx                     S11 Review (Flags and Audit log tabs)
      PrivacyNotice.tsx              Static Privacy Notice page (Section 18 #4); not an S#
    components/                      Shared components (Section 7.2)
      modals/                        TransactionModal M1, ConfirmDeleteModal M2, BillModal M3,
                                     InviteStaffModal M4, DeleteAccountModal M5, DecisionSheet M6
    context/AuthContext.tsx          Session, profile, role and business (from get_my_context)
    hooks/                           useAsyncData, useOnline
    lib/
      supabase.ts                    Supabase client (public anon key only)
      api/                           One file per operation group (Section 10)
      constants.ts                   Business types, stages, categories, payment methods (same values as the database checks)
      messages.ts                    Every user-facing message from the PRD, in one place
      errors.ts                      Maps database error codes to PRD messages (Section 10)
      clock.ts                       today() in SAST; tests replace it with a fixed date
      money.ts                       BR1: parse, format, round
      format.ts                      Dates (03 Nov 2026), 24-hour SAST time
      validation.ts                  Field rules: password, names, descriptions, dates, reasons
      plan.ts                        BR2 to BR4
      approval.ts                    BR7
      ledger.ts                      BR10 (period ranges, search escaping, filters)
      debtGuard.ts                   BR11 to BR13
      dashboard.ts                   BR14
      insights.ts                    BR15
      bills.ts                       BR16 (overdue, Bills30)
      flags.ts                       BR17 to BR22 (rule predicates and flag texts)
      lockout.ts                     Failed log-in counter (Section 5 of the PRD)
      session.ts                     30-day session check
      __tests__/                     Unit tests (T-BR, T-AUTH)
    theme/tokens.ts                  Design tokens (Section 7.1); tailwind.config.ts reads it
    index.css                        Tailwind layers, font import
  tests/
    components/                      Component and screen tests (T-C, T-S, T-M, T-US, T-NAV, T-EDGE)
    integration/                     Operation tests against the local Supabase
    setup.ts                         jest-dom matchers, fake clock helper
  e2e/                               Playwright flows (T-E2E)
  supabase/
    config.toml                      Local Supabase settings (Auth settings in Phase 3)
    migrations/                      SQL migrations (Section 8.6)
    tests/                           pgTAP tests (T-DB, T-BR, T-SEC)
    seed/seed.ts                     Seed script (uses the secret key; never in the app)
    seed/README.md                   Test logins and how to run the seed
  .github/workflows/ci.yml           CI: lint, typecheck, tests, build
  docs/PRD.md
  docs/designs/                      Exported designs: S1.png … S11.png, M1.png … M6.png
  BUSINESS.md
  IMPLEMENTATION_PLAN.md
  README.md
  .env.example
  vercel.json                        Single-page-app rewrite so React Router routes work on the live link
  tailwind.config.ts  vite.config.ts  vitest.integration.config.ts  playwright.config.ts
```

**Rule:** a new folder may only be created if it is added to this section first.

---

## 6. Environment variables and secrets

| Name | What it is | Where to get it | Public or secret | Used by |
| --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Project address | Local: `http://127.0.0.1:54321` (from `npx supabase status`). Hosted: Supabase dashboard → Project Settings → API | Public | App, and scripts and tests |
| `VITE_SUPABASE_ANON_KEY` | Public (anon) key | Same | Public: safe only because RLS is on for every table | App, and scripts and tests |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin (service role) key | Same | **Secret** | `supabase/seed/seed.ts`, `tests/integration/`, `e2e/` helpers only. Never in `src/`. Never added to Vercel. |
| `SEED_TEST_PASSWORD` | Test-only password given to the 3 seed accounts | You choose it (see `supabase/seed/README.md`) | Secret (test-only) | `supabase/seed/seed.ts`, integration tests, E2E |

`.env.example` (committed to Git, placeholder values only):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key-never-commit
SEED_TEST_PASSWORD=replace-with-a-test-only-password
```

Rules:

- Real values go in `.env`, which is listed in `.gitignore` and never committed.
- Only `VITE_` variables may be used in `src/`. A test (T-NFR-9) fails if `SERVICE_ROLE` appears anywhere under `src/`.
- Vercel gets only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The service role key is NOT added to Vercel.
- If a new variable is needed, add it here and to `.env.example` first.

---

## 7. Design system and screens

### 7.1 Design tokens (`src/theme/tokens.ts`)

Every value below lives in this one file. `tailwind.config.ts` imports it. Screens and components use Tailwind classes built from these tokens only.

| Token | Value | From PRD |
| --- | --- | --- |
| `color.primary` (Vault Green) | #1F4D3A | 9.1 Primary colour |
| `color.accent` (Lime Glow) | #D6E64B (fills, with Ink text on top) | 9.1 Secondary / accent |
| `color.gold` (Harvest Gold) | #E6B73F (warning fills, with Ink text on top) | 9.1 |
| `color.sage` / `color.mist` | #9DB59A / #B9CCD6 (chart bars, illustrations and avatars only, never text) | 9.1 Supporting colours |
| `color.background` (Cream) | #FAF6EA | 9.1 |
| `color.card` | #FFFFFF | 9.1 |
| `color.text` (Ink) | #14281F | 9.1 |
| `color.textSecondary` (Moss) | #4A5D52 | 9.1 |
| `color.error` / `color.success` / `color.warning` | #B3261E / #1B7A43 / #7A5200 (text colours, on white or cream) | 9.1 |
| `color.toastBackground` | #14281F (Ink), white text | 8.3 Toast |
| `color.focusRing` | 2px #D6E64B ring with a Vault Green inner outline | 9.3 |
| `font.family` | Inter (400, 600, 700) | 9.1 Font |
| `font.size.bigNumber` | 32px bold | 9.1 Text sizes |
| `font.size.title` | 24px bold | 9.1 |
| `font.size.heading` | 18px semibold | 9.1 |
| `font.size.body` | 16px regular | 9.1 |
| `font.size.small` | 12px regular | 9.1 |
| `space.1` / `space.2` / `space.4` / `space.6` / `space.8` | 4 / 8 / 16 / 24 / 32 px | 9.1 Spacing unit 4px |
| `space.screen.mobile` / `tablet` / `desktop` | 16 / 24 / 32 px | 9.1 Screen side margin |
| `radius.card` / `radius.control` / `radius.chip` | 16 / 12 / full (pill) | 9.1 Corner radius |
| `shadow.soft` | 0 2px 8px rgba(20, 40, 31, 0.08) | 9.1 Shadows |
| `size.button` | 48px | 9.1 Button height, 8.3 |
| `size.touchMin` | 44px | 9.4 |
| `layout.sidebar` / `layout.contentMax` / `layout.modalMax` | 240 / 1200 / 480 px | 9.3 |
| `breakpoint.tablet` / `breakpoint.desktop` | 640 / 1024 px | 9.3 |

### 7.2 Shared components

| Component | File | Variants and states | Used on | Tests |
| --- | --- | --- | --- | --- |
| Button | `src/components/Button.tsx` | primary, secondary, danger; hover, focus ring, disabled (grey), loading spinner; 48px high | All | T-C-1 |
| TextField | `TextField.tsx` | label above, input, error (red border + icon + message, keeps the user's text); password with eye icon | S2 to S5, M1 to M6 | T-C-2 |
| MoneyField | `MoneyField.tsx` | "R" prefix; accepts `1,250.50` and `1250.50`; shows 2 decimals on blur | S5, S7, M1, M3 | T-C-3 |
| SelectField | `SelectField.tsx` | dropdown with label and error | S5, S6, S7, S8, M1, M3 | T-C-4 |
| Checkbox | `Checkbox.tsx` | label, 44px target, error | S2 | T-C-19 |
| Toast | `Toast.tsx` | one line, Ink background, white text, disappears after 3 seconds | All | T-C-5 |
| Banner | `Banner.tsx` | icon, one line, tap target; gold fill (warning), red fill (At risk) | S6, S8, S9 | T-C-6 |
| StatusChip | `StatusChip.tsx` | words with icon: Approved, Pending, Rejected, Overdue, Upcoming, Paid, Open, Reviewed | S8, S9, S11 | T-C-7 |
| RiskBadge | `RiskBadge.tsx` | words "Safe", "Watch", "At risk" or "Not enough data yet" with icon; never colour alone | S6 | T-C-8 |
| StatCard | `StatCard.tsx` | label, big number, optional % change with arrow icon | S6, S7 | T-C-9 |
| EmptyState | `EmptyState.tsx` | flat illustration (arches and circles, inline SVG, no image files), text, optional button | S6 to S11 | T-C-10 |
| Skeleton | `Skeleton.tsx` | grey blocks the shape of the content | All | T-C-11 |
| OfflineBanner | `OfflineBanner.tsx` | grey bar "You're offline. Changes will not be saved."; save buttons disabled while shown | All logged-in | T-C-12 |
| ErrorBlock | `ErrorBlock.tsx` | "Something went wrong. Try again." and a "Try again" button | All logged-in | T-C-13 |
| ConfirmDialog | `ConfirmDialog.tsx` | title, text, buttons; traps focus; Esc closes | M2, M5 | T-C-14 |
| Modal and BottomSheet | `Modal.tsx`, `BottomSheet.tsx` | Under 640px: M1, M3, M4 full height and M6 a bottom sheet; over 1024px: centred, max 480px | M1 to M6 | T-C-15 |
| Navigation | `Navigation.tsx` | Mobile: bottom tab bar with 5 labelled icons; 640 to 1024px: left rail, icons only; over 1024px: left side menu with labels (240px) and logo; active item filled Vault Green; red dot on Review when flags are Open; Staff see only Ledger, Bills, Settings | S6 to S11 | T-C-16 (Phase 3), T-C-16b red dot (Phase 9) |
| Header | `Header.tsx` | title, optional back arrow, optional action button; sticky | All logged-in screens | T-C-17 |
| TransactionRow | `TransactionRow.tsx` | description, category, date, payment method, amount (green "+" Income, dark "−" Expense, with the word), status chip, creator name (Owner view); "Former staff member" when the creator is empty | S8 | T-C-18 |
| Logo | `Logo.tsx` | rounded Vault Green square, cream house outline, Lime Glow keyhole circle; wordmark "PocketVault" | S1, Navigation | T-S1-1 |
| IncomeExpenseChart | `IncomeExpenseChart.tsx` | Recharts bar chart with a text table alternative for screen readers | S6 | T-S6-2 |

### 7.3 Screens

| ID | Screen | Route / file | Design | Who can open it (else redirect to) | Tab bar | Required states | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Welcome | `/`, `pages/Welcome.tsx` | `S1.png` | Logged out (else S6 Owner, S5 Owner without a Business, S8 Staff) | No | Normal | 1 |
| S2 | Sign Up | `/sign-up` | `S2.png` | Logged out (else as S1) | No | Normal, Loading, Error, Offline, Success | 3 |
| S3 | Log In | `/log-in` | `S3.png` | Logged out (else as S1) | No | Normal, Loading, Error, Offline, Success (verify banner) | 3 |
| S4 | Forgot Password | `/forgot-password` | `S4.png` (and `S4-set.png` once Section 18 #3 is Answered) | Logged out, or opened from the reset email link | No | Normal, Loading, Error, Offline, Success (both modes) | 3 |
| S5 | Business Setup | `/business-setup` | `S5.png` | Owner without a Business (Owner with a Business → S6; Staff → S8; logged out → S1) | No | Normal, Loading, Error, Offline, Success | 3 |
| S6 | Dashboard | `/dashboard` | `S6.png` (and a desktop version) | Owner (Staff: "You can't do that." → S8) | Yes | Normal, Empty, Loading, Error, Offline | 3 (placeholder), 7 |
| S7 | Planner | `/plan` | `S7.png` (and a desktop version) | Owner (Staff: "You can't do that." → S8) | Yes | Normal, Empty, Loading, Error, Offline, Success | 3 (placeholder), 4 |
| S8 | Ledger | `/ledger` | `S8.png` | Owner, Staff | Yes | Normal, Empty, No matches, Loading, Error, Offline, Success | 3 (placeholder), 5, 8 (approval banners and Pending) |
| S9 | Bills | `/bills` | `S9.png` | Owner (manage), Staff (view only) | Yes | Normal, Empty, Loading, Error, Offline, Success | 3 (placeholder), 6 |
| S10 | Settings | `/settings` | `S10.png` | Owner, Staff | Yes | Normal, Empty (team), Loading, Error, Offline, Success | 3 |
| S11 | Review | `/review` | `S11.png` | Owner (Staff: "You can't do that." → S8) | Yes | Normal, Empty (Flags), Empty (Audit log), Loading, Error, Offline, Success | 3 (placeholder), 9 |
| M1 | Transaction | modal from S8 | `M1.png` | Owner, Staff (Staff add only) | — | Normal, Debt Guard warning, Loading, Error, Offline, Success | 5 |
| M2 | Confirm Delete | modal from S8 and S9 | `M2.png` | Owner | — | Normal, Loading, Error, Offline, Success | 5 (transaction), 6 (bill) |
| M3 | Bill | modal from S9 | `M3.png` | Owner | — | Normal, Loading, Error, Offline, Success | 6 |
| M4 | Invite Staff | modal from S10 | `M4.png` | Owner | — | Normal, Loading, Error, Offline, Success | 3 |
| M5 | Delete Account | modal from S10 | `M5.png` | Owner, Staff | — | Normal, Loading, Error, Offline, Success | 3 |
| M6 | Approve or Reject | bottom sheet from S8 | `M6.png` | Owner | — | Normal, Debt Guard line, Loading, Error, Offline, Success | 8 |

Modals are component state (not routes). The Privacy Notice is a plain page at `/privacy` (Section 18 #4) reached from S1, S2 and S10.

---
