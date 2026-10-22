-- Apply once in Supabase SQL Editor. Run in a controlled environment first.
create table if not exists public.pg_student_identity (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mobile_number text not null default '',
 nida_number text not null default '',
 inec_number text not null default '',
 nhif_number text not null default '',
 birth_certificate_number text not null default '',
 passport_photo_path text,
 updated_at timestamptz not null default now(),
 constraint pg_identity_mobile_format check (mobile_number = '' or mobile_number ~ '^(\+255|0)[67][0-9]{8}$'),
 constraint pg_identity_nida_format check (nida_number = '' or nida_number ~ '^[0-9]{20}$')
);
alter table public.pg_student_identity enable row level security;
revoke all on public.pg_student_identity from anon;
grant select,insert,update on public.pg_student_identity to authenticated;
create policy "Student reads own identity" on public.pg_student_identity for select to authenticated using ((select auth.uid()) = user_id);
create policy "Student inserts own identity" on public.pg_student_identity for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Student updates own identity" on public.pg_student_identity for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Private bucket; no public access to identity photos.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('pg-student-identity','pg-student-identity',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Student reads own photo" on storage.objects for select to authenticated using (bucket_id = 'pg-student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Student uploads own photo" on storage.objects for insert to authenticated with check (bucket_id = 'pg-student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Student replaces own photo" on storage.objects for update to authenticated using (bucket_id = 'pg-student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'pg-student-identity' and (storage.foldername(name))[1] = (select auth.uid())::text);
