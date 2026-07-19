-- Radar Local — CRM: leads, notes, activities, stage history, templates
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  created_by uuid not null references auth.users(id),
  company_name text not null,
  category text,
  description text,
  address text,
  neighborhood text,
  city text,
  state text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  phone text,
  phone_e164 text,
  whatsapp text,
  whatsapp_status text not null default 'unknown'
    check (whatsapp_status in ('unknown','possible','verified','invalid')),
  email text,
  instagram text,
  website text,
  website_domain text,
  has_website boolean not null default false,
  rating numeric,
  review_count integer,
  score integer not null default 0 check (score between 0 and 100),
  score_breakdown jsonb,
  score_rule_version text,
  temperature text not null default 'cold' check (temperature in ('hot','warm','cold')),
  stage text not null default 'new'
    check (stage in ('new','qualified','contacted','won','discarded')),
  estimated_value numeric,
  closed_value numeric,
  closed_service text,
  closed_at timestamptz,
  discard_reason text,
  discarded_at timestamptz,
  last_interaction_at timestamptz,
  next_activity_at timestamptz,
  source text not null default 'search',
  source_search_id uuid references public.searches(id) on delete set null,
  assigned_to uuid references auth.users(id),
  name_normalized text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_leads_org on public.leads (organization_id);
create index idx_leads_org_stage on public.leads (organization_id, stage);
create index idx_leads_org_temperature on public.leads (organization_id, temperature);
create index idx_leads_org_score on public.leads (organization_id, score desc);
create index idx_leads_org_city on public.leads (organization_id, city);
create index idx_leads_org_category on public.leads (organization_id, category);
create index idx_leads_org_created on public.leads (organization_id, created_at desc);
create index idx_leads_org_next_activity on public.leads (organization_id, next_activity_at);
create index idx_leads_place on public.leads (place_id);
create index idx_leads_phone_e164 on public.leads (organization_id, phone_e164) where phone_e164 is not null;
create index idx_leads_website_domain on public.leads (organization_id, website_domain) where website_domain is not null;
-- Dedupe guard: one lead per provider place per org.
create unique index uq_leads_org_place on public.leads (organization_id, place_id) where place_id is not null;
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  content text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lead_notes_lead on public.lead_notes (lead_id, created_at desc);
create trigger trg_lead_notes_updated before update on public.lead_notes
  for each row execute function public.set_updated_at();

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  type text not null
    check (type in ('call','whatsapp','email','meeting','follow_up','proposal','visit','other')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_lead_activities_lead on public.lead_activities (lead_id, scheduled_at);
create index idx_lead_activities_org_pending on public.lead_activities (organization_id, scheduled_at)
  where status = 'pending';
create trigger trg_lead_activities_updated before update on public.lead_activities
  for each row execute function public.set_updated_at();

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid not null references auth.users(id),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index idx_stage_history_lead on public.lead_stage_history (lead_id, created_at desc);
create index idx_stage_history_org on public.lead_stage_history (organization_id, created_at desc);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email','sms')),
  content text not null,
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_templates_org on public.message_templates (organization_id);
create trigger trg_templates_updated before update on public.message_templates
  for each row execute function public.set_updated_at();
