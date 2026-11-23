PRD: PocketVault
Document details
Field	Answer
Product name	PocketVault
Author(s)	Thandokuhle Maphanga
Course code and cohort	Melsoft SNPL 2026
Facilitator / reviewer	Mnelisi Maswanganyi
Link to original app idea	docs/idea.md in the repository
GitHub repository	https://github.com/Thandokuhle18/PocketVault
Version	v0.1
Status	Draft

Change log

Version	Date	Section(s) changed	What changed	Regenerated?
v0.1	23 Nov 2026	All	First draft	None
1. Product overview

1.1 Product name: PocketVault

1.2 One-line pitch: PocketVault helps small business owners to plan, track and protect their money so that they stay profitable and debt-free. (19 words)

1.3 Problem statement: Small business owners and people planning to start one usually manage money in a notebook, a spreadsheet or WhatsApp messages. A home baker with R3,500 rent, R1,800 electricity and R2,200 stock must earn at least R7,500 a month before making any profit, but most never calculate this. Bills then fall due after the cash is already spent, which pushes owners into debt. When staff handle cash, there is no reliable record of who captured, changed or deleted what. Owners find out about the problem only when the money is gone.

1.4 Solution:

The owner creates a business and builds a plan of startup costs, monthly expenses and expected income, and sees profit or loss, break-even revenue and any funding gap.
Owner and staff record every sale and purchase in a ledger, and staff expenses of R2,000.00 or more wait for owner approval.
The owner adds bills, and the dashboard shows cash on hand, safe-to-spend and a Debt Guard level (Safe, Watch or At risk).
The owner reviews integrity flags (for example large cash or possible split payments) and a full audit trail of changes.

1.5 Platform: Web app (works in a browser). Designed mobile first (390 px wide), then desktop (1440 px wide).

1.6 Vision: The home for every small South African business's money, from the first idea to the first staff member.

1.7 Key terms

Term	Exact meaning in this app
Business	The one workspace that holds a plan, transactions, bills and team. Each user belongs to one Business in v1.
Plan line	One row in the plan: a startup cost, a monthly expense or an income item.
Transaction	One real income or expense the user records in the ledger.
Bill	A payment the business must make on a due date, once-off or repeating.
Safe-to-spend	Cash on hand minus the unpaid bills due in the next 30 days (BR12).
Flag	An advisory warning created automatically by a rule in BR17–BR21. It is not an accusation.
Pending	A staff expense of R2,000.00 or more waiting for the Owner to approve or reject it.
2. Users, personas and roles

2.1 Primary user: Small business owners and people planning a business, aged 20–55, in South Africa (home businesses, spaza shops, salons, car washes, freelancers). Tech comfort: Medium. Device: Android phone or a laptop. Data: mostly prepaid mobile data.

2.2 Secondary users: Staff members who work for an owner (buy stock, take payments).

2.3 Personas

Field	Persona 1	Persona 2
Name and age	Zodwa Mthembu, 34	Lwazi Ndlovu, 22
Role (from 2.4)	Owner	Staff
Occupation / situation	Runs Zodwa's Home Bakery in Soweto	Part-time assistant at the bakery, buys stock
Device and connectivity	Android phone, prepaid data	Android phone, prepaid data
Tech comfort	Medium	High
Language(s)	English, isiZulu	English, isiZulu
Goal	Know if the bakery really makes a profit and pay every bill without borrowing	Record purchases quickly so the owner trusts the numbers
Frustrations today	Notebook entries get lost; rent is due before she notices cash is low	Gets blamed when the notebook doesn't add up
How the app helps	Debt Guard warns her before bills become debt; plan shows break-even	Every entry is time-stamped, so there is a clear record
Quote	"I want to know I can pay rent before I buy more flour."	"Show that I recorded it, so nobody doubts me."

2.4 Roles and permissions

Role	How someone gets this role	Can do	Cannot do
Owner	Signs up and creates a Business (S5)	Edit business; build plan; add, edit and delete transactions; approve or reject Pending; add, edit, delete and pay bills; invite and remove staff (max 5); review flags and audit log; delete the Business	See another Business's data; change or delete audit log rows
Staff	Signs up with an email the Owner invited (S10, M4)	Add transactions; see only their own transactions; view bills; log out; delete own account	Edit or delete any transaction; see the plan, dashboard, other staff's entries, flags or audit log; approve; add or change bills; invite staff

Every "Cannot do" is enforced by database Row-Level Security (RLS) (see 11.4), not only by hiding buttons.

2.5 Admin: Admin work is done directly in the Supabase dashboard (for example removing an abusive account). There are no admin screens in v1.

3. Goals, success metrics and non-goals

3.1 Goals

#	Goal	Metric (what you count)	Target	How you will check it
G1	New owners build a plan	% of new Businesses with at least 3 Plan lines within 7 days of created_at	60%	PlanLine count per business_id vs Business.created_at
G2	Owners keep a real record	% of Businesses with at least 10 Transactions within 14 days of created_at	50%	Transaction count per business_id vs Business.created_at
G3	The app is easy to use	Average rating from a test group	4 out of 5 from 10 testers (small business owners, family, classmates)	Google Form after a 10-minute test
G4	Debt Guard is correct	Test scenarios that show the correct level (Safe, Watch, At risk, Not enough data)	5 of 5	Vitest tests for BR12, plus the seeded Pieter scenario

3.2 Non-goals

No bank connections or automatic bank imports. They need bank partnerships and compliance beyond a student project.
No payments, lending or loans. PocketVault is not a financial service provider.
No tax, VAT, payroll or invoicing. This is planning and tracking only.
No reporting to authorities (FIC or SARS). Flags are advisory only, and legal compliance is the owner's responsibility.
No more than one Business per user, and no planning period setting. The plan is always one month of running costs plus startup costs.
No AI predictions. Every insight is a fixed calculation on the owner's own data (BR15).
4. Features, business rules and notifications

4.1 Feature list

ID	Feature name	What the user can do	Priority	Goal	Stories	Screens
F1	Account and business setup	Sign up, verify email, log in, reset password, log out, delete account; Owner creates Business; Owner invites and views staff	Must	G1, G3	US1–US4	S1–S5, S10, M4, M5
F2	Business Financial Planner	Add, edit, delete Plan lines (startup cost, monthly expense, income); set available capital; see totals, profit or loss, break-even revenue, funding gap, payback	Must	G1, G3	US5, US6	S7
F3	Income and Expense Ledger	Add transactions (Owner, Staff); view, search, filter; Owner edits and deletes with reason; see totals for selected period	Must	G2	US7–US9	S8, M1, M2
F4	Dashboard and Debt Guard	See income, expenses, net result, cash on hand, safe-to-spend, risk level, upcoming bills, trend, category breakdown, insights, break-even progress	Must	G2, G4	US10	S6
F5	Bills	Add, edit, delete bills; see Upcoming and Overdue; mark paid (creates an expense); Staff view only	Must	G4	US11	S9, M3, M2
F6	Approvals	Owner approves or rejects Pending staff expenses; staff see the result	Should	G3	US12	S8, M6
F7	Integrity flags and audit log	Owner sees flags, marks them reviewed, and reads the audit log	Should	G3	US13	S11

4.2 MVP definition: An Owner can plan a business, record income and expenses (with staff approvals), add bills, and see on one dashboard whether they are at risk of running short.

4.3 Future features:

Open banking import
Receipt photo upload
Export to PDF and Excel
Multiple businesses per user
Push and WhatsApp reminders
Accountant read-only role

4.4 Business rules

