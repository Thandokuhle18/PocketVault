import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

function loadLocalEnvironment(source) {
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const assignment = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!assignment || process.env[assignment[1]] !== undefined) continue;

    let value = assignment[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[assignment[1]] = value;
  }
}

async function loadEnvironment() {
  try {
    loadLocalEnvironment(await readFile('.env.local', 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const required = ['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_URL', 'SEED_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment value(s): ${missing.join(', ')}. Set them in .env.local or the process environment.`);
  }
}

async function unwrap(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

async function listUsers(client) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const data = await unwrap(await client.auth.admin.listUsers({ page, perPage: 1000 }));
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function ensureUser(client, definition, existingUsers) {
  let user = existingUsers.find((candidate) => candidate.email?.toLowerCase() === definition.email);
  const metadata = { full_name: definition.fullName, is_18_or_older: true };

  if (!user) {
    const data = await unwrap(await client.auth.admin.createUser({
      email: definition.email,
      password: process.env.SEED_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    }));
    user = data.user;
    existingUsers.push(user);
  } else {
    user = (await unwrap(await client.auth.admin.updateUserById(user.id, {
      password: process.env.SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, ...metadata },
    }))).user;
  }

  const profile = await unwrap(await client.from('profiles').select('id').eq('id', user.id).maybeSingle());
  if (!profile) {
    await unwrap(await client.from('profiles').insert({
      id: user.id,
      email: definition.email,
      full_name: definition.fullName,
      is_18_or_older: true,
    }));
  }

  console.log(`Account exists: ${definition.email}`);
  return user;
}

async function findRow(client, table, filters) {
  return unwrap(await client.from(table).select('id').match(filters).limit(1).maybeSingle());
}

async function ensureRow(client, table, values, filters, label) {
  const existing = await findRow(client, table, filters);
  if (existing) return existing;
  const inserted = await unwrap(await client.from(table).insert(values).select('id').single());
  console.log(`Created ${label}`);
  return inserted;
}

async function ensureMembership(client, businessId, userId, role) {
  const existing = await findRow(client, 'memberships', { business_id: businessId, user_id: userId });
  if (!existing) {
    await unwrap(await client.from('memberships').insert({ business_id: businessId, user_id: userId, role }));
    console.log(`Created ${role} membership`);
  }
}

async function ensureStaffInvite(client, businessId, email) {
  let invite = await unwrap(await client.from('invites').select('id,status').match({ business_id: businessId, email }).maybeSingle());
  if (!invite) {
    invite = await unwrap(await client.from('invites').insert({ business_id: businessId, email, status: 'Pending' }).select('id,status').single());
  } else if (invite.status === 'Revoked') {
    invite = await unwrap(await client.from('invites').update({ status: 'Pending' }).eq('id', invite.id).select('id,status').single());
  }
  return invite;
}

async function acceptSeedInvite(client, businessId, userId, email) {
  const invite = await ensureStaffInvite(client, businessId, email);
  await ensureMembership(client, businessId, userId, 'Staff');
  if (invite.status !== 'Accepted') {
    await unwrap(await client.from('invites').update({ status: 'Accepted' }).eq('id', invite.id));
  }
}

async function main() {
  await loadEnvironment();
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const existingUsers = await listUsers(client);
  const zodwa = await ensureUser(client, { email: 'zodwa@example.com', fullName: 'Zodwa Mthembu' }, existingUsers);
  const pieter = await ensureUser(client, { email: 'pieter@example.com', fullName: 'Pieter van Wyk' }, existingUsers);

  const bakery = await ensureRow(client, 'businesses', {
    name: "Zodwa's Home Bakery", type: 'Bakery or catering', description: 'Soweto', stage: 'Operating',
    opening_balance: 2000, available_capital: 6000, owner_id: zodwa.id,
  }, { owner_id: zodwa.id, name: "Zodwa's Home Bakery" }, "Zodwa's Home Bakery");
  const carWash = await ensureRow(client, 'businesses', {
    name: "Pieter's Car Wash", type: 'Car wash or cleaning', description: 'Pretoria', stage: 'Operating',
    opening_balance: 500, available_capital: 0, owner_id: pieter.id,
  }, { owner_id: pieter.id, name: "Pieter's Car Wash" }, "Pieter's Car Wash");

  await ensureMembership(client, bakery.id, zodwa.id, 'Owner');
  await ensureMembership(client, carWash.id, pieter.id, 'Owner');
  await ensureStaffInvite(client, bakery.id, 'lwazi@example.com');
  const lwazi = await ensureUser(client, { email: 'lwazi@example.com', fullName: 'Lwazi Ndlovu' }, existingUsers);
  await acceptSeedInvite(client, bakery.id, lwazi.id, 'lwazi@example.com');

  const planLines = [
    { kind: 'Startup cost', name: 'Oven', amount: 8500, quantity: 1, unit_cost: 0 },
    { kind: 'Monthly expense', name: 'Rent', amount: 3500, quantity: 1, unit_cost: 0 },
    { kind: 'Income', name: 'Chocolate cake', amount: 350, quantity: 20, unit_cost: 120 },
  ];
  for (const line of planLines) {
    await ensureRow(client, 'plan_lines', { business_id: bakery.id, ...line }, {
      business_id: bakery.id, kind: line.kind, name: line.name,
    }, `plan line ${line.name}`);
  }

  const transactions = [
    { business_id: bakery.id, created_by: zodwa.id, description: 'Cake sales', amount: 4800, type: 'Income', category: 'Product sales', payment_method: 'EFT', transaction_date: '2026-11-02' },
    { business_id: bakery.id, created_by: lwazi.id, description: 'Flour and sugar', amount: 1250, type: 'Expense', category: 'Stock', payment_method: 'Card', transaction_date: '2026-11-03' },
    { business_id: bakery.id, created_by: lwazi.id, description: 'Oven repair', amount: 2400, type: 'Expense', category: 'Maintenance', payment_method: 'Cash', transaction_date: '2026-11-05' },
    { business_id: bakery.id, created_by: zodwa.id, description: 'Wedding deposit', amount: 6000, type: 'Income', category: 'Deposits', payment_method: 'Cash', transaction_date: '2026-11-09' },
    { business_id: bakery.id, created_by: zodwa.id, description: 'Electricity prepaid', amount: 600, type: 'Expense', category: 'Electricity', payment_method: 'Card', transaction_date: '2026-11-10' },
    { business_id: carWash.id, created_by: pieter.id, description: 'Car wash takings', amount: 1500, type: 'Income', category: 'Service revenue', payment_method: 'Cash', transaction_date: '2026-11-04' },
    { business_id: carWash.id, created_by: pieter.id, description: 'Soap and polish', amount: 900, type: 'Expense', category: 'Materials', payment_method: 'Card', transaction_date: '2026-11-06' },
  ];
  for (const transaction of transactions) {
    await ensureRow(client, 'transactions', transaction, {
      business_id: transaction.business_id,
      created_by: transaction.created_by,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
    }, `transaction ${transaction.description}`);
  }

  const bills = [
    { business_id: bakery.id, name: 'Rent', amount: 3500, due_date: '2026-11-28', frequency: 'Monthly', category: 'Rent' },
    { business_id: bakery.id, name: 'Loan repayment', amount: 1200, due_date: '2026-11-30', frequency: 'Monthly', category: 'Loan repayment' },
    { business_id: bakery.id, name: 'Internet', amount: 599, due_date: '2026-12-01', frequency: 'Monthly', category: 'Internet' },
    { business_id: carWash.id, name: 'Premises rent', amount: 3000, due_date: '2026-11-28', frequency: 'Monthly', category: 'Rent' },
  ];
  for (const bill of bills) {
    await ensureRow(client, 'bills', bill, {
      business_id: bill.business_id, name: bill.name, due_date: bill.due_date,
    }, `bill ${bill.name}`);
  }

  console.log('Seed complete. Test accounts: zodwa@example.com, lwazi@example.com, pieter@example.com.');
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
});
