-- Arrant HR Solutions: secure admin setup for the existing four tables.
-- Run in Supabase SQL Editor AFTER creating the four tables and the private `resumes` bucket.
-- Safe to rerun: policies/functions/table are recreated idempotently.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Admin allowlist is not directly readable/writable by browser users.
drop policy if exists "Admins can read admin list" on public.admin_users;
create policy "Admins can read admin list" on public.admin_users
for select to authenticated using (public.is_admin());

-- Admin-only management access. Public forms retain INSERT access from the existing schema.
do $$
declare t text;
begin
  foreach t in array array['contact_enquiries','job_seekers','job_providers','job_posters'] loop
    execute format('drop policy if exists %I on public.%I', 'Admin select '||t, t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', 'Admin select '||t, t);
    execute format('drop policy if exists %I on public.%I', 'Admin update '||t, t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', 'Admin update '||t, t);
    execute format('drop policy if exists %I on public.%I', 'Admin delete '||t, t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_admin())', 'Admin delete '||t, t);
  end loop;
end $$;

-- Private resume storage. Candidate upload is allowed; only approved admins can read.
drop policy if exists "Allow candidate resume uploads" on storage.objects;
create policy "Allow candidate resume uploads" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'resumes');

drop policy if exists "Only approved admins can access resumes" on storage.objects;
create policy "Only approved admins can access resumes" on storage.objects
for select to authenticated
using (bucket_id = 'resumes' and public.is_admin());

-- Ensure bucket remains private (does not expose existing resume objects publicly).
update storage.buckets set public = false where id = 'resumes';
