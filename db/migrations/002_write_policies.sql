-- Insert policies for profiles and offers.
--
-- Signing in creates an `auth.users` row, not a `profiles` row -- the app writes that
-- on first post. If `profiles` grants only select and update, that first write is an
-- INSERT with no policy to permit it, and Postgres rejects it with
--   42501 new row violates row-level security policy for table "profiles"
--
-- This stayed invisible for as long as Google was the only provider: every existing
-- seller already had a profiles row from before the policies tightened, so their
-- upsert was an UPDATE. It surfaces the first time a genuinely new account posts,
-- which is what adding Microsoft Entra ID produced -- a new provider issues a new
-- user id, so the maintainer's own account arrived as a brand-new user.
--
-- Run this in the Supabase SQL editor. Safe to re-run: each policy is created only if
-- one of that name does not already exist, and nothing here drops or alters an
-- existing policy.

-- 1. A signed-in user may create their own profile row, and only their own.
--    `auth.uid() = id` is what stops one account writing a row for another.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    execute 'create policy profiles_insert_own on public.profiles
             for insert to authenticated
             with check (auth.uid() = id)';
  end if;
end $$;

-- 2. The upsert on first post is an INSERT; on every later post it is an UPDATE of
--    the same row. Without this, a returning seller editing their contact details
--    fails the same way.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    execute 'create policy profiles_update_own on public.profiles
             for update to authenticated
             using (auth.uid() = id)
             with check (auth.uid() = id)';
  end if;
end $$;

-- 3. A seller may list points only under their own id. The API route sets seller_id
--    from the verified token rather than from the request body, so this is defence in
--    depth rather than the primary check -- but it is the check that holds if a future
--    route forgets.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'offers'
      and policyname = 'offers_insert_own'
  ) then
    execute 'create policy offers_insert_own on public.offers
             for insert to authenticated
             with check (auth.uid() = seller_id)';
  end if;
end $$;

-- 4. Confirm the result. Every write path above should appear here.
select tablename, policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public' and tablename in ('offers', 'profiles')
order by tablename, cmd;
