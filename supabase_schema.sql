-- Run this entire script in your Supabase Dashboard -> SQL Editor

-- 1. Bookings table
create table if not exists public.bookings (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  number_pax integer not null check (number_pax >= 1),
  booking_date date not null,
  email text not null,
  contact_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_user_id on public.bookings(user_id);

alter table public.bookings enable row level security;

create policy "Users can view their own bookings"
  on public.bookings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own bookings"
  on public.bookings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own bookings"
  on public.bookings for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2. Contact / support messages table
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_user_id on public.contact_messages(user_id);

alter table public.contact_messages enable row level security;

create policy "Users can view their own contact messages"
  on public.contact_messages for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own contact messages"
  on public.contact_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3. Grant table & sequence permissions to authenticated users (RLS still enforces per-user access)
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert on table public.contact_messages to authenticated;
grant usage, select on all sequences in schema public to authenticated;
