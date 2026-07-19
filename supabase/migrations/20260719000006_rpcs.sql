-- Radar Local — RPCs: geo queries, dashboard aggregation, stage move, quotas

-- Leads within radius, ordered by proximity. RLS-safe: security invoker.
create or replace function public.search_leads_within_radius(
  p_organization_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer
)
returns table (lead_id uuid, distance_meters double precision)
language sql
stable
as $$
  select l.id,
         st_distance(
           st_setsrid(st_makepoint(l.longitude::float8, l.latitude::float8), 4326)::geography,
           st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
         ) as distance_meters
  from public.leads l
  where l.organization_id = p_organization_id
    and public.is_organization_member(p_organization_id)
    and l.latitude is not null and l.longitude is not null
    and st_dwithin(
      st_setsrid(st_makepoint(l.longitude::float8, l.latitude::float8), 4326)::geography,
      st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  order by distance_meters asc;
$$;

-- Leads inside a map viewport (bounds query for map sync).
create or replace function public.leads_within_bounds(
  p_organization_id uuid,
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_limit integer default 500
)
returns setof public.leads
language sql
stable
as $$
  select l.*
  from public.leads l
  where l.organization_id = p_organization_id
    and public.is_organization_member(p_organization_id)
    and l.latitude between p_south and p_north
    and l.longitude between p_west and p_east
  limit least(p_limit, 1000);
$$;

-- Atomic stage move: updates lead, writes history, returns updated row.
create or replace function public.move_lead_stage(
  p_lead_id uuid,
  p_to_stage text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.leads
language plpgsql
as $$
declare
  v_lead public.leads;
  v_from text;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then
    raise exception 'LEAD_NOT_FOUND';
  end if;
  if not public.is_organization_member(v_lead.organization_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_to_stage not in ('new','qualified','contacted','won','discarded') then
    raise exception 'VALIDATION_ERROR: invalid stage';
  end if;
  if p_to_stage = 'won' and (p_metadata ->> 'closed_value') is null then
    raise exception 'VALIDATION_ERROR: closed_value required for won';
  end if;
  if p_to_stage = 'discarded' and coalesce(p_metadata ->> 'discard_reason', '') = '' then
    raise exception 'VALIDATION_ERROR: discard_reason required for discarded';
  end if;

  v_from := v_lead.stage;

  update public.leads set
    stage = p_to_stage,
    closed_value = case when p_to_stage = 'won'
      then (p_metadata ->> 'closed_value')::numeric else closed_value end,
    closed_service = case when p_to_stage = 'won'
      then coalesce(p_metadata ->> 'closed_service', closed_service) else closed_service end,
    closed_at = case when p_to_stage = 'won'
      then coalesce((p_metadata ->> 'closed_at')::timestamptz, now()) else closed_at end,
    discard_reason = case when p_to_stage = 'discarded'
      then p_metadata ->> 'discard_reason' else discard_reason end,
    discarded_at = case when p_to_stage = 'discarded' then now() else discarded_at end,
    last_interaction_at = now()
  where id = p_lead_id
  returning * into v_lead;

  insert into public.lead_stage_history (organization_id, lead_id, from_stage, to_stage, changed_by, metadata)
  values (v_lead.organization_id, p_lead_id, v_from, p_to_stage, auth.uid(), p_metadata);

  return v_lead;
end;
$$;

-- Dashboard aggregation — all metrics computed in the database.
create or replace function public.get_dashboard_overview(
  p_organization_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb;
begin
  if not public.is_organization_member(p_organization_id) then
    raise exception 'FORBIDDEN';
  end if;

  with scoped as (
    select * from public.leads
    where organization_id = p_organization_id
      and created_at >= p_start_date and created_at < p_end_date
  ),
  won as (
    select * from public.leads
    where organization_id = p_organization_id
      and stage = 'won'
      and closed_at >= p_start_date and closed_at < p_end_date
  )
  select jsonb_build_object(
    'totalLeads', (select count(*) from scoped),
    'byStage', (select coalesce(jsonb_object_agg(stage, c), '{}'::jsonb)
      from (select stage, count(*) c from scoped group by stage) s),
    'byTemperature', (select coalesce(jsonb_object_agg(temperature, c), '{}'::jsonb)
      from (select temperature, count(*) c from scoped group by temperature) s),
    'byCity', (select coalesce(jsonb_agg(jsonb_build_object('city', city, 'count', c, 'won', w) order by c desc), '[]'::jsonb)
      from (select city, count(*) c, count(*) filter (where stage = 'won') w
            from scoped where city is not null group by city limit 20) s),
    'byCategory', (select coalesce(jsonb_agg(jsonb_build_object('category', category, 'count', c, 'won', w) order by c desc), '[]'::jsonb)
      from (select category, count(*) c, count(*) filter (where stage = 'won') w
            from scoped where category is not null group by category limit 20) s),
    'contacted', (select count(*) from scoped where stage in ('contacted','won')),
    'wonCount', (select count(*) from won),
    'wonValue', (select coalesce(sum(closed_value), 0) from won),
    'avgTicket', (select coalesce(avg(closed_value), 0) from won),
    'pipelineValue', (select coalesce(sum(estimated_value), 0) from public.leads
      where organization_id = p_organization_id and stage in ('qualified','contacted')),
    'avgDaysToClose', (select coalesce(avg(extract(epoch from (closed_at - created_at)) / 86400), 0) from won),
    'conversionRate', (select case when count(*) = 0 then 0
      else round(count(*) filter (where stage = 'won')::numeric / count(*) * 100, 1) end from scoped),
    'searchCount', (select count(*) from public.searches
      where organization_id = p_organization_id
        and created_at >= p_start_date and created_at < p_end_date),
    'importedCount', (select coalesce(sum(imported_count), 0) from public.searches
      where organization_id = p_organization_id
        and created_at >= p_start_date and created_at < p_end_date)
  ) into result;

  return result;
end;
$$;

-- Monthly quota check (searches + place requests). Called by edge functions.
create or replace function public.get_quota_status(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'searchLimit', o.monthly_search_limit,
    'searchUsed', (select count(*) from public.searches s
      where s.organization_id = o.id
        and s.created_at >= date_trunc('month', now())),
    'placeLimit', o.monthly_place_limit,
    'placeUsed', (select coalesce(sum(u.quantity), 0) from public.usage_events u
      where u.organization_id = o.id
        and u.event_type in ('place_search_request','place_details_request')
        and u.created_at >= date_trunc('month', now()))
  )
  from public.organizations o
  where o.id = p_organization_id;
$$;
