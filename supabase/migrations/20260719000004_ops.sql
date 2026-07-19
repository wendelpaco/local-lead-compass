-- Radar Local — ops: audit, usage, idempotency, suppression, exports
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index idx_audit_org_created on public.audit_logs (organization_id, created_at desc);
create index idx_audit_entity on public.audit_logs (entity_type, entity_id);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  event_type text not null
    check (event_type in ('search_request','place_search_request','place_details_request','geocode_request','enrichment_request','export_record')),
  provider text,
  quantity integer not null default 1,
  estimated_cost numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_usage_org_type_created on public.usage_events (organization_id, event_type, created_at desc);

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  operation text not null,
  response jsonb,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, key, operation)
);
create index idx_idempotency_expiry on public.idempotency_keys (expires_at);

create table public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('phone','email','domain','place')),
  value_hash text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (organization_id, type, value_hash)
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  format text not null check (format in ('csv','xlsx')),
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','expired')),
  filters jsonb,
  columns jsonb,
  row_count integer,
  storage_path text,
  error_message text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_exports_org on public.exports (organization_id, created_at desc);
create trigger trg_exports_updated before update on public.exports
  for each row execute function public.set_updated_at();

-- Geocode cache — avoids re-geocoding the same label (internal derived data).
create table public.geocode_cache (
  id uuid primary key default gen_random_uuid(),
  query_normalized text not null unique,
  label text not null,
  location geography(point, 4326) not null,
  provider text not null default 'google_geocoding',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
