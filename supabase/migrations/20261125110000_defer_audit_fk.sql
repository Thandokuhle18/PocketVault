alter table public.transaction_audits
  alter constraint transaction_audits_transaction_id_fkey
  deferrable initially deferred;