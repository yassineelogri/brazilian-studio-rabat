-- Tracks which WhatsApp reminders have been sent for each appointment.
-- The unique constraint on (appointment_id, type) prevents duplicate sends
-- if the cron fires multiple times within the same window.

create table if not exists reminders (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references appointments(id) on delete cascade,
  type            text not null check (type in ('24h', '2h')),
  sent_at         timestamptz not null default now(),
  unique (appointment_id, type)
);

alter table reminders enable row level security;

create policy "reminders_staff_all" on reminders
  for all using (is_staff());
