-- Radar Local — Row Level Security
-- Central rule: user only reads/writes rows of organizations they belong to.

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.profiles enable row level security;
alter table public.searches enable row level security;
alter table public.places enable row level security;
alter table public.search_results enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_stage_history enable row level security;
alter table public.message_templates enable row level security;
alter table public.audit_logs enable row level security;
alter table public.usage_events enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.suppression_list enable row level security;
alter table public.exports enable row level security;
alter table public.geocode_cache enable row level security;

-- organizations
create policy org_select on public.organizations for select
  using (public.is_organization_member(id));
create policy org_update on public.organizations for update
  using (public.has_organization_role(id, array['owner','admin']));
-- insert/delete handled by trigger + service role only.

-- organization_members
create policy org_members_select on public.organization_members for select
  using (public.is_organization_member(organization_id));
create policy org_members_insert on public.organization_members for insert
  with check (public.has_organization_role(organization_id, array['owner','admin']));
create policy org_members_update on public.organization_members for update
  using (public.has_organization_role(organization_id, array['owner','admin']));
create policy org_members_delete on public.organization_members for delete
  using (
    public.has_organization_role(organization_id, array['owner','admin'])
    or user_id = auth.uid()
  );

-- profiles: owner only
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());

-- Generic org-scoped policies
create policy searches_all on public.searches for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy places_select on public.places for select
  using (public.is_organization_member(organization_id));
-- places written only by edge functions (service role).

create policy search_results_select on public.search_results for select
  using (exists (
    select 1 from public.searches s
    where s.id = search_results.search_id
      and public.is_organization_member(s.organization_id)
  ));

create policy leads_all on public.leads for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy lead_notes_all on public.lead_notes for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy lead_activities_all on public.lead_activities for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy stage_history_select on public.lead_stage_history for select
  using (public.is_organization_member(organization_id));
create policy stage_history_insert on public.lead_stage_history for insert
  with check (public.is_organization_member(organization_id) and changed_by = auth.uid());

create policy templates_all on public.message_templates for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy audit_select on public.audit_logs for select
  using (public.has_organization_role(organization_id, array['owner','admin']));
-- audit written by edge functions / triggers only.

create policy usage_select on public.usage_events for select
  using (public.is_organization_member(organization_id));

create policy suppression_all on public.suppression_list for all
  using (public.is_organization_member(organization_id))
  with check (public.is_organization_member(organization_id));

create policy exports_select on public.exports for select
  using (public.is_organization_member(organization_id));
create policy exports_insert on public.exports for insert
  with check (public.is_organization_member(organization_id) and created_by = auth.uid());

-- idempotency_keys and geocode_cache: service role only (no user policies).
