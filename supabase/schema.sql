-- Vector Lead — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`) when you move off
-- mock mode. Column names are snake_case; the app maps them to camelCase in
-- the persistence layer (src/lib/store.ts) when you wire the Supabase branch.

create type lead_status as enum
    ('NEW', 'CALLING', 'QUALIFIED', 'FOLLOW_UP', 'DISQUALIFIED', 'NO_ANSWER');

create type call_status as enum
    ('QUEUED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'NO_ANSWER', 'FAILED');

-- ── Leads ──
create table if not exists leads (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null references auth.users(id) on delete cascade,
    name          text not null,
    phone         text not null,
    email         text,
    status        lead_status not null default 'NEW',
    score         int check (score between 0 and 100),
    project_type  text,
    budget        text,
    source        text not null default 'manual',
    ai_summary    jsonb,
    transcript    text,
    recording_url text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create index if not exists leads_user_id_idx on leads(user_id);
create index if not exists leads_status_idx on leads(status);

-- ── Call attempts ──
create table if not exists call_attempts (
    id               uuid primary key default gen_random_uuid(),
    lead_id          uuid not null references leads(id) on delete cascade,
    status           call_status not null default 'QUEUED',
    duration         int,
    started_at       timestamptz not null default now(),
    ended_at         timestamptz,
    provider         text not null default 'vapi',
    provider_call_id text
);
create index if not exists call_attempts_lead_id_idx on call_attempts(lead_id);
create index if not exists call_attempts_provider_call_id_idx on call_attempts(provider_call_id);

-- ── Meta accounts ──
create table if not exists meta_accounts (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null references auth.users(id) on delete cascade,
    page_id      text not null,
    page_name    text,
    access_token text,
    connected_at timestamptz not null default now(),
    unique (user_id, page_id)
);

-- ── Per-user config (single row each) ──
create table if not exists agent_configs (
    user_id          uuid primary key references auth.users(id) on delete cascade,
    agent_name       text not null default 'Priya',
    company_name     text not null default 'Vector Lead',
    voice_provider   text not null default 'vapi',
    voice_id         text not null default 'Elliot',
    ai_model         text not null default 'claude-opus-4-8',
    max_call_duration int not null default 600,
    first_message    text not null default 'Hi, am I speaking with {{name}}?',
    custom_questions jsonb not null default '[]'
);

create table if not exists notification_configs (
    user_id            uuid primary key references auth.users(id) on delete cascade,
    slack_webhook_url  text,
    telegram_bot_token text,
    telegram_chat_id   text
);

-- ── Row Level Security ──
-- Users can only see their own rows. The server uses the service-role key,
-- which bypasses RLS for webhooks and privileged writes.
alter table leads enable row level security;
alter table call_attempts enable row level security;
alter table meta_accounts enable row level security;
alter table agent_configs enable row level security;
alter table notification_configs enable row level security;

create policy "own leads" on leads
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own call_attempts" on call_attempts
    for all using (
        exists (select 1 from leads where leads.id = call_attempts.lead_id and leads.user_id = auth.uid())
    );

create policy "own meta_accounts" on meta_accounts
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own agent_config" on agent_configs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notification_config" on notification_configs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
