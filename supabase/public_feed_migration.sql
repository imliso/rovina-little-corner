-- Run in Supabase SQL Editor after schema.sql has succeeded.
-- Safe to rerun: this refreshes the feed, reactions, portrait settings, and storage policies.
-- Feed posts and images are public. Anyone with the site link can upload them.

create table if not exists public.friend_feed_posts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'A friend' check (char_length(display_name) <= 40),
  message text not null default '' check (char_length(message) <= 600),
  image_url text,
  image_path text,
  image_alt text,
  created_at timestamptz not null default now(),
  constraint friend_feed_posts_content_required check (char_length(trim(message)) > 0 or image_url is not null)
);

alter table public.friend_feed_posts enable row level security;
grant select, insert, delete on public.friend_feed_posts to anon, authenticated;

drop policy if exists "Anyone can read Rovina's feed" on public.friend_feed_posts;
create policy "Anyone can read Rovina's feed"
  on public.friend_feed_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can post to Rovina's feed" on public.friend_feed_posts;
create policy "Anyone can post to Rovina's feed"
  on public.friend_feed_posts for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can delete posts from Rovina's feed" on public.friend_feed_posts;
create policy "Anyone can delete posts from Rovina's feed"
  on public.friend_feed_posts for delete
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can upload feed photos" on storage.objects;
create policy "Anyone can upload feed photos"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'friend-photos' and (storage.foldername(name))[1] in ('feed', 'portrait'));

drop policy if exists "Anyone can delete feed photos" on storage.objects;
create policy "Anyone can delete feed photos"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'friend-photos' and (storage.foldername(name))[1] in ('feed', 'portrait'));

create table if not exists public.friend_feed_reactions (
  post_id uuid not null references public.friend_feed_posts(id) on delete cascade,
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

alter table public.friend_feed_reactions enable row level security;
grant select, insert on public.friend_feed_reactions to anon, authenticated;

drop policy if exists "Anyone can read Rovina feed reactions" on public.friend_feed_reactions;
create policy "Anyone can read Rovina feed reactions"
  on public.friend_feed_reactions for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can react to Rovina feed posts" on public.friend_feed_reactions;
create policy "Anyone can react to Rovina feed posts"
  on public.friend_feed_reactions for insert
  to anon, authenticated
  with check (true);

create table if not exists public.friend_site_settings (
  id smallint primary key default 1 check (id = 1),
  portrait_url text,
  portrait_path text,
  updated_at timestamptz not null default now()
);

alter table public.friend_site_settings enable row level security;
grant select, insert, update on public.friend_site_settings to anon, authenticated;

drop policy if exists "Anyone can read Rovina site settings" on public.friend_site_settings;
create policy "Anyone can read Rovina site settings"
  on public.friend_site_settings for select to anon, authenticated using (true);

drop policy if exists "Anyone can set Rovina's portrait" on public.friend_site_settings;
create policy "Anyone can set Rovina's portrait"
  on public.friend_site_settings for insert to anon, authenticated
  with check (id = 1);

drop policy if exists "Anyone can update Rovina's portrait" on public.friend_site_settings;
create policy "Anyone can update Rovina's portrait"
  on public.friend_site_settings for update to anon, authenticated
  using (id = 1)
  with check (id = 1);
