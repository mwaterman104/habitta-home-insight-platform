
-- 1) Permits table
create table if not exists public.permits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  home_id uuid not null,
  -- core identity
  jurisdiction text,
  permit_number text,
  source text not null default 'shovels',
  source_url text,
  -- classification
  permit_type text,
  trade text,
  work_class text,
  status text,
  description text,
  valuation numeric,
  contractor_name text,
  contractor_license text,
  -- dates
  date_issued date,
  date_finaled date,
  -- derived
  system_tags text[] default '{}',
  is_energy_related boolean not null default false,
  -- raw & dedupe
  raw jsonb not null,
  hash text,
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.permits enable row level security;

create policy "Users can view own permits"
  on public.permits for select
  using (auth.uid() = user_id);

create policy "Users can insert own permits"
  on public.permits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own permits"
  on public.permits for update
  using (auth.uid() = user_id);

create policy "Users can delete own permits"
  on public.permits for delete
  using (auth.uid() = user_id);

-- Trigger to maintain updated_at
drop trigger if exists trg_permits_updated_at on public.permits;
create trigger trg_permits_updated_at
before update on public.permits
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_permits_home_date on public.permits (home_id, date_issued desc);
create index if not exists idx_permits_user_home on public.permits (user_id, home_id);
create index if not exists idx_permits_system_tags on public.permits using gin (system_tags);
create unique index if not exists ux_permits_hash on public.permits (hash) where hash is not null;


-- 2) Code violations table
create table if not exists public.code_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  home_id uuid not null,
  -- core identity
  jurisdiction text,
  violation_number text,
  source text not null default 'shovels',
  source_url text,
  -- classification
  violation_type text,
  status text,
  severity text,
  description text,
  -- dates
  date_reported date,
  date_resolved date,
  -- raw & dedupe
  raw jsonb not null,
  hash text,
  -- meta
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.code_violations enable row level security;

create policy "Users can view own code violations"
  on public.code_violations for select
  using (auth.uid() = user_id);

create policy "Users can insert own code violations"
  on public.code_violations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own code violations"
  on public.code_violations for update
  using (auth.uid() = user_id);

create policy "Users can delete own code violations"
  on public.code_violations for delete
  using (auth.uid() = user_id);

-- Trigger to maintain updated_at
drop trigger if exists trg_code_violations_updated_at on public.code_violations;
create trigger trg_code_violations_updated_at
before update on public.code_violations
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_violations_home_date on public.code_violations (home_id, date_reported desc);
create index if not exists idx_violations_user_home on public.code_violations (user_id, home_id);
create unique index if not exists ux_violations_hash on public.code_violations (hash) where hash is not null;
