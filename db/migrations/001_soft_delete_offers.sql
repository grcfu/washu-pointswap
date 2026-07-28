-- Soft-delete for offers.
--
-- Removing a listing used to be a hard DELETE, so a seller pulling an offer
-- destroyed the row: the price it was listed at, and the fact it ever existed,
-- were gone permanently. Every removal was silent, unrecoverable data loss, and
-- the marketplace could never answer "what did points actually sell for?"
--
-- Run this in the Supabase SQL editor BEFORE deploying the matching code change.
-- The new delete route writes `deleted_at`; without the column it fails and no
-- listing can be removed at all. Safe to re-run — every statement is idempotent.

-- 1. The column. NULL means live, a timestamp means the seller pulled it.
alter table public.offers
  add column if not exists deleted_at timestamptz;

-- 2. The read path filters on this every request, so index the live rows only.
--    A partial index stays small as removed listings accumulate.
create index if not exists offers_live_idx
  on public.offers (status)
  where deleted_at is null;

-- 3. If row-level security is on, UPDATE needs its own policy — a DELETE policy
--    does not cover it, and the soft delete would silently match zero rows,
--    which the route reports as "not yours to remove". This only fires when RLS
--    is actually enabled and no UPDATE policy exists yet, so it is a no-op on a
--    table that is already configured. Ownership is enforced in the route by
--    `.eq('seller_id', userId)`, matching how DELETE already worked.
do $$
begin
  if (select rowsecurity from pg_tables
      where schemaname = 'public' and tablename = 'offers')
     and not exists (select 1 from pg_policies
                     where schemaname = 'public' and tablename = 'offers'
                       and cmd = 'UPDATE')
  then
    execute 'create policy offers_soft_delete on public.offers
             for update using (true) with check (true)';
  end if;
end $$;

-- 4. Hardening, and the reason this migration is worth more than the column.
--
--    The anon key is NEXT_PUBLIC_ — it ships in the browser bundle, so treat it
--    as known to everyone. Switching the app to soft delete does not protect the
--    data while the database still lets that key issue a hard DELETE or rewrite
--    any column directly against the REST API.
--
--    After this, the key can set deleted_at and nothing else on this table, and
--    cannot destroy rows at all. Nothing in the app needs the wider access:
--    offers are only ever inserted, selected, and now soft-deleted.
--
--    Drop these two statements if you would rather keep the change to the column
--    alone; the application code works either way.
revoke update, delete on public.offers from anon;
grant update (deleted_at) on public.offers to anon;

-- 5. Verify. Expect: deleted_at present, offers_live_idx present, and the anon
--    grants reduced to select/insert plus update on deleted_at only.
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'offers'
 order by ordinal_position;

select tablename, indexname
  from pg_indexes
 where schemaname = 'public' and tablename = 'offers';

select grantee, privilege_type, column_name
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'offers' and grantee = 'anon'
union all
select grantee, privilege_type, '(table-wide)'
  from information_schema.table_privileges
 where table_schema = 'public' and table_name = 'offers' and grantee = 'anon'
 order by privilege_type;
