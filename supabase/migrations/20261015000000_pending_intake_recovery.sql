alter table public.intake_events
  add column if not exists updated_at timestamptz not null default now();

create index if not exists intake_events_pending_updated_at_idx
  on public.intake_events (updated_at)
  where status = 'pending';