ID	Rule (exact logic, numbers and limits)	Used by
BR1	Money. All amounts are in ZAR, with 2 decimals, greater than R0.00 and at most R10,000,000.00 (opening balance and available capital may be R0.00). Shown as R1,234.50.	F2–F5, S5, S7–S9, M1, M3
BR2	Plan totals. Startup total = sum of (amount × quantity) of "Startup cost" lines. Monthly expenses = sum of amount of "Monthly expense" lines. Monthly revenue = sum of (price × units) of "Income" lines. Variable cost = sum of (cost per unit × units) of "Income" lines. Monthly profit = revenue − variable cost − monthly expenses. A negative profit is labelled "Loss".	F2, S7
BR3	Break-even revenue. margin ratio = (monthly revenue − variable cost) ÷ monthly revenue. Break-even revenue = monthly expenses ÷ margin ratio, rounded to 2 decimals. If monthly revenue is R0.00 or margin ratio ≤ 0, show "Add an income line to see break-even."	F2, S7
BR4	Funding gap and payback. Funding gap = max(0, startup total − available capital). Payback months = startup total ÷ monthly profit, rounded up to a whole month. If monthly profit ≤ 0, show "Not reachable at these numbers."	F2, S7
BR5	Plan limits. Plan line name 3–60 characters. At most 100 Plan lines per Business. Quantity (units) is a whole number from 1 to 100,000. All plan results carry the text "These are your estimates, not guaranteed results."	F2, S7
BR6	Transaction rules. Description 3–80 characters. Type is Income or Expense, and category must belong to that type (list in Section 10). Date cannot be in the future. Notes up to 300 characters. Payment method is Cash, Card, EFT or Other.	F3, M1
BR7	Approval. An Owner's transactions are Approved at once. A Staff Income is Approved at once. A Staff Expense below R2,000.00 is Approved at once. A Staff Expense of R2,000.00 or more is Pending. Only Approved transactions count in totals, cash on hand and the dashboard.	F3, F6, S6, S8, M6
BR8	Visibility. Staff see only transactions they created. Owner sees all in the Business. Rejected and Pending rows are shown with a status chip but never counted.	F3, S8
BR9	Edit, delete and audit. Staff cannot edit or delete. Owner can edit any transaction and delete any transaction with a reason of 3–200 characters. Delete is a soft delete (deleted_at is set) and the row leaves the ledger and totals. Every create, edit, delete, approve and reject writes one TransactionAudit row, created by the database and never editable.	F3, F6, F7, S8, S11, M2
BR10	Ledger list. Newest transaction date first, then newest created_at. 20 rows per page with "Load more". Search = description contains the text, not case-sensitive. Filters: type, category, status, period (This month, Last month, Last 3 months, All time). Totals shown are for the filtered Approved rows.	F3, S8
BR11	Cash on hand. opening_balance + sum of Approved Income − sum of Approved Expenses, all dated up to and including today, not deleted.	F4, S6
BR12	Safe-to-spend and risk level. Bills30 = sum of Unpaid bills with due_date ≤ today + 30 days (overdue included). Safe-to-spend = cash on hand − Bills30. Level: "Not enough data yet" if the Business has no Transactions and no Bills; "At risk" if safe-to-spend < R0.00; "Watch" if safe-to-spend ≥ R0.00 and < 20% of Bills30; otherwise "Safe".	F4, F5, S6, S9
BR13	Debt Guard warning. When the Owner saves an Expense (new, or an edit that raises the amount) that is not created by "Mark paid", and safe-to-spend − the added amount < R0.00, show "This would leave you R[shortfall] short for bills due in the next 30 days. Save anyway?" with "Save anyway" and "Cancel". The same line shows on M6 when approving a Pending expense.	F3, F6, M1, M6
BR14	Dashboard period. Choices: This month, Last month, Last 3 months. Comparison period = the period of equal length immediately before. % change = (current − previous) ÷ previous × 100, rounded to a whole number. If previous is R0.00, show "No previous data".	F4, S6
BR15	Insights (maximum 4, shown in this order if true). (1) Expenses > income in the period: "Expenses are R[difference] higher than income this period." (2) One expense category ≥ 40% of total expenses: "[Category] is [percent]% of your expenses." (3) A bill due within 7 days: "[Bill name] (R[amount]) is due in [days] days." (4) Income up or down vs the comparison period: "Income is [up/down] [percent]% on the previous period." (5) Break-even not reached: "You have reached [percent]% of your break-even revenue this month." (5) shows only if a plan with a break-even exists. No insight is shown if there is no data.	F4, S6
BR16	Bills. Name 3–60 characters. Frequency: Once-off, Weekly or Monthly. Unpaid bills with due_date < today are "Overdue". "Mark paid" sets status Paid, sets paid_at, and creates one Approved Expense (same name, amount, category, today's date, payment method EFT). A Weekly or Monthly bill also creates the next Unpaid bill (due date + 7 days or + 1 month). "Mark paid" works once per bill.	F5, S9, M3
BR17	Flag: Large cash. An Approved transaction paid by Cash of R5,000.00 or more creates a Flag.	F7, S11
BR18	Flag: Possible split. A staff member creates 3 or more Expenses in the same category on the same day, each below R2,000.00, with a combined total of R2,000.00 or more. One Flag is created on the third transaction.	F7, S11
BR19	Flag: Amount changed. The amount of an Approved transaction is edited.	F7, S11
BR20	Flag: Deleted transaction. An Approved transaction is deleted.	F7, S11
BR21	Flag: Possible duplicate. Same creator, same amount, same description (not case-sensitive) and same date as another transaction.	F7, S11
BR22	Flag handling. Flags are advisory. Status starts Open. The Owner sets it to Reviewed with a note of 3–200 characters. Flag text always says "This is a warning, not proof of wrongdoing."	F7, S11
BR23	Team. At most 5 Staff (Accepted plus Pending invites) per Business. An invite matches a person who signs up with the same email (not case-sensitive). One Business per user.	F1, S10, M4
BR24	Abuse limit. A user can create at most 200 transactions per day.	F3, M1

4.5 Notifications (in-app only in v1; no push, SMS or marketing email. The only emails are the account emails in Section 5.)

Trigger	Who receives it	Channel	Exact text	Tapping it opens
A Pending transaction exists	Owner	In-app banner on S6 and S8	"[count] transaction(s) need your approval."	S8, Pending filter
Owner rejects a transaction	Staff who created it	In-app banner on S8	"Your transaction '[description]' was rejected: [reason]"	S8
Bill due within 7 days	Owner	In-app banner on S6 and S9	"[Bill name] (R[amount]) is due in [days] days."	S9
Risk level is At risk	Owner	In-app banner on S6	"Bills due in the next 30 days are R[amount] more than the cash you have."	S9
An Open flag exists	Owner	In-app red dot on the Review menu item	(dot only)	S11
5. Accounts and sign-in
Decision	Your answer
Sign-up methods	Email + password only
Who may sign up	Anyone with an email address who is 18 or older. Staff must use the email the Owner invited.
Minimum age	18. Sign Up has the checkbox "I am 18 or older", which must be ticked. This avoids needing parent consent under POPIA in v1.
Email verification	Required. After sign-up the user goes to S3 with the banner "Check your email and tap the link to verify your account." Log-in is refused until verified.
Password rules	At least 8 characters, including at least 1 number. Eye icon to show or hide.
Forgot password	S4 sends a reset link. The link works for 1 hour. The message is always "If an account exists for this email, we've sent a reset link."
Failed log-in attempts	After 5 wrong passwords in a row from the same browser: "Too many attempts. Try again in 15 minutes." The button stays disabled for 15 minutes. Supabase's own rate limits also apply.
Stay logged in	30 days, then the user must log in again
Log out	S10 → "Log out". No confirmation.
Delete account	S10 → "Delete account" → M5. Staff: the account and membership are deleted immediately; transactions they created stay, shown as "Former staff member". Owner: the whole Business and all its data are deleted immediately and permanently, and Staff lose access.
Change email	Not in v1
6. User stories, acceptance criteria and edge cases
6.1 Stories

US1 (F1): As a new user, I want to create an account so that I can use PocketVault.

T-US1-1: Given I am on S2, when I enter my full name, an email, a password of 8+ characters with a number, tick "I am 18 or older" and "I agree to the Privacy Notice", and tap "Create account", then my account is created and I go to S3 with the banner "Check your email and tap the link to verify your account."
T-US1-2 (unhappy): Given the email already has an account, when I tap "Create account", then I see "This email already has an account. Log in instead?" with a "Log in" link.
T-US1-3 (unhappy): Given a checkbox is unticked or the password is shorter than 8 characters or has no number, then "Create account" is greyed out, and leaving the password field shows a red border and "At least 8 characters, including a number."

US2 (F1): As a user, I want to log in and reset my password so that I can get back into my account.

T-US2-1: Given my email is verified, when I log in on S3, then I go to S5 if I am an Owner with no Business, S6 if I am an Owner with a Business, and S8 if I am Staff.
T-US2-2 (unhappy): Given I have not verified my email, when I tap "Log in", then I see "Please verify your email first." and a "Resend email" link.
T-US2-3 (unhappy): Given I enter a wrong password, when I tap "Log in", then I see "Email or password is incorrect." and my email stays in the field.
T-US2-4: Given I tap "Forgot password?" and enter my email on S4, when I tap "Send link", then I always see "If an account exists for this email, we've sent a reset link."

US3 (F1): As an Owner, I want to set up my business so that I can plan and track it.

T-US3-1: Given I am on S5, when I enter the name "Zodwa's Home Bakery", type "Bakery or catering", stage "Operating", opening balance R2,000.00 and tap "Create business", then I go to S7 with the toast "Business created. Start your plan."
T-US3-2 (unhappy): Given the name is shorter than 3 characters, when I tap "Create business", then I see "Enter a business name of 3 to 60 characters."
T-US3-3 (unhappy): Given the opening balance is negative or above R10,000,000.00, then I see "Enter an amount from R0.00 to R10,000,000.00."

US4 (F1): As an Owner, I want to invite staff so that they can record transactions.

T-US4-1: Given I am on S10, when I tap "Invite staff", enter lwazi@example.com in M4 and tap "Send invite", then M4 closes, the email appears in the team list with "Pending", and the toast says "Invite saved. Ask them to sign up with this email."
T-US4-2 (unhappy): Given I already have 5 staff (Accepted plus Pending), then "Send invite" shows "You have reached the limit of 5 staff."
T-US4-3: Given lwazi@example.com signs up, verifies and logs in, then Lwazi goes to S8 and the S10 team list shows "Staff".
T-US4-4 (unhappy): Given the email is not valid, then I see "Enter a valid email address."

US5 (F2): As an Owner, I want to add my expected costs and income so that I can see if the business will make a profit.

T-US5-1: Given I am on S7, when I choose "Monthly expense", enter "Rent" and R3,500.00 and tap "Add line", then the line appears in the list and "Monthly expenses" shows "R3,500.00".
T-US5-2: Given I choose "Income", enter "Chocolate cake", price R350.00, units 20 and cost per unit R120.00, then "Monthly revenue" shows "R7,000.00".
T-US5-3 (unhappy): Given the amount is R0.00 or empty, then I see "Enter an amount above R0.00."
T-US5-4 (unhappy): Given I already have 100 Plan lines, then I see "You can have up to 100 plan lines."

US6 (F2): As an Owner, I want to see profit, break-even and funding gap so that I know if my idea is realistic.

T-US6-1: Given startup total R10,000.00, monthly expenses R3,500.00, monthly revenue R7,000.00, variable cost R2,400.00 and available capital R6,000.00, then S7 shows Monthly profit "R1,100.00", Break-even revenue "R5,326.09", Funding gap "R4,000.00" and Payback "10 months".
T-US6-2 (unhappy): Given monthly revenue is R0.00 and monthly expenses are R3,500.00, then S7 shows "Loss: R3,500.00" and "Add an income line to see break-even."
T-US6-3 (unhappy): Given monthly profit is R0.00 or below, then Payback shows "Not reachable at these numbers."
T-US6-4: Given any plan result is shown, then the text "These are your estimates, not guaranteed results." is visible.

US7 (F3): As an Owner, I want to record income and expenses so that I always know where my money went.

T-US7-1: Given I am on S8, when I tap "Add transaction" and in M1 choose Expense, enter "Flour and sugar", R1,250.00, date 03 Nov 2026, category Stock, payment Card and tap "Save", then the row appears in the list with the chip "Approved" and the toast "Transaction saved".
T-US7-2 (unhappy): Given the date is in the future, then I see "Date cannot be in the future."
T-US7-3 (unhappy): Given the expense would make safe-to-spend negative (BR13), when I tap "Save", then I see "This would leave you R[shortfall] short for bills due in the next 30 days. Save anyway?" with "Save anyway" and "Cancel".
T-US7-4 (unhappy): Given the description is shorter than 3 characters, then I see "Enter a description of 3 to 80 characters."

US8 (F3): As a Staff member, I want to record sales and purchases so that the Owner can see them.

T-US8-1: Given I am Lwazi on S8, when I save an Expense of R2,400.00, then the row shows the chip "Pending" and the toast says "Sent to the owner for approval."
T-US8-2: Given I save an Expense of R1,250.00, then the row shows "Approved" at once.
T-US8-3 (unhappy): Given I am Staff, then S8 shows only my own transactions, there are no Edit or Delete buttons, and a direct database attempt to change a row is refused with "You can't do that."
T-US8-4 (unhappy): Given I have created 200 transactions today (BR24), when I tap "Save", then I see "You've reached today's limit of 200 transactions."

US9 (F3): As an Owner, I want to search, filter, edit and delete transactions so that my ledger stays correct.

T-US9-1: Given I type "flour", choose type Expense, category Stock and period This month, then only matching rows show and the totals line reads "Income R0.00 · Expenses R1,250.00".
T-US9-2: Given I edit an Approved transaction's amount from R1,250.00 to R1,500.00 and save, then the row updates, the toast says "Transaction updated", and an audit row and a Flag "Amount changed" are created.
T-US9-3: Given I tap Delete, enter the reason "Entered twice" in M2 and tap "Delete", then the row leaves the list and an audit row is created.
T-US9-4 (unhappy): Given the reason is empty or shorter than 3 characters, then I see "Enter a reason of 3 to 200 characters."

US10 (F4): As an Owner, I want one dashboard so that I can see my money and any danger of debt at a glance.

T-US10-1: Given I open S6 with the period "This month", then I see Total income, Total expenses, Net result, Cash on hand, Safe-to-spend and a risk badge.
T-US10-2: Given safe-to-spend is below R0.00, then the badge reads "At risk" with a warning icon and the banner says "Bills due in the next 30 days are R[amount] more than the cash you have."
T-US10-3 (unhappy): Given I have no transactions and no bills, then I see "Not enough data yet. Add your first transaction or bill." and no risk badge.
T-US10-4: Given expenses are higher than income in the period, then an insight reads "Expenses are R[difference] higher than income this period."

US11 (F5): As an Owner, I want to track my bills so that I never miss a payment.

T-US11-1: Given I am on S9, when I tap "Add bill", enter "Rent", R3,500.00, due date 28 Nov 2026, frequency Monthly, category Rent and tap "Save", then it appears under "Upcoming".
T-US11-2: Given I tap "Mark paid" on that bill, then it moves to "Paid", an Approved Expense "Rent" of R3,500.00 is created, a new bill is due 28 Dec 2026, and the toast says "Rent marked as paid."
T-US11-3 (unhappy): Given the amount is empty or R0.00, then I see "Enter an amount above R0.00."
T-US11-4 (unhappy): Given I am Staff, then S9 shows the bills but no Add, Edit, Delete or Mark paid buttons.

US12 (F6): As an Owner, I want to approve or reject staff expenses so that money does not leave without my knowledge.

T-US12-1: Given Lwazi has a Pending expense, when I open S8 I see the banner "1 transaction need(s) your approval.", open M6 and tap "Approve", then the status becomes Approved and it counts in totals.
T-US12-2: Given I tap "Reject" and enter the reason "Receipt missing", then the status becomes Rejected, it does not count in totals, and Lwazi sees the reason on S8.
T-US12-3 (unhappy): Given the rejection reason is empty, then I see "Enter a reason of 3 to 200 characters."

US13 (F7): As an Owner, I want to see warnings and a full history so that I can spot problems early.

T-US13-1: Given a Cash income of R6,000.00 was saved, then S11 shows the flag "Large cash transaction" with the amount, date and the text "This is a warning, not proof of wrongdoing."
T-US13-2: Given I tap "Mark reviewed" and enter the note "Wedding deposit, confirmed", then the flag status changes to Reviewed.
T-US13-3: Given I open the "Audit log" tab, then I see each change with who, what, old and new values, and when (SAST).
T-US13-4 (unhappy): Given I am Staff and open the Review address directly, then I see "You can't do that." and go to S8.
6.2 Edge cases
Situation	What the user sees (exact text)	What the app does
Staff is removed while logged in	"Your access to this business was removed."	Logs them out and goes to S3
Invited person signs up with a different email	S5 Business Setup is shown to them	They can create their own Business; the invite stays Pending
Owner double-taps "Mark paid"	Toast "Rent marked as paid." once	Creates only one expense and one next bill (BR16)
User loses internet while saving	"You're offline. Changes will not be saved."	Save buttons are disabled; typed text is kept
Login expires while M1 is open	"Please log in again."	Goes to S3; the typed transaction is not saved
Owner deletes a transaction that a flag points to	Flag text still shows the amount and date	The flag stays, linked to the deleted row
Two staff save at the same moment	Both rows saved	Each gets its own audit row; flags are recalculated by the database
Amount typed with a comma ("1,250.50")	Accepted	Treated as 1250.50
Pending expense approved after its date	Approved row keeps its original date	Counts in totals for that date
7. User flows and navigation map
7.1 Flows

Flow 1: Sign up to first plan line (F1, F2)
Starts when: Zodwa opens the app for the first time.

S1 Welcome: taps "Create account" → S2 Sign Up
S2: fills the form, taps "Create account" → S3 Log In with the verify banner
Taps the link in her email, returns, logs in on S3
If she is an Owner with no Business → S5 Business Setup; if an Owner with a Business → S6 Dashboard; if Staff → S8 Ledger
S5: enters business details, taps "Create business" → S7 Planner
S7: adds the "Rent" monthly expense line
Ends when: S7 shows "Monthly expenses R3,500.00".

Flow 2: Build and read a plan (F2)
Starts when: Zodwa is on S7 and wants to know if the bakery will make a profit.

S7: sets "Available capital"
S7: adds startup, monthly expense and income lines
If an amount is R0.00 → error "Enter an amount above R0.00."; otherwise → line is added and totals update
If monthly revenue is R0.00 → "Add an income line to see break-even."; otherwise → break-even revenue shows
Ends when: S7 shows profit or loss, break-even revenue, funding gap and payback.

Flow 3: Record a transaction (F3, F6)
Starts when: Lwazi or Zodwa is on S8 and wants to record money in or out.

S8: taps "Add transaction" → M1 Transaction
M1: fills the fields, taps "Save"
If the user is the Owner and BR13 applies → warning "Save anyway?"; otherwise → continue
If a Staff expense is R2,000.00 or more → saved as Pending with "Sent to the owner for approval."; otherwise → saved as Approved
Ends when: M1 closes and the row is at the top of S8.

Flow 4: Approve a staff expense (F6)
Starts when: Zodwa sees the approval banner.

S8: opens the Pending filter, taps the row → M6 Approve or Reject
If she taps "Approve" → status Approved; if she taps "Reject" → she enters a reason, then status Rejected
Ends when: the row leaves the Pending filter and Lwazi sees the result.

Flow 5: Check the Debt Guard (F4, F5)
Starts when: Zodwa opens the app in the morning.

S6: reads the risk badge and safe-to-spend
If the badge is "At risk" → taps the banner → S9 Bills
S9: taps "Mark paid" on a bill → expense created
Ends when: S6 shows the updated cash on hand and safe-to-spend.

Flow 6: Review flags (F7)
Starts when: Zodwa sees the red dot on Review.

S11 Review: opens the "Flags" tab, taps a flag
If she is satisfied → "Mark reviewed" with a note; otherwise → taps "Open transaction" → S8
Ends when: the flag shows Reviewed.
7.2 Navigation map

Mobile bottom tab bar (Owner: Home S6, Plan S7, Ledger S8, Bills S9, Settings S10; Staff: Ledger S8, Bills S9, Settings S10). S11 Review is reached from S6 and S10 on mobile and from the side menu on desktop.

Create account
Log in
Create account
Forgot password?
Back to log in
Owner with no business
Owner with business
Staff
Create business
Plan tab
Ledger tab
Bills tab or banner
Review flags
Settings tab
Add or edit transaction
Delete
Pending row
Add or edit bill
Delete
Invite staff
Delete account
Review and audit
Log out
Open transaction
S1 Welcome
S2 Sign Up
S3 Log In
S4 Forgot Password
S5 Business Setup
S6 Dashboard (tab)
S8 Ledger (tab)
S7 Planner (tab)
S9 Bills (tab)
S11 Review (menu)
S10 Settings (tab)
M1 Transaction
M2 Confirm Delete
M6 Approve or Reject
M3 Bill
M4 Invite Staff
M5 Delete Account
8. Screens
8.1 Screen inventory
ID	Screen name	Type	Who can open it	Purpose	Tab bar shown?	Stories
S1	Welcome	Full screen	Logged out	Logo, tagline, pitch, "Create account" and "Log in"	No	US1, US2
S2	Sign Up	Full screen	Logged out	Create an account	No	US1
S3	Log In	Full screen	Logged out	Log in; verify-email banner	No	US2
S4	Forgot Password	Full screen	Logged out	Request a reset link	No	US2
S5	Business Setup	Full screen	Logged in: Owner without a Business	Create the Business (this is the onboarding)	No	US3
S6	Dashboard	Tab	Logged in: Owner	Income, expenses, cash, Debt Guard, insights	Yes	US10
S7	Planner	Tab	Logged in: Owner	Build and read the financial plan	Yes	US5, US6
S8	Ledger	Tab	Logged in: Owner, Staff	Record, search and manage transactions	Yes	US7, US8, US9, US12
S9	Bills	Tab	Logged in: Owner (manage), Staff (view)	Track bills and mark them paid	Yes	US11
S10	Settings	Tab	Logged in: Owner, Staff	Business details, team, privacy notice, log out, delete account	Yes	US3, US4
S11	Review	Full screen (menu item)	Logged in: Owner	Flags and audit log	Yes	US13
M1	Transaction	Modal (full height on mobile)	Logged in: Owner, Staff	Add or edit a transaction	—	US7, US8, US9
M2	Confirm Delete	Modal	Logged in: Owner	Confirm deleting a transaction (reason) or a bill	—	US9, US11
M3	Bill	Modal	Logged in: Owner	Add or edit a bill	—	US11
M4	Invite Staff	Modal	Logged in: Owner	Invite a staff email	—	US4
M5	Delete Account	Modal	Logged in: Owner, Staff	Confirm permanent deletion	—	US1
M6	Approve or Reject	Bottom sheet	Logged in: Owner	Approve or reject a Pending transaction	—	US12

Not needed: a separate profile screen and onboarding slides. S5 is the onboarding, and the Privacy Notice, log out and delete account live on S10.

8.2 Screen specifications

(Error state everywhere: "Something went wrong. Try again." with a "Try again" button. Offline everywhere: the Offline banner in 8.3. Both are defined once in 8.3.)

S1 Welcome

Purpose: Introduce PocketVault and start sign-up or log-in.
Who: Logged out. Comes from: app start. Goes to: S2, S3.
Layout: 1. Logo mark (centred). 2. Wordmark "PocketVault". 3. Tagline "Home for your finances." 4. Line "Plan your business, track every rand, and stay out of debt." 5. Primary button "Create account". 6. Secondary button "Log in". 7. Small link "Privacy Notice".
Buttons: "Create account" → S2; "Log in" → S3.
States: Normal only. Empty, Loading, Error, Offline, Success: not needed because there is no data.
Sample content: tagline and pitch text as above.

S2 Sign Up

Purpose: Create an account. Who: Logged out. From S1 → to S3.
Layout: 1. Header: back arrow, "Create account". 2. Form. 3. Primary button.
Form fields: Full name (text, required, "Full name", 1–60 characters, "Enter your full name"); Email (email, required, "Email address", "Enter a valid email address"); Password (password, required, "Password", 8+ characters with a number, "At least 8 characters, including a number."); checkbox "I am 18 or older" (required); checkbox "I agree to the Privacy Notice" (required, unticked, link opens the notice).
Buttons: "Create account" (greyed out until valid) → S3. "Log in" link → S3.
States: Normal: form. Loading: button shows spinner. Error: "This email already has an account. Log in instead?" Success: go to S3 with the verify banner. Empty: not needed because it is a form.
Sample: Zodwa Mthembu, zodwa@example.com.

S3 Log In

Purpose: Log in. Who: Logged out. From S1, S2, S4 → to S5, S6, S8.
Layout: 1. Header: back arrow, "Log in". 2. Verify banner (after sign-up). 3. Email field. 4. Password field with eye icon. 5. Link "Forgot password?". 6. Primary button "Log in". 7. Link "Create account".
Form fields: Email (email, required, "Email address", "Enter a valid email address"); Password (password, required, "Password", "Enter your password").
Buttons: "Log in" → S5, S6 or S8 (US2). "Forgot password?" → S4. "Resend email" (when unverified).
States: Normal. Loading: spinner on the button. Error: "Email or password is incorrect." / "Please verify your email first." / "Too many attempts. Try again in 15 minutes." Success: go to the screen by role.
Sample: lwazi@example.com.

S4 Forgot Password

Purpose: Request a reset link. Who: Logged out. From S3 → to S3.
Layout: 1. Header: back arrow, "Reset password". 2. Text "Enter your email and we'll send you a link. It works for 1 hour." 3. Email field. 4. Primary button "Send link".
States: Normal. Success: "If an account exists for this email, we've sent a reset link." Error and Offline: shared.
Buttons: "Send link"; "Back to log in" → S3.

S5 Business Setup

Purpose: Create the Business. Who: Logged in, Owner without a Business. From S3 → to S7.
Layout: 1. Header: "Set up your business". 2. Step text "This takes about a minute." 3. Form. 4. Primary button "Create business".
Form fields: Business name (text, required, "e.g. Zodwa's Home Bakery", 3–60); Business type (dropdown, required, list in Section 10); Short description (text area, optional, 0–200); Business stage (dropdown, required: Idea, Starting, Operating); Opening balance (money, required, "R0.00", R0.00–R10,000,000.00, "Enter an amount from R0.00 to R10,000,000.00."); Available capital (money, optional, "R0.00", same rule).
Buttons: "Create business" → S7.
States: Normal. Loading: spinner. Error: shared. Success: S7 with "Business created. Start your plan." Empty: not needed because it is a form.
Sample: Zodwa's Home Bakery, Bakery or catering, Operating, R2,000.00.

S6 Dashboard

Purpose: See the money and Debt Guard at a glance. Who: Owner. From S3, tabs → to S7, S8, S9, S10, S11.
Layout: 1. Header: "Dashboard" and period dropdown (This month, Last month, Last 3 months). 2. Banners (approval, bill due, At risk). 3. Cash card: "Cash on hand" big number, "Safe-to-spend", Risk badge. 4. Stat cards: Total income, Total expenses, Net result, each with % vs the previous period. 5. Bar chart "Income and expenses" by month (Last 3 months) or by week. 6. Expense breakdown by category (bars with percentages and labels). 7. "Upcoming bills" list (next 5, due date and amount). 8. "Insights" cards (BR15). 9. Break-even progress bar (if a plan exists). 10. Link "Review flags".
Buttons: banner → S8 or S9; "Review flags" → S11; "See all bills" → S9.
States: Normal: as above. Empty: "Not enough data yet. Add your first transaction or bill." with buttons "Add transaction" → S8 and "Add bill" → S9. Loading: grey cards and chart placeholder. Error, Offline: shared. Success: not needed because there is no action.
Sample: Zodwa's Home Bakery, This month: Income R10,800.00; Expenses R4,250.00; Net R6,550.00; Cash on hand R10,950.00; Safe-to-spend R5,651.00; badge "Safe"; insight "Stock is 59% of your expenses."

S7 Planner

Purpose: Build and read the plan. Who: Owner. From S5 or tabs.
Layout: 1. Header: "Plan". 2. Note "These are your estimates, not guaranteed results." 3. Available capital field with "Save". 4. Results card: Startup total, Monthly expenses, Monthly revenue, Monthly profit or "Loss", Break-even revenue, Funding gap, Payback. 5. Tabs (chips): "Startup costs", "Monthly expenses", "Income". 6. List of Plan lines for the chosen tab. 7. Add-line form (inline). 8. Primary button "Add line".
Lists: Plan line row: name, amount (for Income: "R350.00 × 20 units" and cost per unit), buttons "Edit" and "Delete".
Form fields: Name (text, required, "e.g. Rent", 3–60, "Enter a name of 3 to 60 characters."); Amount or Price per unit (money, required, "R0.00", "Enter an amount above R0.00."); Units per month (whole number, Income only, required, "20", 1–100,000, "Enter a whole number from 1 to 100,000."); Cost per unit (money, Income only, optional, "R0.00", "Enter an amount from R0.00."); Quantity (whole number, Startup cost only, "1", 1–1,000, "Enter a whole number from 1 to 1,000.").
Buttons: "Add line"; "Edit" fills the form and the button reads "Save line"; "Delete" removes the line after M2-style confirmation by tapping again ("Tap again to delete").
States: Normal. Empty: "No lines yet. Add your first cost or income to see if your business can make a profit." with "Add line". Loading: grey results card and 3 grey rows. Success: toast "Line added" or "Line updated". Error, Offline: shared. Break-even and payback messages per US6.
Sample: "Rent" R3,500.00 (monthly); "Oven" R8,500.00 × 1 (startup); "Chocolate cake" R350.00 × 20, cost R120.00 (income).

S8 Ledger

Purpose: Record and manage transactions. Who: Owner, Staff. From tabs, S6, S11 → to M1, M2, M6.
Layout: 1. Header: "Ledger" with "Add transaction" button. 2. Banners (Owner: approval; Staff: rejection). 3. Search field. 4. Filters: Type, Category, Status, Period. 5. Totals line (Owner only): "Income R… · Expenses R…". 6. Transaction rows. 7. "Load more" (20 per page).
Transaction row: description, category, date (e.g. "03 Nov 2026"), payment method, amount (green "+" for Income, dark "−" for Expense, with the word Income or Expense), status chip (Approved, Pending, Rejected), creator name (Owner view). Owner buttons: "Edit", "Delete". Pending rows (Owner) open M6.
Buttons: "Add transaction" → M1; "Edit" → M1; "Delete" → M2; Pending row → M6.
States: Normal. Empty: "No transactions yet. Record your first sale or purchase." with "Add transaction". No matches: "No transactions match. Clear filters." with "Clear filters". Loading: 5 grey rows. Success: toast "Transaction saved" / "Transaction updated" / "Sent to the owner for approval." Staff sees only own rows and no Edit or Delete.
Sample: "Cake sales", R4,800.00, 02 Nov 2026, Product sales, EFT, Approved; "Oven repair", R2,400.00, 05 Nov 2026, Maintenance, Cash, Pending (Lwazi Ndlovu); "Wedding deposit", R6,000.00, 09 Nov 2026, Deposits, Cash, Approved.

S9 Bills

Purpose: Track and pay bills. Who: Owner (manage), Staff (view only). From tabs, S6.
Layout: 1. Header: "Bills" with "Add bill" (Owner). 2. Summary: "Due in the next 30 days: R…". 3. Sections: "Overdue", "Upcoming", "Paid" (last 10).
Bill row: name, due date (e.g. "28 Nov 2026"), frequency, amount, status chip (Overdue, Upcoming, Paid), Owner buttons "Mark paid", "Edit", "Delete".
Buttons: "Add bill" → M3; "Edit" → M3; "Delete" → M2; "Mark paid" (BR16).
States: Normal. Empty: "No bills yet. Add rent, electricity or loan repayments so Debt Guard can protect you." with "Add bill". Loading: 3 grey rows. Success: toast "[Bill name] marked as paid." Error, Offline: shared.
Sample: Rent R3,500.00 due 28 Nov 2026 Monthly; Loan repayment R1,200.00 due 30 Nov 2026 Monthly; Internet R599.00 due 01 Dec 2026 Monthly.

S10 Settings

Purpose: Business details, team and account. Who: Owner, Staff. From tabs → to M4, M5, S11, S1.
Layout: 1. Header: "Settings". 2. Business card: name, type, stage (Owner: "Edit" inline). 3. Team list (Owner): email, role (Owner, Staff), invite status (Pending, Accepted), "Remove" for Staff, button "Invite staff". 4. Menu: "Review and audit" (Owner, with red dot if flags are Open) → S11; "Privacy Notice"; "Log out"; "Delete account" (Danger).
Buttons: "Invite staff" → M4; "Remove" → team member is removed and the invite set to Revoked; "Review and audit" → S11; "Log out" → S1; "Delete account" → M5.
States: Normal. Empty (team): "No staff yet. Invite someone to record transactions." Loading: grey rows. Success: toast "Staff removed" / "Business updated". Error, Offline: shared.
Sample: Zodwa's Home Bakery; lwazi@example.com, Staff, Accepted.

S11 Review

Purpose: Check flags and the audit log. Who: Owner. From S6, S10 → to S8.
Layout: 1. Header: back arrow, "Review". 2. Tabs: "Flags", "Audit log". 3. Note "These are warnings, not proof of wrongdoing."
Flag card: rule name (e.g. "Large cash transaction"), transaction description, amount, date, creator, status chip (Open, Reviewed), buttons "Open transaction", "Mark reviewed" (asks for a note).
Audit row: date-time (SAST), actor name, action (Created, Edited, Deleted, Approved, Rejected), transaction description, old and new amount, reason.
Buttons: "Open transaction" → S8; "Mark reviewed" → saves note.
States: Normal. Empty (Flags): "No flags. Nothing looks unusual." Empty (Audit log): "No history yet." Loading: 3 grey cards. Success: toast "Flag reviewed". Error, Offline: shared.
Sample: "Large cash transaction · Wedding deposit · R6,000.00 · 09 Nov 2026 · Open"; audit: "10 Nov 2026 14:05, Zodwa Mthembu, Edited, Cake sales, R4,800.00 → R4,850.00."

M1 Transaction (modal)

Purpose: Add or edit a transaction. Who: Owner, Staff (Staff add only). From S8 → to S8.
Layout: 1. Title "Add transaction" or "Edit transaction". 2. Type toggle (Income, Expense). 3. Fields. 4. Primary button "Save", secondary "Cancel".
Form fields: Description (text, required, "e.g. Flour and sugar", 3–80, "Enter a description of 3 to 80 characters."); Amount (money, required, "R0.00", "Enter an amount above R0.00."); Date (date, required, today by default, "Date cannot be in the future."); Category (dropdown, required, list by type); Payment method (dropdown, required: Cash, Card, EFT, Other); Notes (text area, optional, 0–300).
States: Normal. Debt Guard warning (BR13): inline warning block with "Save anyway" and "Cancel". Loading: spinner on Save. Error and Offline: shared. Success: closes, toast.
Sample: Expense, "Flour and sugar", R1,250.00, 03 Nov 2026, Stock, Card.

M2 Confirm Delete (modal)

Purpose: Confirm deleting a transaction or bill. Who: Owner. From S8, S9.
Layout: 1. Title "Delete [transaction or bill]?" 2. Text "This removes it from your totals. A record is kept in the audit log." (transactions) or "This removes the bill." (bills). 3. Reason field (transactions only: text, required, "Why are you deleting this?", 3–200, "Enter a reason of 3 to 200 characters."). 4. Danger button "Delete", secondary "Cancel".
States: Normal; Loading spinner; Error and Offline shared; Success: closes with toast "Deleted".

M3 Bill (modal)

Purpose: Add or edit a bill. Who: Owner. From S9.
Form fields: Name (text, required, "e.g. Rent", 3–60, "Enter a name of 3 to 60 characters."); Amount (money, required, "R0.00", "Enter an amount above R0.00."); Due date (date, required, "Choose a due date."); Frequency (dropdown, required: Once-off, Weekly, Monthly); Category (dropdown, required, expense categories).
Buttons: "Save", "Cancel". States: Normal; Loading; Error and Offline shared; Success: closes, toast "Bill saved".
Sample: Loan repayment, R1,200.00, 30 Nov 2026, Monthly, Loan repayment.

M4 Invite Staff (modal)

Purpose: Invite a staff email. Who: Owner. From S10.
Layout: 1. Title "Invite staff". 2. Text "Ask them to sign up with this email." 3. Email field (email, required, "staff@email.com", "Enter a valid email address."). 4. "Send invite" and "Cancel".
States: Normal; Error: "You have reached the limit of 5 staff."; Success: closes, toast "Invite saved. Ask them to sign up with this email."

M5 Delete Account (modal)

Purpose: Confirm permanent deletion. Who: Owner, Staff. From S10.
Layout: 1. Title "Delete your account?" 2. Owner text: "This permanently deletes your business, plan, transactions, bills and team. This cannot be undone." Staff text: "This permanently deletes your account. Transactions you recorded stay in the business as 'Former staff member'." 3. Field "Type DELETE to confirm" (text, required, "DELETE", "Type DELETE to confirm."). 4. Danger button "Delete my account", secondary "Cancel".
States: Normal; Loading; Success: go to S1 with toast "Account deleted"; Error and Offline shared.

M6 Approve or Reject (bottom sheet)

Purpose: Decide on a Pending transaction. Who: Owner. From S8.
Layout: 1. Title "Approve this transaction?" 2. Details: description, amount, date, category, payment, created by. 3. Debt Guard line if BR13 applies. 4. Reason field (shown when "Reject" is tapped: text, required, "Why are you rejecting this?", 3–200, "Enter a reason of 3 to 200 characters."). 5. Primary "Approve", Danger "Reject", secondary "Cancel".
States: Normal; Loading; Error and Offline shared; Success: closes, toast "Transaction approved" or "Transaction rejected".
8.3 Shared components
Component	Used on	What it contains	How it behaves
Navigation	S6–S11	Mobile: bottom tab bar, 5 icons with labels. Tablet: left rail, icons only. Desktop: left side menu with labels and logo	Active item filled in Vault Green; red dot on Review when flags are Open; Staff see only Ledger, Bills, Settings
Header	All logged-in screens	Title, optional back arrow, optional action button	Sticky at the top
Primary button	All	Vault Green fill, white text, 48px high	Hover darker; focus ring 2px Lime; disabled grey
Secondary button	All	White fill, Vault Green border and text	Same states
Danger button	M2, M5, M6, S10	Error red fill, white text	Same states
Field	All forms	Label above, input, error message below	Error: red border plus message with icon; keeps the user's text
Stat card	S6, S7	Label, big number, optional % change with arrow icon	Static
Risk badge	S6	Words "Safe", "Watch", "At risk" or "Not enough data yet" with an icon	Colour plus icon plus words, never colour alone
Transaction row	S8, S6	As in S8 spec	Tap opens M1 (Owner) or M6 (Pending)
Status chip	S8, S9, S11	Words with icon: Approved, Pending, Rejected, Overdue, Upcoming, Paid, Open, Reviewed	Static
Banner	S6, S8, S9	Icon, one line of text, tap target	Gold fill for warnings, red for At risk
Toast	All	One line, dark background, white text	Disappears after 3 seconds
Confirmation pop-up	M2, M5	Title, text, buttons	Traps focus; Esc closes
Empty-state block	S6–S11	Flat illustration (arches and circles), text, button	Shown when there is no data
Loading placeholder	All	Grey blocks the shape of the content	Shown until data loads
Offline banner	All logged-in	Grey bar "You're offline. Changes will not be saved."	Save buttons disabled while shown
Error block	All logged-in	"Something went wrong. Try again." and "Try again"	Retries the load
8.4 Sample data set
Entity	Records
Users	Zodwa Mthembu (Owner, zodwa@example.com); Lwazi Ndlovu (Staff, lwazi@example.com); Pieter van Wyk (Owner, pieter@example.com)
Businesses	Zodwa's Home Bakery, Soweto, Bakery or catering, Operating, opening balance R2,000.00, available capital R6,000.00; Pieter's Car Wash, Pretoria, Car wash or cleaning, Operating, opening balance R500.00
Transactions (bakery)	Cake sales, Income, R4,800.00, 02 Nov 2026, Product sales, EFT, Zodwa. Flour and sugar, Expense, R1,250.00, 03 Nov 2026, Stock, Card, Lwazi, Approved. Oven repair, Expense, R2,400.00, 05 Nov 2026, Maintenance, Cash, Lwazi, Pending. Wedding deposit, Income, R6,000.00, 09 Nov 2026, Deposits, Cash, Zodwa (creates a Large cash flag). Electricity prepaid, Expense, R600.00, 10 Nov 2026, Electricity, Card, Zodwa
Transactions (car wash)	Car wash takings, Income, R1,500.00, 04 Nov 2026, Service revenue, Cash; Soap and polish, Expense, R900.00, 06 Nov 2026, Materials, Card
Bills (bakery)	Rent R3,500.00 due 28 Nov 2026 Monthly; Loan repayment R1,200.00 due 30 Nov 2026 Monthly; Internet R599.00 due 01 Dec 2026 Monthly
Bills (car wash)	Premises rent R3,000.00 due 28 Nov 2026 Monthly (cash R1,100.00 − R3,000.00 gives safe-to-spend −R1,900.00, "At risk")
Plan lines (bakery)	Oven R8,500.00 (Startup cost); Rent R3,500.00 (Monthly expense); Chocolate cake R350.00 × 20, cost R120.00 (Income)
9. Design direction

9.1 Look and brand (colours taken from your three reference images: deep forest green, lime, mustard gold, sage and cream)

Item	Your choice
Look and feel (3 words)	Calm, trustworthy, modern
Primary colour	Vault Green #1F4D3A (white text on it is above 9:1)
Secondary / accent colour	Lime Glow #D6E64B (accent fills, with Ink text on top) and Harvest Gold #E6B73F (warnings, with Ink text on top)
Supporting colours	Sage #9DB59A and Mist Blue #B9CCD6 (chart bars and illustrations only, never for text)
Background colour	Cream #FAF6EA; cards White #FFFFFF
Main text colour	Ink #14281F; secondary text Moss #4A5D52
Error / success / warning colours	#B3261E / #1B7A43 / #7A5200 (text) on white or cream
Dark mode	No (v1)
Font	Inter (fonts.google.com)
Text sizes	Big number 32px bold; title 24px bold; heading 18px semibold; body 16px regular; small 12px regular
Spacing unit	4px; gaps 4, 8, 16, 24 or 32px
Screen side margin	16px mobile, 24px tablet, 32px desktop
Corner radius	Cards 16px; inputs and buttons 12px; chips pill
Shadows	Soft (0 2px 8px rgba(20, 40, 31, 0.08))
Button height	48px
Icon set	Lucide, outline (filled when active)
Logo	Rounded square in Vault Green holding a cream house outline with a Lime Glow circle as the keyhole; wordmark "PocketVault" in Inter bold, Vault Green
Images and illustrations	Flat geometric illustrations (arches, circles, sage and gold) for Welcome and empty states, as in your reference mood boards. No photos. Avatars show initials in a Sage circle
Reference apps	Your dashboard reference image (green and lime fintech layout: big balance, stat cards, bar chart); Monzo (clear spending categories and plain language)

Contrast check: I estimated the ratios (Ink on Cream about 14:1, Moss on Cream about 6.5:1, Ink on Lime about 11:1, White on Vault Green about 9:1, error, success and warning text on white above 4.5:1). Confirm each pair at webaim.org/resources/contrastchecker before setting the status to In review.

9.2 Tone of voice: Plain, calm and encouraging, never scary or technical: "You're all set. Rent is paid." rather than "Transaction successfully committed." Warnings say what happened and what to do: "Bills due in the next 30 days are R1,900.00 more than the cash you have."

9.3 Platform rules

Web, mobile first (390 × 844), then desktop (1440 wide).
Under 640px: single column, bottom tab bar, M1, M3 and M4 full height, M6 a bottom sheet.
640–1024px: left rail with icons only, two-column stat cards.
Over 1024px: left side menu with labels (240px), content up to a maximum width of 1200px, modals centred (max 480px wide).
Main buttons sit at the bottom within thumb reach on mobile. Content stays clear of the phone's top status bar and bottom edge.
Every clickable thing has a hover look and a 2px Lime keyboard-focus ring with a Vault Green inner outline.
S6 and S7 look different on desktop (two-column cards and charts); all other screens only get wider.

9.4 Accessibility

Body text at least 16px; small text at least 12px.
Text contrast at least 4.5 to 1.
Everything tappable is at least 44 × 44px.
Never colour alone: Income, Expense, status chips and risk badges always have words and an icon.
Every icon-only button and every chart has a text label for screen readers; charts have a text table alternative.
10. Data model

All fields shown on a screen in Section 8 appear below. Derived numbers (totals, cash on hand, risk level) are calculated by BR rules, not stored.

10.1 Entities and fields

Entity: User: one person with an account.

Field	Type	Required?	Default	Unique?	Rules	If the linked record is deleted
id	ID	Yes	Auto	Yes	Same as the login account ID	—
email	Email	Yes	—	Yes	Lower-case; shown only to the Owner of the same Business	—
full_name	Text (60)	Yes	—	No	1–60 characters	—
is_18_or_older	Yes/No	Yes	—	No	Must be Yes	—
created_at	Date-time	Yes	Now	No	—	—

Entity: Business: one workspace for one business.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
name	Text (60)	Yes	—	No	3–60 characters	—
type	Choice	Yes	—	No	Bakery or catering; Clothing or retail; Beauty or barbering; Car wash or cleaning; Spaza or general shop; Freelance or professional services; Events or photography; Repairs or construction; Online selling; Farming; Other	—
description	Long text (200)	No	—	No	0–200 characters	—
stage	Choice	Yes	—	No	Idea; Starting; Operating	—
opening_balance	Money (ZAR)	Yes	R0.00	No	BR1	—
available_capital	Money (ZAR)	Yes	R0.00	No	BR1	—
owner_id	Link to User	Yes	Current user	No	—	Delete this too
created_at	Date-time	Yes	Now	No	—	—

Entity: Membership: one user's role in one Business.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	—	Delete this too
user_id	Link to User	Yes	—	Yes	One Business per user (BR23)	Delete this too
role	Choice	Yes	—	No	Owner; Staff	—
created_at	Date-time	Yes	Now	No	—	—

Entity: Invite: an Owner's invitation for a staff email.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	The pair (business_id, email) is unique	Delete this too
email	Email	Yes	—	No	Lower-case; BR23	—
status	Choice	Yes	Pending	No	Pending; Accepted; Revoked	—
created_at	Date-time	Yes	Now	No	—	—

Entity: PlanLine: one row in the plan.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	At most 100 per Business (BR5)	Delete this too
kind	Choice	Yes	—	No	Startup cost; Monthly expense; Income	—
name	Text (60)	Yes	—	No	3–60 characters	—
amount	Money (ZAR)	Yes	—	No	Above R0.00 (BR1). For Income this is the price per unit	—
quantity	Whole number	Yes	1	No	Startup cost: 1–1,000; Monthly expense: always 1; Income: 1–100,000 (units per month)	—
unit_cost	Money (ZAR)	Yes	R0.00	No	Income only; R0.00 for other kinds	—
created_at	Date-time	Yes	Now	No	—	—

Entity: Transaction: one real income or expense.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	—	Delete this too
created_by	Link to User	No	Current user	No	Set to empty when the user is deleted	Clear the field
description	Text (80)	Yes	—	No	3–80 characters	—
amount	Money (ZAR)	Yes	—	No	BR1	—
type	Choice	Yes	—	No	Income; Expense	—
category	Choice	Yes	—	No	Income: Product sales; Service revenue; Deposits; Other income. Expense: Rent; Electricity; Water; Internet; Stock; Materials; Transport; Marketing; Salaries; Equipment; Insurance; Subscriptions; Maintenance; Loan repayment; Other expenses	—
payment_method	Choice	Yes	—	No	Cash; Card; EFT; Other	—
transaction_date	Date	Yes	Today	No	Not in the future (BR6)	—
notes	Long text (300)	No	—	No	0–300 characters	—
status	Choice	Yes	Approved	No	Approved; Pending; Rejected (BR7)	—
rejection_reason	Text (200)	No	—	No	Required when Rejected; 3–200	—
deleted_at	Date-time	No	—	No	Set by a soft delete (BR9)	—
created_at	Date-time	Yes	Now	No	—	—
updated_at	Date-time	Yes	Now	No	—	—

Entity: TransactionAudit: one history row for a transaction change (never edited or deleted by users).

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	—	Delete this too
transaction_id	Link to Transaction	Yes	—	No	—	Block the delete (transactions are only soft-deleted)
actor_id	Link to User	No	Current user	No	—	Clear the field
action	Choice	Yes	—	No	Created; Edited; Deleted; Approved; Rejected	—
old_amount	Money (ZAR)	No	—	No	Filled on Edited	—
new_amount	Money (ZAR)	No	—	No	Filled on Created and Edited	—
reason	Text (200)	No	—	No	Filled on Deleted and Rejected	—
created_at	Date-time	Yes	Now	No	—	—

Entity: Bill: one payment the business must make.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	—	Delete this too
name	Text (60)	Yes	—	No	3–60 characters	—
amount	Money (ZAR)	Yes	—	No	BR1	—
due_date	Date	Yes	—	No	—	—
frequency	Choice	Yes	Once-off	No	Once-off; Weekly; Monthly	—
category	Choice	Yes	—	No	Any Expense category	—
status	Choice	Yes	Unpaid	No	Unpaid; Paid	—
paid_at	Date-time	No	—	No	Set when marked Paid	—
created_at	Date-time	Yes	Now	No	—	—

Entity: Flag: one advisory warning.

Field	Type	Required?	Default	Unique?	Rules	If deleted
id	ID	Yes	Auto	Yes	—	—
business_id	Link to Business	Yes	—	No	—	Delete this too
transaction_id	Link to Transaction	Yes	—	No	—	Block the delete (transactions are only soft-deleted)
rule	Choice	Yes	—	No	Large cash; Possible split; Amount changed; Deleted transaction; Possible duplicate	—
status	Choice	Yes	Open	No	Open; Reviewed	—
reviewed_by	Link to User	No	—	No	—	Clear the field
review_note	Text (200)	No	—	No	Required when Reviewed; 3–200	—
created_at	Date-time	Yes	Now	No	—	—
10.2 Relationships
One User has one Membership (one Business per user).
One Business has many Memberships, Invites, PlanLines, Transactions, Bills and Flags.
One Business has one Owner (Business.owner_id) and up to 5 Staff.
One Transaction has many TransactionAudit rows and many Flags.
One User creates many Transactions.
10.3 Status values and changes
Entity.field	From	To	Who or what causes it
Transaction.status	(new)	Approved or Pending	Automatic on save (BR7)
Transaction.status	Pending	Approved	Owner taps "Approve" (M6)
Transaction.status	Pending	Rejected	Owner taps "Reject" with a reason (M6)
Bill.status	Unpaid	Paid	Owner taps "Mark paid" (BR16)
Invite.status	Pending	Accepted	Invited person signs up and verifies (BR23)
Invite.status	Pending	Revoked	Owner removes the invite
Flag.status	Open	Reviewed	Owner taps "Mark reviewed" with a note (BR22)
10.4 Reference and seed data
Reference data: the Business type, category and payment-method lists are fixed Choice values in the database. They need no loading and are maintained by me in migrations.
Seed data: the sample data set in 8.4 (3 users, 2 Businesses, 7 transactions, 4 bills, 3 plan lines), created by the seed script.
Test accounts (one per role, test-only password in supabase/seed/README.md, never here): zodwa@example.com (Owner), lwazi@example.com (Staff), pieter@example.com (Owner of a second Business, used to prove one Business cannot see another's data).
11. Tech stack and architecture

11.1 Stack

Layer	Your choice (with version)	Why
Frontend	React 18 with TypeScript 5 and Vite 5, React Router 6, Recharts 2	Covered in the course; fast builds; charts for S6
Styling	Tailwind CSS 3.4	Design tokens map to Tailwind config
Backend / API	Supabase (supabase-js 2) with database functions and triggers	Rules enforced in the database
Database	PostgreSQL (Supabase)	Row-Level Security, triggers and constraints
Log-in	Supabase Auth (email + password, email verification)	Passwords never touch my code
File / image storage	None	No images in v1
Scheduled jobs	None	Overdue status is calculated when a screen loads (BR16); nothing changes by itself over time
Hosting / demo	Vercel (frontend) with a live URL; Supabase hosted project	Free tiers, automatic deploys from GitHub
Language and package manager	TypeScript, npm, Node.js 20 LTS	Fewer bugs through typing
Testing	Vitest 2 with Testing Library for BR2, BR3, BR4, BR7, BR11–BR15, BR17–BR21; manual checklist for all T- criteria; GitHub Actions CI runs lint, typecheck, tests and build on every pull request	The money and fraud rules are the riskiest
Version control	https://github.com/Thandokuhle18/PocketVault	docs/PRD.md and IMPLEMENTATION_PLAN.md (the MASTER.md build plan) in the repository; work done through Issues, branches and pull requests

11.2 Third-party services: None beyond Supabase and Vercel (no payments, SMS or maps).

11.3 How the parts connect: The React app runs in the browser and talks to Supabase with the supabase-js client over HTTPS. Supabase Auth handles sign-up and log-in. The database enforces every permission with RLS. Triggers create audit rows, flags, Pending status and the one-per-user membership, so rules do not depend on the screen. The project region is South Africa (Cape Town), so personal data stays in South Africa.

11.4 Permissions (RLS)

Entity	Action	Who is allowed	Extra rule
User	Read	Self; Owner of the same Business	Only full_name and email
User	Update / delete	Self only	—
Business	Read	Members of the Business	—
Business	Create	Any logged-in user without a Membership	The creator becomes Owner
Business	Update / delete	Owner only	—
Membership	Read	Members of the same Business	—
Membership	Delete	Owner (for Staff); self	—
Invite	Read / create / update	Owner only	BR23 limit
PlanLine	Read / create / update / delete	Owner only	BR5 limit
Transaction	Read	Owner (all in Business); Staff (own only)	Not deleted
Transaction	Create	Owner, Staff	Status set by trigger (BR7); BR24 limit
Transaction	Update	Owner only	Writes audit row
Transaction	Delete	Owner only (soft delete)	Reason required; writes audit row
Transaction	Approve / reject	Owner only	Status change from Pending only
TransactionAudit	Read	Owner only	Created only by triggers; never updated or deleted
Bill	Read	Owner, Staff	—
Bill	Create / update / delete	Owner only	—
Flag	Read / update (review)	Owner only	Created only by triggers

11.5 Environment variables and secrets

Name	What it is	Where to get it	Public or secret?
VITE_SUPABASE_URL	Project address	Supabase dashboard → Project Settings → API	Public: safe in the app
VITE_SUPABASE_ANON_KEY	Public (anon) key	Same	Public: safe only because RLS is on for every table
SUPABASE_SERVICE_ROLE_KEY	Admin (service role) key	Same	Secret: used only by the seed script, never in the app

Real values live in .env, which is never uploaded to GitHub. A .env.example with the same names and placeholder values is committed.

11.6 Folder structure

src/pages/           one file per S# (Welcome.tsx, Dashboard.tsx, Planner.tsx, ...)
src/components/      Navigation, Header, StatCard, RiskBadge, TransactionRow, Toast, OfflineBanner, modals M1-M6
src/lib/             Supabase client, money format, business-rule functions (BR2-BR4, BR7, BR11-BR15, BR17-BR21)
src/lib/__tests__/   Vitest tests
supabase/migrations/ tables, triggers, RLS policies
supabase/seed/       seed script and README with test logins
.github/workflows/   CI: lint, typecheck, test, build
docs/                PRD.md, designs/ (Stitch exports), idea.md
BUSINESS.md  README.md  IMPLEMENTATION_PLAN.md

11.7 Testing plan

Every T- criterion is tested manually in Chrome (laptop) and on a real Android phone, using the checklist in IMPLEMENTATION_PLAN.md.
BR2, BR3, BR4, BR7, BR11, BR12, BR13, BR14, BR15 and BR17–BR21 get automated Vitest tests. G4 needs 5 tests for BR12: Safe, Watch, At risk, Not enough data, and boundary at exactly R0.00.
RLS is tested manually by logging in as Pieter and confirming no bakery data is visible, and as Lwazi to confirm Staff limits.
Test accounts are from 10.4.
Demo script (5 minutes): 1. Log in as zodwa@example.com and show the dashboard (Safe). 2. Open the Planner and show break-even and funding gap. 3. Log in as lwazi@example.com on a second window and add an oven repair of R2,400.00 (goes Pending). 4. Back as Zodwa, approve it and show the Debt Guard line. 5. Show the Large cash flag and the audit log. 6. Log in as pieter@example.com and show the At risk banner.
12. Quality, errors, security and privacy

12.1 Quality requirements

Area	Requirement (must be checkable)
Speed	Every screen shows content or grey placeholders within 3 seconds on mobile data, tested on my phone
Data usage	No images, no auto-playing media; lists load 20 items at a time (BR10); app code under 500 KB compressed
Offline	The loaded screen stays visible; banner "You're offline. Changes will not be saved."; all save and action buttons disabled
Devices	Latest two versions of Chrome, Edge and Safari; Android Chrome; screens from 360px wide
Language and region	English (South Africa); dates written like 12 Mar 2026; 24-hour time; SAST; currency format R1,234.50
Accessibility	As in Section 9.4
Scale	Works for 100 Businesses and 20,000 Transactions in the first semester
Abuse limits	BR24 (200 transactions a day per user); BR23 (5 staff per Business); BR5 (100 plan lines)

12.2 Error messages used everywhere

Situation	Exact message	What happens next
No internet	"You're offline. Changes will not be saved."	Save buttons disabled; typed text kept
Server or unknown error	"Something went wrong. Try again."	"Try again" button
Logged out because the session expired	"Please log in again."	Go to S3
Not allowed (wrong role)	"You can't do that."	Go back to S8 (Staff) or S6 (Owner)
Form field error	Red border and message under the field with an icon	Field keeps the user's text

12.3 Security

Passwords are handled only by Supabase Auth, never stored by my own code.
The service role key is never in the app or on GitHub (Section 11.5).
Every "Cannot do" in 2.4 and every rule in 11.4 is enforced by RLS or database triggers.
Audit rows and flags are created only by database triggers, and no user role has update or delete permission on them.
All amounts are validated in the database (check constraints) as well as in the screen.
Raw error codes are never shown to users.

12.4 Privacy and POPIA

Personal information	Why you need it	Who can see it	Where it is stored (service and country)	How long you keep it	How the user deletes it
Email	Log-in and invites	The user; the Owner of the same Business; admin	Supabase, South Africa (Cape Town)	Until the account is deleted	S10 → M5
Full name	Show who recorded each entry	Members of the same Business; admin	Same	Until the account is deleted	S10 → M5
Business details and plan	Show the owner's own numbers	Owner; Staff see the Business name only; admin	Same	Until the Business is deleted	S10 → M5 (Owner)
Transactions, bills, notes	Track money	Owner (all); Staff (own transactions, all bills)	Same	Until the Business is deleted	S10 → M5 (Owner); soft delete in S8
Audit log and flags	Accountability	Owner only	Same	Until the Business is deleted	S10 → M5 (Owner)
Consent: On S2 the checkbox "I agree to the Privacy Notice" (unticked by default) with a link to the notice. The notice is also in the S10 menu.
Privacy Notice: shown from S1, S2 and S10; says what is collected, why, who sees it, and how to delete it.
Under-18 users: not allowed in v1 (Section 5).
Data outside South Africa: the database is in Supabase's South Africa (Cape Town) region. The app code is served by Vercel from servers that may be outside South Africa but stores no personal data. The Privacy Notice says both.
Staff data: the Owner is told in the Privacy Notice that they must inform staff their entries are recorded and visible to them.
13. Assumptions, risks, open questions and milestones

13.1 Assumptions

Owners will build a plan with 3 or more lines in one sitting: check by timing 10 testers (target under 10 minutes).
Owners will record transactions regularly: check G2 in the database and ask 10 testers whether they would use it daily.
Staff accept that the owner sees their entries: check with Lwazi-type testers in the 10-person test.
Integrity flags are not too noisy: check with the seed data (only the expected flags appear).

13.2 Risks

Risk	Likelihood	Impact	What you will do about it
Users think flags or Debt Guard guarantee legal compliance or no debt	Medium	High	Wording in the app and BUSINESS.md: "advisory, not proof"; "These are your estimates, not guaranteed results."
RLS mistake exposes one Business's data to another	Medium	High	Two seeded Businesses; manual cross-login test; policies reviewed before deploy
Only 2.5 days to build and deploy	High	High	Build all Must features first, Should features last; cut S11 audit table to the simplest list if time runs out
Supabase free project pauses when unused	Medium	Medium	Open the live app the day before submission and before the Loom
Users enter wrong data (typos)	High	Medium	Validation, Debt Guard warning, edit with audit trail

13.3 Open questions: None. (Decisions made: one Business per user; Staff cannot edit or delete; approval threshold R2,000.00; large cash flag R5,000.00; region South Africa.)

13.4 Milestones

Milestone	What is finished	Where to find it	Target date
M0: Idea submitted	Your original app idea	docs/idea.md in the repository	Done
M1: PRD approved	This PRD, Status = Approved	docs/PRD.md	23 Nov 2026 (10:00 check-in)
M2: Design ready	Style guide and every screen S1–S11 and M1–M6 generated and checked	https://stitch.google.com/projects/14648157237388159118 and docs/designs/	23 Nov 2026 (10:00 check-in)
M3: Build plan ready	IMPLEMENTATION_PLAN.md (the MASTER.md build plan) generated and checked, Issues created, frontend started	IMPLEMENTATION_PLAN.md	23 Nov 2026 (15:30 check-in)
M4: MVP built	F1–F5 working on the live link, then F6 and F7	Live link in the README	25 Nov 2026 (10:00 check-in)
M5: Tested and demoed	All T- tests passed; Loom recorded	Test checklist in IMPLEMENTATION_PLAN.md; Loom link	25 Nov 2026 (15:30 final submission)
14. Using your PRD with AI

Same in every PRD, so not repeated (as in the worked example).

15. Submission checklist sign-off

All boxes in Section 15 of the template are ticked except the peer review and the contrast check on webaim, which you must do. The traceability check:

Feature	Stories	Screens	Rules
F1	US1–US4	S1–S5, S10, M4, M5	BR23
F2	US5, US6	S7	BR1–BR5
F3	US7–US9	S8, M1, M2	BR6–BR10, BR13, BR24
F4	US10	S6	BR11–BR15
F5	US11	S9, M3, M2	BR12, BR16
F6	US12	S8, M6	BR7, BR9, BR13
F7	US13	S11	BR17–BR22

Peer review

Reviewer	Date	
Pending: 
16. Glossary

Same in every PRD, so not repeated (as in the worked example).
