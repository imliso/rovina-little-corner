-- Optional authenticated-profile template; replace OWNER_EMAIL_HERE if you use it.

create table if not exists public.friend_profile (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null default 'Your Best Friend',
  nickname text not null default '',
  pronouns text not null default '',
  location text not null default '',
  birthday text not null default '',
  friends_since date,
  tagline text not null default '',
  about text not null default '',
  qualities text[] not null default '{}',
  favorite_memory text not null default '',
  inside_joke text not null default '',
  favorite_things text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  photo_url text,
  photo_path text,
  updated_at timestamptz not null default now()
);

alter table public.friend_profile enable row level security;

grant select on public.friend_profile to anon, authenticated;
grant insert, update on public.friend_profile to authenticated;

create or replace function public.is_friend_archive_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.jwt() ->> 'email') = 'OWNER_EMAIL_HERE'
$$;

revoke all on function public.is_friend_archive_owner() from public;
grant execute on function public.is_friend_archive_owner() to authenticated;

drop policy if exists "Anyone can view the friend archive" on public.friend_profile;
create policy "Anyone can view the friend archive"
  on public.friend_profile for select to anon, authenticated using (true);

drop policy if exists "Archive owner can create the profile" on public.friend_profile;
create policy "Archive owner can create the profile"
  on public.friend_profile for insert to authenticated
  with check (public.is_friend_archive_owner() and auth.uid() = owner_id);

drop policy if exists "Archive owner can update the profile" on public.friend_profile;
create policy "Archive owner can update the profile"
  on public.friend_profile for update to authenticated
  using (public.is_friend_archive_owner() and auth.uid() = owner_id)
  with check (public.is_friend_archive_owner() and auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('friend-photos', 'friend-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view friend photos" on storage.objects;
create policy "Anyone can view friend photos"
  on storage.objects for select to anon, authenticated using (bucket_id = 'friend-photos');

drop policy if exists "Archive owner can upload friend photos" on storage.objects;
create policy "Archive owner can upload friend photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'friend-photos' and public.is_friend_archive_owner() and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Archive owner can replace friend photos" on storage.objects;
create policy "Archive owner can replace friend photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'friend-photos' and public.is_friend_archive_owner() and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'friend-photos' and public.is_friend_archive_owner() and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Archive owner can delete friend photos" on storage.objects;
create policy "Archive owner can delete friend photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'friend-photos' and public.is_friend_archive_owner() and (storage.foldername(name))[1] = auth.uid()::text);