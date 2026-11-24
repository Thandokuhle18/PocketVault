create type public.business_type as enum (
  'Bakery or catering',
  'Clothing or retail',
  'Beauty or barbering',
  'Car wash or cleaning',
  'Spaza or general shop',
  'Freelance or professional services',
  'Events or photography',
  'Repairs or construction',
  'Online selling',
  'Farming',
  'Other'
);

create type public.business_stage as enum ('Idea', 'Starting', 'Operating');
create type public.membership_role as enum ('Owner', 'Staff');
create type public.invite_status as enum ('Pending', 'Accepted', 'Revoked');
create type public.plan_line_kind as enum ('Startup cost', 'Monthly expense', 'Income');
create type public.transaction_type as enum ('Income', 'Expense');
create type public.transaction_category as enum (
  'Product sales', 'Service revenue', 'Deposits', 'Other income',
  'Rent', 'Electricity', 'Water', 'Internet', 'Stock', 'Materials',
  'Transport', 'Marketing', 'Salaries', 'Equipment', 'Insurance',
  'Subscriptions', 'Maintenance', 'Loan repayment', 'Other expenses'
);
create type public.payment_method as enum ('Cash', 'Card', 'EFT', 'Other');
create type public.transaction_status as enum ('Approved', 'Pending', 'Rejected');
create type public.transaction_audit_action as enum ('Created', 'Edited', 'Deleted', 'Approved', 'Rejected');
create type public.bill_frequency as enum ('Once-off', 'Weekly', 'Monthly');
create type public.bill_status as enum ('Unpaid', 'Paid');
create type public.flag_rule as enum ('Large cash', 'Possible split', 'Amount changed', 'Deleted transaction', 'Possible duplicate');
create type public.flag_status as enum ('Open', 'Reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (email = lower(email)),
  full_name varchar(60) not null check (char_length(full_name) between 1 and 60),
  is_18_or_older boolean not null check (is_18_or_older),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name varchar(60) not null check (char_length(name) between 3 and 60),
  type public.business_type not null,
  description varchar(200) check (description is null or char_length(description) <= 200),
  stage public.business_stage not null,
  opening_balance numeric(10, 2) not null default 0 check (opening_balance between 0 and 10000000),
  available_capital numeric(10, 2) not null default 0 check (available_capital between 0 and 10000000),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role public.membership_role not null,
  created_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null check (email = lower(email)),
  status public.invite_status not null default 'Pending',
  created_at timestamptz not null default now(),
  unique (business_id, email)
);

create table public.plan_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind public.plan_line_kind not null,
  name varchar(60) not null check (char_length(name) between 3 and 60),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 10000000),
  quantity integer not null default 1,
  unit_cost numeric(10, 2) not null default 0 check (unit_cost between 0 and 10000000),
  created_at timestamptz not null default now(),
  check (
    (kind = 'Startup cost' and quantity between 1 and 1000)
    or (kind = 'Monthly expense' and quantity = 1)
    or (kind = 'Income' and quantity between 1 and 100000)
  ),
  check (kind = 'Income' or unit_cost = 0)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  description varchar(80) not null check (char_length(description) between 3 and 80),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 10000000),
  type public.transaction_type not null,
  category public.transaction_category not null,
  payment_method public.payment_method not null,
  transaction_date date not null default current_date check (transaction_date <= current_date),
  notes varchar(300) check (notes is null or char_length(notes) <= 300),
  status public.transaction_status not null default 'Approved',
  rejection_reason varchar(200) check (rejection_reason is null or char_length(rejection_reason) between 3 and 200),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'Income' and category in ('Product sales', 'Service revenue', 'Deposits', 'Other income'))
    or (type = 'Expense' and category in (
      'Rent', 'Electricity', 'Water', 'Internet', 'Stock', 'Materials', 'Transport',
      'Marketing', 'Salaries', 'Equipment', 'Insurance', 'Subscriptions',
      'Maintenance', 'Loan repayment', 'Other expenses'
    ))
  ),
  check ((status = 'Rejected' and rejection_reason is not null) or (status <> 'Rejected' and rejection_reason is null))
);

create table public.transaction_audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action public.transaction_audit_action not null,
  old_amount numeric(10, 2) check (old_amount is null or (old_amount > 0 and old_amount <= 10000000)),
  new_amount numeric(10, 2) check (new_amount is null or (new_amount > 0 and new_amount <= 10000000)),
  reason varchar(200) check (reason is null or char_length(reason) between 3 and 200),
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name varchar(60) not null check (char_length(name) between 3 and 60),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 10000000),
  due_date date not null,
  frequency public.bill_frequency not null default 'Once-off',
  category public.transaction_category not null check (category in (
    'Rent', 'Electricity', 'Water', 'Internet', 'Stock', 'Materials', 'Transport',
    'Marketing', 'Salaries', 'Equipment', 'Insurance', 'Subscriptions',
    'Maintenance', 'Loan repayment', 'Other expenses'
  )),
  status public.bill_status not null default 'Unpaid',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  rule public.flag_rule not null,
  status public.flag_status not null default 'Open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note varchar(200) check (review_note is null or char_length(review_note) between 3 and 200),
  created_at timestamptz not null default now(),
  check ((status = 'Reviewed' and review_note is not null) or (status = 'Open' and review_note is null))
);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.plan_lines enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_audits enable row level security;
alter table public.bills enable row level security;
alter table public.flags enable row level security;
