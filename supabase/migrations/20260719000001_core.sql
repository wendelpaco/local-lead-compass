-- Radar Local — core: extensions, organizations, members, profiles
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_user_id uuid not null references auth.users(id),
  plan text not null default 'free',
  status text not null default 'active',
  monthly_search_limit integer not null default 20,
  monthly_place_limit integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on public.organization_members (user_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  company_name text,
  phone text,
  timezone text default 'America/Sao_Paulo',
  locale text default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Membership check used by every RLS policy. SECURITY DEFINER avoids
-- recursive RLS evaluation on organization_members.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_organization_role(target_organization_id uuid, roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role = any (roles)
  );
$$;

-- Auto-provision profile + personal organization on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.organizations (name, owner_user_id)
  values (coalesce(new.raw_user_meta_data ->> 'company_name', 'Minha organização'), new.id)
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
