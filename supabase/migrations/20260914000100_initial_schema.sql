-- ============================================================================
-- Zer0Flow: initial schema
--
-- Entities: workspaces, profiles, workspace_members, leads, activities,
--           tags, lead_tags
--
-- RLS: every table enables Row Level Security. Access is limited to users who
--      are members of a row's workspace. Membership checks use SECURITY
--      DEFINER helper functions to avoid RLS recursion on workspace_members.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

create type public.workspace_role as enum ('owner', 'member');

create type public.pipeline_stage as enum (
  'PROSPECT',
  'RESEARCHED',
  'CONTACTED',
  'REPLIED',
  'QUALIFIED',
  'CALL_BOOKED',
  'CALL_DONE',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
  'NURTURE'
);

create type public.lead_temperature as enum ('HOT', 'WARM', 'COLD', 'DORMANT');

create type public.lead_status as enum ('ACTIVE', 'PAUSED', 'WON', 'LOST', 'NURTURE');

create type public.lead_source as enum ('LINKEDIN', 'COLD_EMAIL', 'REFERRAL', 'WEBSITE', 'OTHER');

create type public.activity_type as enum (
  'NOTE',
  'LEAD_CREATED',
  'WEBSITE_AUDIT',
  'RESEARCH',
  'CONNECTION_SENT',
  'EMAIL_SENT',
  'MESSAGE_SENT',
  'REPLY_RECEIVED',
  'CALL_BOOKED',
  'CALL_COMPLETED',
  'PROPOSAL_SENT',
  'PROPOSAL_VIEWED',
  'FOLLOW_UP',
  'DEAL_WON',
  'DEAL_LOST'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  first_name text,
  last_name text,
  full_name text not null,
  job_title text,
  company_name text,
  website text,
  linkedin_url text,
  email text,
  phone text,
  niche text,
  location text,
  source public.lead_source not null default 'OTHER',
  stage public.pipeline_stage not null default 'PROSPECT',
  status public.lead_status not null default 'ACTIVE',
  temperature public.lead_temperature not null default 'COLD',
  icp_score smallint check (icp_score between 0 and 100),
  website_score smallint check (website_score between 0 and 100),
  opportunity_score smallint check (opportunity_score between 0 and 100),
  deal_value numeric(12, 2) not null default 0,
  probability smallint not null default 0 check (probability between 0 and 100),
  expected_close_date date,
  next_action text,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.activity_type not null,
  title text not null,
  description text,
  metadata jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.lead_tags (
  lead_id uuid not null references public.leads (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (lead_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cross-workspace integrity triggers
--
-- These provide database-level guarantees that a row never references a record
-- from a different workspace, independent of RLS and application code:
--
--   * activities.workspace_id must equal the workspace of the referenced lead.
--   * a lead_tags row must link a lead and a tag in the SAME workspace.
--
-- SECURITY DEFINER lets the trigger read public.leads / public.tags without
-- RLS interference (the checks compare workspace ids and raise otherwise;
-- they never read a row's data back to the caller).
-- ---------------------------------------------------------------------------

create or replace function public.enforce_activity_workspace_matches_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_workspace uuid;
begin
  select w.workspace_id into v_lead_workspace
  from public.leads w
  where w.id = new.lead_id;

  if v_lead_workspace is null then
    raise exception 'activity references a lead (lead_id=%) that does not exist', new.lead_id;
  end if;

  if new.workspace_id is distinct from v_lead_workspace then
    raise exception
      'activity workspace_id (%) does not match its lead''s workspace (%)',
      new.workspace_id, v_lead_workspace
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_lead_tag_same_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_workspace uuid;
  v_tag_workspace uuid;
begin
  select workspace_id into v_lead_workspace
  from public.leads
  where id = new.lead_id;

  select workspace_id into v_tag_workspace
  from public.tags
  where id = new.tag_id;

  if v_lead_workspace is null then
    raise exception 'lead_tags references a lead (lead_id=%) that does not exist', new.lead_id;
  end if;

  if v_tag_workspace is null then
    raise exception 'lead_tags references a tag (tag_id=%) that does not exist', new.tag_id;
  end if;

  if v_lead_workspace is distinct from v_tag_workspace then
    raise exception
      'lead (workspace %) and tag (workspace %) belong to different workspaces',
      v_lead_workspace, v_tag_workspace
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger activities_enforce_workspace_matches_lead
  before insert or update on public.activities
  for each row execute function public.enforce_activity_workspace_matches_lead();

create trigger lead_tags_enforce_same_workspace
  before insert or update on public.lead_tags
  for each row execute function public.enforce_lead_tag_same_workspace();

revoke execute on function public.enforce_activity_workspace_matches_lead() from public, anon;
revoke execute on function public.enforce_lead_tag_same_workspace() from public, anon;

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- SECURITY DEFINER functions run with the privileges of the migration owner,
-- so their internal table lookups bypass RLS. This avoids the infinite
-- recursion that would occur if workspace_members policies referenced
-- workspace_members directly.
-- ---------------------------------------------------------------------------

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role = 'owner'
  );
$$;

create or replace function public.is_lead_in_member_workspace(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads
    where leads.id = target_lead_id
      and public.is_workspace_member(leads.workspace_id)
  );
$$;

create or replace function public.is_tag_in_member_workspace(target_tag_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tags
    where tags.id = target_tag_id
      and public.is_workspace_member(tags.workspace_id)
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.is_workspace_owner(uuid) from public, anon;
revoke execute on function public.is_lead_in_member_workspace(uuid) from public, anon;
revoke execute on function public.is_tag_in_member_workspace(uuid) from public, anon;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.is_lead_in_member_workspace(uuid) to authenticated;
grant execute on function public.is_tag_in_member_workspace(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Workspace bootstrap
--
-- SECURITY DEFINER so that auth.uid() is the only user who can be recorded as
-- the workspace owner: there is no argument that lets a caller designate
-- another user as owner. search_path is pinned to public so the function can
-- never pick up tables from the caller's search_path.
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_workspace(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_full_name text;
  v_workspace_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if p_slug !~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$' then
    raise exception 'invalid workspace slug: must start/end alphanumeric, 3-64 chars, lowercase letters, digits, hyphens'
      using errcode = '22023';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'workspace name is required' using errcode = '22023';
  end if;

  select full_name into v_full_name
  from public.profiles
  where profiles.id = v_user;

  insert into public.profiles (id, full_name)
  values (v_user, coalesce(v_full_name, btrim(p_name)))
  on conflict (id) do nothing;

  insert into public.workspaces (name, slug)
  values (btrim(p_name), p_slug)
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, v_user, 'owner'::public.workspace_role);

  return v_workspace_id;
end;
$$;

revoke execute on function public.bootstrap_workspace(text, text) from public, anon;
grant execute on function public.bootstrap_workspace(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_members enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.tags enable row level security;
alter table public.lead_tags enable row level security;

-- workspaces ----------------------------------------------------------------

create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_update_owner" on public.workspaces
  for update
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));

-- profiles ------------------------------------------------------------------

create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- workspace_members ---------------------------------------------------------

create policy "workspace_members_select_member" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- leads ---------------------------------------------------------------------

create policy "leads_select_member" on public.leads
  for select using (public.is_workspace_member(workspace_id));

create policy "leads_insert_member" on public.leads
  for insert with check (public.is_workspace_member(workspace_id));

create policy "leads_update_member" on public.leads
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "leads_delete_member" on public.leads
  for delete using (public.is_workspace_member(workspace_id));

-- activities ----------------------------------------------------------------

create policy "activities_select_member" on public.activities
  for select using (public.is_workspace_member(workspace_id));

create policy "activities_insert_member" on public.activities
  for insert with check (public.is_workspace_member(workspace_id));

create policy "activities_update_member" on public.activities
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "activities_delete_member" on public.activities
  for delete using (public.is_workspace_member(workspace_id));

-- tags ----------------------------------------------------------------------

create policy "tags_select_member" on public.tags
  for select using (public.is_workspace_member(workspace_id));

create policy "tags_insert_member" on public.tags
  for insert with check (public.is_workspace_member(workspace_id));

create policy "tags_update_member" on public.tags
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "tags_delete_member" on public.tags
  for delete using (public.is_workspace_member(workspace_id));

-- lead_tags -----------------------------------------------------------------
-- No workspace_id column; membership is derived from both the lead and the tag.

create policy "lead_tags_select_member" on public.lead_tags
  for select using (
    public.is_lead_in_member_workspace(lead_id)
    and public.is_tag_in_member_workspace(tag_id)
  );

create policy "lead_tags_insert_member" on public.lead_tags
  for insert with check (
    public.is_lead_in_member_workspace(lead_id)
    and public.is_tag_in_member_workspace(tag_id)
  );

create policy "lead_tags_update_member" on public.lead_tags
  for update
  using (
    public.is_lead_in_member_workspace(lead_id)
    and public.is_tag_in_member_workspace(tag_id)
  )
  with check (
    public.is_lead_in_member_workspace(lead_id)
    and public.is_tag_in_member_workspace(tag_id)
  );

create policy "lead_tags_delete_member" on public.lead_tags
  for delete using (
    public.is_lead_in_member_workspace(lead_id)
    and public.is_tag_in_member_workspace(tag_id)
  );

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index leads_workspace_id_idx on public.leads (workspace_id);
create index leads_workspace_stage_idx on public.leads (workspace_id, stage);
create index leads_workspace_next_action_at_idx on public.leads (workspace_id, next_action_at);
create index leads_workspace_temperature_idx on public.leads (workspace_id, temperature);
create index leads_workspace_opportunity_score_idx on public.leads (workspace_id, opportunity_score);
create index activities_lead_occurred_at_idx on public.activities (lead_id, occurred_at);
create index activities_workspace_occurred_at_idx on public.activities (workspace_id, occurred_at);