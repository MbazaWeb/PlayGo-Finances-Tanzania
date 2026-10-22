-- Reconcile PlayGo Student Identity permissions and institution masking.
-- Applied to Global Student System Supabase on 2026-10-22.
-- Requires sql/20261022_student_identity.sql and sql/20261022_student_identity_approval.sql.
-- This migration is idempotent and does not change student data.

-- Ownership is immutable after insertion; do not allow students to UPDATE user_id.
revoke update(user_id) on public.pg_student_identity from authenticated;

-- Match the original GitHub migration: mask every character except the last four.
create or replace function public.pg_institution_identity_reviews()
returns table(
  user_id uuid, student_name text, mobile_masked text, nida_masked text,
  inec_masked text, nhif_masked text, birth_masked text, has_photo boolean,
  status text, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select i.user_id, coalesce(p.full_name,'Student')::text,
    case when length(i.mobile_number)>4 then repeat('•',length(i.mobile_number)-4)||right(i.mobile_number,4) else '' end,
    case when length(i.nida_number)>4 then repeat('•',length(i.nida_number)-4)||right(i.nida_number,4) else '' end,
    case when length(i.inec_number)>4 then repeat('•',length(i.inec_number)-4)||right(i.inec_number,4) else '' end,
    case when length(i.nhif_number)>4 then repeat('•',length(i.nhif_number)-4)||right(i.nhif_number,4) else '' end,
    case when length(i.birth_certificate_number)>4 then repeat('•',length(i.birth_certificate_number)-4)||right(i.birth_certificate_number,4) else '' end,
    i.passport_photo_path is not null, i.verification_status, i.updated_at
  from public.pg_student_identity i
  join public.pg_enrollments e on e.user_id=i.user_id and e.active=true
  join public.pg_institutions inst on inst.id=e.institution_id and inst.admin_user_id=(select auth.uid())
  left join public.pg_profiles p on p.user_id=i.user_id
  where (select auth.uid()) is not null
  order by i.updated_at desc
$$;
revoke all on function public.pg_institution_identity_reviews() from public,anon;
grant execute on function public.pg_institution_identity_reviews() to authenticated;
