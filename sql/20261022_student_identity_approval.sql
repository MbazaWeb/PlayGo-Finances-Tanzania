-- Run only after 20261022_student_identity.sql. Review on staging first.
alter table public.pg_student_identity
 add column if not exists verification_status text not null default 'pending'
 check (verification_status in ('pending','approved','rejected')),
 add column if not exists verified_at timestamptz,
 add column if not exists verified_by uuid references auth.users(id);

-- Students may edit identity data but cannot self-approve.
revoke insert,update on public.pg_student_identity from authenticated;
grant insert (user_id,mobile_number,nida_number,inec_number,nhif_number,birth_certificate_number,passport_photo_path) on public.pg_student_identity to authenticated;
grant update (mobile_number,nida_number,inec_number,nhif_number,birth_certificate_number,passport_photo_path)
 on public.pg_student_identity to authenticated;

-- Reset verification status automatically on every material identity change.
create or replace function public.pg_identity_reset_verification()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if row(new.mobile_number,new.nida_number,new.inec_number,new.nhif_number,new.birth_certificate_number,new.passport_photo_path)
    is distinct from row(old.mobile_number,old.nida_number,old.inec_number,old.nhif_number,old.birth_certificate_number,old.passport_photo_path) then
   new.verification_status := 'pending';
   new.verified_at := null;
   new.verified_by := null;
 end if;
 new.updated_at := now();
 return new;
end $$;
drop trigger if exists pg_identity_reset_verification on public.pg_student_identity;
create trigger pg_identity_reset_verification before update on public.pg_student_identity
for each row execute function public.pg_identity_reset_verification();

-- Do not expose full NIDA / NHIF / birth-certificate identifiers to the institution list.
create or replace function public.pg_institution_identity_reviews()
returns table(user_id uuid, student_name text, mobile_masked text, nida_masked text, inec_masked text, nhif_masked text, birth_masked text, has_photo boolean, status text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select i.user_id, coalesce(p.full_name,'Student')::text,
 case when length(i.mobile_number)>4 then repeat('•',length(i.mobile_number)-4)||right(i.mobile_number,4) else '' end,
 case when length(i.nida_number)>4 then repeat('•',length(i.nida_number)-4)||right(i.nida_number,4) else '' end,
 case when length(i.inec_number)>4 then repeat('•',length(i.inec_number)-4)||right(i.inec_number,4) else '' end,
 case when length(i.nhif_number)>4 then repeat('•',length(i.nhif_number)-4)||right(i.nhif_number,4) else '' end,
 case when length(i.birth_certificate_number)>4 then repeat('•',length(i.birth_certificate_number)-4)||right(i.birth_certificate_number,4) else '' end,
 i.passport_photo_path is not null, i.verification_status, i.updated_at
 from public.pg_student_identity i
 join public.pg_enrollments e on e.user_id=i.user_id and e.active
 join public.pg_institutions inst on inst.id=e.institution_id and inst.admin_user_id=(select auth.uid())
 left join public.pg_profiles p on p.user_id=i.user_id
 where (select auth.uid()) is not null
 order by i.updated_at desc;
$$;
create or replace function public.pg_institution_review_identity(p_student uuid,p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.pg_enrollments e
  join public.pg_institutions inst on inst.id=e.institution_id
  where e.user_id=p_student and e.active and inst.admin_user_id=(select auth.uid())
 ) then raise exception 'Not authorized to review this student'; end if;
 update public.pg_student_identity
 set verification_status=case when p_approve then 'approved' else 'rejected' end,
     verified_at=now(),verified_by=(select auth.uid()),updated_at=now()
 where user_id=p_student and verification_status in ('pending','rejected');
 if not found then raise exception 'No pending identity changes found'; end if;
end $$;
revoke all on function public.pg_institution_identity_reviews() from public,anon;
revoke all on function public.pg_institution_review_identity(uuid,boolean) from public,anon;
grant execute on function public.pg_institution_identity_reviews() to authenticated;
grant execute on function public.pg_institution_review_identity(uuid,boolean) to authenticated;
