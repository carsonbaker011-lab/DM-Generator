-- Run this once in Supabase SQL Editor
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  plan text not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now()
);

create table if not exists usage (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  month text not null,
  count integer not null default 0,
  unique(clerk_id, month)
);

alter table users enable row level security;
alter table usage enable row level security;
