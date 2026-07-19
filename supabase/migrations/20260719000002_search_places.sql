-- Radar Local — searches, places (provider data), search_results
create table public.searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  query text not null,
  category text,
  location_label text not null,
  center geography(point, 4326) not null,
  radius_meters integer not null check (radius_meters between 100 and 100000),
  presence_filter text not null default 'all'
    check (presence_filter in ('without_website', 'with_website', 'all')),
  status text not null default 'queued'
    check (status in ('queued','geocoding','searching','importing','enriching','completed','partial','failed','cancelled')),
  provider text not null default 'google_places',
  provider_request_count integer not null default 0,
  found_count integer not null default 0,
  imported_count integer not null default 0,
  enriched_count integer not null default 0,
  max_results integer not null default 20,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_searches_org_created on public.searches (organization_id, created_at desc);
create index idx_searches_status on public.searches (status) where status in ('queued','searching');
create trigger trg_searches_updated before update on public.searches
  for each row execute function public.set_updated_at();

-- Provider data stays separate from CRM data (leads).
create table public.places (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'google_places',
  provider_place_id text not null,
  name text not null,
  primary_type text,
  types jsonb not null default '[]',
  formatted_address text,
  location geography(point, 4326),
  national_phone_number text,
  international_phone_number text,
  website_uri text,
  google_maps_uri text,
  business_status text,
  rating numeric,
  user_rating_count integer,
  price_level text,
  opening_hours jsonb,
  address_components jsonb,
  provider_payload jsonb,
  provider_fetched_at timestamptz,
  provider_refresh_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider, provider_place_id)
);
create index idx_places_org on public.places (organization_id);
create index idx_places_location on public.places using gist (location);
create trigger trg_places_updated before update on public.places
  for each row execute function public.set_updated_at();

create table public.search_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.searches(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  distance_meters integer,
  position integer,
  provider_rank integer,
  matched_query text,
  is_inside_radius boolean not null default true,
  imported_lead_id uuid,
  created_at timestamptz not null default now(),
  unique (search_id, place_id)
);
create index idx_search_results_search on public.search_results (search_id);
create index idx_search_results_place on public.search_results (place_id);
