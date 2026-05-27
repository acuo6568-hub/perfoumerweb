create extension if not exists pgcrypto;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 40),
  user_email text not null,
  perfume_slug text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 2 and 600),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.comments
  add column if not exists username text;

alter table public.comments
  add column if not exists avatar_url text;

update public.comments
set username = left(split_part(user_email, '@', 1), 40)
where username is null or btrim(username) = '';

alter table public.comments
  alter column username set not null;

alter table public.comments
  drop constraint if exists comments_username_length_check;

alter table public.comments
  add constraint comments_username_length_check check (char_length(username) between 3 and 40);

create index if not exists comments_perfume_slug_created_at_idx
  on public.comments (perfume_slug, created_at desc);

create unique index if not exists comments_user_perfume_unique_idx
  on public.comments (user_id, perfume_slug);

create table if not exists public.wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  perfume_slug text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, perfume_slug)
);

create table if not exists public.wishlist_shares (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique check (char_length(token) between 24 and 128),
  allow_additions boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.wishlist_shares
  add column if not exists allow_additions boolean not null default false;

create index if not exists wishlists_user_created_at_idx
  on public.wishlists (user_id, created_at desc);

create index if not exists wishlist_shares_token_idx
  on public.wishlist_shares (token);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  perfume_slug text not null,
  size_ml integer not null check (size_ml > 0),
  quantity integer not null default 1 check (quantity > 0 and quantity <= 50),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkout_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 24),
  line1 text not null check (char_length(btrim(line1)) between 5 and 240),
  line2 text not null default '',
  city text not null check (char_length(btrim(city)) between 2 and 120),
  postal_code text not null check (char_length(btrim(postal_code)) between 3 and 20),
  country text not null check (char_length(btrim(country)) between 2 and 120),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id text not null default '' check (char_length(anonymous_id) between 6 and 128),
  locale text not null default 'en' check (char_length(locale) between 2 and 10),
  title text not null default '' check (char_length(title) <= 140),
  preview text not null default '' check (char_length(preview) <= 300),
  messages_json jsonb not null default '[]'::jsonb,
  page_path text not null default '' check (char_length(page_path) <= 180),
  current_perfume_slug text not null default '' check (char_length(current_perfume_slug) <= 120),
  device_type text not null default '' check (char_length(device_type) <= 24),
  browser text not null default '' check (char_length(browser) <= 48),
  os text not null default '' check (char_length(os) <= 48),
  user_agent text not null default '' check (char_length(user_agent) <= 320),
  country_code text not null default '' check (char_length(country_code) <= 4),
  country text not null default '' check (char_length(country) <= 120),
  region text not null default '' check (char_length(region) <= 120),
  city text not null default '' check (char_length(city) <= 120),
  timezone text not null default '' check (char_length(timezone) <= 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '3 hours')
);

alter table if exists public.ai_chat_sessions
  add column if not exists anonymous_id text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists page_path text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists current_perfume_slug text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists device_type text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists browser text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists os text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists user_agent text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists country_code text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists country text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists region text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists city text default '';

alter table if exists public.ai_chat_sessions
  add column if not exists timezone text default '';

create table if not exists public.abandoned_cart_recovery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'cart' check (source in ('cart', 'checkout')),
  locale text not null default 'az' check (locale in ('az', 'en', 'ru')),
  recovery_channel text not null default 'email' check (recovery_channel in ('email', 'whatsapp')),
  email text,
  phone text,
  cart_subtotal numeric(10, 2) not null default 0 check (cart_subtotal >= 0),
  cart_items_json jsonb not null default '[]'::jsonb,
  recommendations_json jsonb not null default '[]'::jsonb,
  incentive_text text not null default '',
  status text not null default 'queued' check (status in ('queued', 'sent', 'cancelled', 'completed')),
  scheduled_for timestamptz not null default (timezone('utc', now()) + interval '30 minutes'),
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.perfume_impression_cache (
  cache_key text primary key,
  slug text not null,
  locale text not null check (locale in ('az', 'en', 'ru')),
  fingerprint text not null,
  data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists perfume_impression_cache_slug_locale_idx
  on public.perfume_impression_cache (slug, locale);

create table if not exists public.perfume_summary_cache (
  cache_key text primary key,
  slug text not null,
  locale text not null check (locale in ('az', 'en', 'ru')),
  fingerprint text not null,
  summary text not null default '',
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists perfume_summary_cache_slug_locale_idx
  on public.perfume_summary_cache (slug, locale);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  locale text not null default 'az' check (locale in ('az', 'en', 'ru')),
  source text not null default 'footer_style' check (char_length(source) between 2 and 80),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

create table if not exists public.newsletter_unsubscribe_tokens (
  token_hash text primary key,
  subscriber_email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz
);

alter table public.newsletter_unsubscribe_tokens
  add column if not exists subscriber_email text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists used_at timestamptz;

create index if not exists newsletter_unsubscribe_tokens_email_idx
  on public.newsletter_unsubscribe_tokens (subscriber_email);

alter table public.cart_items
  add column if not exists perfume_slug text;

alter table public.cart_items
  add column if not exists size_ml integer;

alter table public.cart_items
  add column if not exists quantity integer not null default 1;

alter table public.cart_items
  add column if not exists unit_price numeric(10, 2) not null default 0;

alter table public.cart_items
  add column if not exists created_at timestamptz not null default timezone('utc', now());

alter table public.cart_items
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.cart_items
  alter column perfume_slug set not null;

alter table public.cart_items
  alter column size_ml set not null;

alter table public.cart_items
  drop constraint if exists cart_items_size_ml_check;

alter table public.cart_items
  add constraint cart_items_size_ml_check check (size_ml > 0);

alter table public.cart_items
  drop constraint if exists cart_items_quantity_check;

alter table public.cart_items
  add constraint cart_items_quantity_check check (quantity > 0 and quantity <= 50);

alter table public.cart_items
  drop constraint if exists cart_items_unit_price_check;

alter table public.cart_items
  add constraint cart_items_unit_price_check check (unit_price >= 0);

create unique index if not exists cart_items_user_variant_unique_idx
  on public.cart_items (user_id, perfume_slug, size_ml);

create index if not exists cart_items_user_created_at_idx
  on public.cart_items (user_id, created_at desc);

create index if not exists checkout_addresses_user_created_at_idx
  on public.checkout_addresses (user_id, created_at desc);

create index if not exists ai_chat_sessions_user_last_message_idx
  on public.ai_chat_sessions (user_id, last_message_at desc);

create index if not exists ai_chat_sessions_user_expires_idx
  on public.ai_chat_sessions (user_id, expires_at desc);

create index if not exists ai_chat_sessions_anonymous_last_message_idx
  on public.ai_chat_sessions (anonymous_id, last_message_at desc);

create index if not exists ai_chat_sessions_last_message_idx
  on public.ai_chat_sessions (last_message_at desc);

create index if not exists abandoned_cart_recovery_user_created_idx
  on public.abandoned_cart_recovery (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
before update on public.cart_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_checkout_addresses_updated_at on public.checkout_addresses;
create trigger set_checkout_addresses_updated_at
before update on public.checkout_addresses
for each row
execute function public.set_updated_at();

drop trigger if exists set_wishlist_shares_updated_at on public.wishlist_shares;
create trigger set_wishlist_shares_updated_at
before update on public.wishlist_shares
for each row
execute function public.set_updated_at();

drop trigger if exists set_ai_chat_sessions_updated_at on public.ai_chat_sessions;
create trigger set_ai_chat_sessions_updated_at
before update on public.ai_chat_sessions
for each row
execute function public.set_updated_at();

drop trigger if exists set_abandoned_cart_recovery_updated_at on public.abandoned_cart_recovery;
create trigger set_abandoned_cart_recovery_updated_at
before update on public.abandoned_cart_recovery
for each row
execute function public.set_updated_at();

drop trigger if exists set_perfume_impression_cache_updated_at on public.perfume_impression_cache;
create trigger set_perfume_impression_cache_updated_at
before update on public.perfume_impression_cache
for each row
execute function public.set_updated_at();

drop trigger if exists set_perfume_summary_cache_updated_at on public.perfume_summary_cache;
create trigger set_perfume_summary_cache_updated_at
before update on public.perfume_summary_cache
for each row
execute function public.set_updated_at();

drop trigger if exists set_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger set_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.set_updated_at();

drop trigger if exists set_newsletter_unsubscribe_tokens_updated_at on public.newsletter_unsubscribe_tokens;
create trigger set_newsletter_unsubscribe_tokens_updated_at
before update on public.newsletter_unsubscribe_tokens
for each row
execute function public.set_updated_at();

create or replace function public.get_shared_wishlist(p_token text)
returns table (
  user_id uuid,
  allow_additions boolean,
  perfume_slug text
)
language sql
security definer
set search_path = public
as $$
  select
    share.user_id,
    share.allow_additions,
    item.perfume_slug
  from public.wishlist_shares as share
  left join public.wishlists as item
    on item.user_id = share.user_id
  where share.token = p_token;
$$;

grant execute on function public.get_shared_wishlist(text) to anon, authenticated;

create or replace function public.add_to_shared_wishlist(p_token text, p_perfume_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  share_owner uuid;
  additions_allowed boolean;
begin
  select share.user_id, share.allow_additions
  into share_owner, additions_allowed
  from public.wishlist_shares as share
  where share.token = p_token;

  if share_owner is null then
    raise exception 'share_not_found';
  end if;

  if not additions_allowed then
    raise exception 'additions_not_allowed';
  end if;

  insert into public.wishlists (user_id, perfume_slug)
  values (share_owner, lower(trim(p_perfume_slug)))
  on conflict (user_id, perfume_slug) do nothing;
end;
$$;

grant execute on function public.add_to_shared_wishlist(text, text) to anon, authenticated;

alter table public.comments enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_shares enable row level security;
alter table public.cart_items enable row level security;
alter table public.checkout_addresses enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.abandoned_cart_recovery enable row level security;
alter table public.perfume_impression_cache enable row level security;
alter table public.perfume_summary_cache enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_unsubscribe_tokens enable row level security;

drop policy if exists "Impression cache is visible to everyone" on public.perfume_impression_cache;
create policy "Impression cache is visible to everyone"
  on public.perfume_impression_cache
  for select
  using (true);

drop policy if exists "Summary cache is visible to everyone" on public.perfume_summary_cache;
create policy "Summary cache is visible to everyone"
  on public.perfume_summary_cache
  for select
  using (true);

drop policy if exists "Comments are visible to everyone" on public.comments;
create policy "Comments are visible to everyone"
  on public.comments
  for select
  using (true);

drop policy if exists "Users can insert own comments" on public.comments;
create policy "Users can insert own comments"
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and user_email = coalesce(auth.jwt() ->> 'email', '')
  );

drop policy if exists "Users can update own comments" on public.comments;
create policy "Users can update own comments"
  on public.comments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and user_email = coalesce(auth.jwt() ->> 'email', '')
  );

drop policy if exists "Users can delete own comments" on public.comments;
create policy "Users can delete own comments"
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own wishlists" on public.wishlists;
create policy "Users can read own wishlists"
  on public.wishlists
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own wishlists" on public.wishlists;
create policy "Users can insert own wishlists"
  on public.wishlists
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own wishlists" on public.wishlists;
create policy "Users can delete own wishlists"
  on public.wishlists
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own wishlist shares" on public.wishlist_shares;
create policy "Users can read own wishlist shares"
  on public.wishlist_shares
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own wishlist shares" on public.wishlist_shares;
create policy "Users can insert own wishlist shares"
  on public.wishlist_shares
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own wishlist shares" on public.wishlist_shares;
create policy "Users can update own wishlist shares"
  on public.wishlist_shares
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own wishlist shares" on public.wishlist_shares;
create policy "Users can delete own wishlist shares"
  on public.wishlist_shares
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own cart items" on public.cart_items;
create policy "Users can read own cart items"
  on public.cart_items
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own cart items" on public.cart_items;
create policy "Users can insert own cart items"
  on public.cart_items
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own cart items" on public.cart_items;
create policy "Users can update own cart items"
  on public.cart_items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own cart items" on public.cart_items;
create policy "Users can delete own cart items"
  on public.cart_items
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own checkout addresses" on public.checkout_addresses;
create policy "Users can read own checkout addresses"
  on public.checkout_addresses
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own checkout addresses" on public.checkout_addresses;
create policy "Users can insert own checkout addresses"
  on public.checkout_addresses
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own checkout addresses" on public.checkout_addresses;
create policy "Users can update own checkout addresses"
  on public.checkout_addresses
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own checkout addresses" on public.checkout_addresses;
create policy "Users can delete own checkout addresses"
  on public.checkout_addresses
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can read own ai chat sessions"
  on public.ai_chat_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can insert own ai chat sessions"
  on public.ai_chat_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can update own ai chat sessions"
  on public.ai_chat_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own ai chat sessions" on public.ai_chat_sessions;
create policy "Users can delete own ai chat sessions"
  on public.ai_chat_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can read own abandoned cart recovery" on public.abandoned_cart_recovery;
create policy "Users can read own abandoned cart recovery"
  on public.abandoned_cart_recovery
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own abandoned cart recovery" on public.abandoned_cart_recovery;
create policy "Users can insert own abandoned cart recovery"
  on public.abandoned_cart_recovery
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own abandoned cart recovery" on public.abandoned_cart_recovery;
create policy "Users can update own abandoned cart recovery"
  on public.abandoned_cart_recovery
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar images" on storage.objects;
create policy "Users can upload own avatar images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar images" on storage.objects;
create policy "Users can update own avatar images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar images" on storage.objects;
create policy "Users can delete own avatar images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Orders table for tracking customer purchases
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'new' check (status in ('new', 'confirmed', 'preparing', 'ready_for_pickup', 'handed_over', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded', 'pending', 'processing', 'shipped')),
  payment_method text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  currency text not null default 'AZN',
  items_json jsonb not null default '[]'::jsonb,
  delivery_address_json jsonb,
  tracking_number text,
  kapital_order_id text,
  kapital_payment_id text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

alter table public.orders
  alter column status set default 'new';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('new', 'confirmed', 'preparing', 'ready_for_pickup', 'handed_over', 'ready_for_dispatch', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'refunded', 'pending', 'processing', 'shipped'));

create index if not exists orders_user_id_created_at_idx
  on public.orders (user_id, created_at desc);

create index if not exists orders_order_number_idx
  on public.orders (order_number);

create index if not exists orders_status_idx
  on public.orders (status);

alter table public.orders enable row level security;

drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert their own orders" on public.orders;
create policy "Users can insert their own orders"
  on public.orders
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own order notes" on public.orders;
create policy "Users can update their own order notes"
  on public.orders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.order_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_role text not null check (actor_role in ('admin', 'staff')),
  actor_username text not null check (char_length(btrim(actor_username)) between 1 and 80),
  action text not null check (action in ('status_change', 'price_change', 'address_change', 'refund', 'cancel')),
  reason text,
  details text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_logs_order_id_created_at_idx
  on public.order_logs (order_id, created_at desc);

create index if not exists order_logs_created_at_idx
  on public.order_logs (created_at desc);

alter table public.order_logs enable row level security;

-- Live website analytics (sessions + events)
create table if not exists public.website_live_sessions (
  session_id text primary key,
  anonymous_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  is_logged_in boolean not null default false,
  device_type text not null default 'unknown',
  os text not null default '',
  browser text not null default '',
  locale text not null default 'az',
  timezone text not null default '',
  country_code text not null default '',
  country text not null default '',
  region text not null default '',
  city text not null default '',
  user_agent text not null default '',
  is_suspected_bot boolean not null default false,
  traffic_reason text not null default '',
  path text not null default '/',
  referrer text not null default '',
  first_seen timestamptz not null default timezone('utc', now()),
  last_seen timestamptz not null default timezone('utc', now()),
  page_views integer not null default 1 check (page_views >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.website_analytics_events (
  id bigserial primary key,
  session_id text not null,
  anonymous_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'page_view',
  is_logged_in boolean not null default false,
  device_type text not null default 'unknown',
  os text not null default '',
  browser text not null default '',
  locale text not null default 'az',
  timezone text not null default '',
  country_code text not null default '',
  country text not null default '',
  region text not null default '',
  city text not null default '',
  user_agent text not null default '',
  is_suspected_bot boolean not null default false,
  traffic_reason text not null default '',
  path text not null default '/',
  referrer text not null default '',
  promo_key text not null default '',
  promo_label text not null default '',
  promo_target text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.website_live_sessions
  add column if not exists timezone text not null default '',
  add column if not exists country_code text not null default '',
  add column if not exists country text not null default '',
  add column if not exists region text not null default '',
  add column if not exists city text not null default '',
  add column if not exists user_agent text not null default '',
  add column if not exists is_suspected_bot boolean not null default false,
  add column if not exists traffic_reason text not null default '';

alter table public.website_analytics_events
  add column if not exists event_type text not null default 'page_view',
  add column if not exists timezone text not null default '',
  add column if not exists country_code text not null default '',
  add column if not exists country text not null default '',
  add column if not exists region text not null default '',
  add column if not exists city text not null default '',
  add column if not exists user_agent text not null default '',
  add column if not exists is_suspected_bot boolean not null default false,
  add column if not exists traffic_reason text not null default '',
  add column if not exists promo_key text not null default '',
  add column if not exists promo_label text not null default '',
  add column if not exists promo_target text not null default '';

create index if not exists website_live_sessions_last_seen_idx
  on public.website_live_sessions (last_seen desc);

create index if not exists website_live_sessions_user_idx
  on public.website_live_sessions (user_id);

create index if not exists website_live_sessions_anonymous_idx
  on public.website_live_sessions (anonymous_id);

create index if not exists website_live_sessions_country_idx
  on public.website_live_sessions (country);

create index if not exists website_live_sessions_city_idx
  on public.website_live_sessions (city);

create index if not exists website_live_sessions_suspected_bot_idx
  on public.website_live_sessions (is_suspected_bot);

create index if not exists website_analytics_events_created_idx
  on public.website_analytics_events (created_at desc);

create index if not exists website_analytics_events_event_type_idx
  on public.website_analytics_events (event_type);

create index if not exists website_analytics_events_promo_key_idx
  on public.website_analytics_events (promo_key);

create index if not exists website_analytics_events_user_idx
  on public.website_analytics_events (user_id);

create index if not exists website_analytics_events_anonymous_idx
  on public.website_analytics_events (anonymous_id);

create index if not exists website_analytics_events_path_idx
  on public.website_analytics_events (path);

create index if not exists website_analytics_events_country_idx
  on public.website_analytics_events (country);

create index if not exists website_analytics_events_suspected_bot_idx
  on public.website_analytics_events (is_suspected_bot);

drop trigger if exists set_website_live_sessions_updated_at on public.website_live_sessions;
create trigger set_website_live_sessions_updated_at
before update on public.website_live_sessions
for each row
execute function public.set_updated_at();

alter table public.website_live_sessions enable row level security;
alter table public.website_analytics_events enable row level security;

drop policy if exists "Analytics sessions are readable" on public.website_live_sessions;
create policy "Analytics sessions are readable"
  on public.website_live_sessions
  for select
  using (true);

drop policy if exists "Analytics sessions are writable" on public.website_live_sessions;
create policy "Analytics sessions are writable"
  on public.website_live_sessions
  for all
  using (true)
  with check (true);

drop policy if exists "Analytics events are readable" on public.website_analytics_events;
create policy "Analytics events are readable"
  on public.website_analytics_events
  for select
  using (true);

drop policy if exists "Analytics events are insertable" on public.website_analytics_events;
create policy "Analytics events are insertable"
  on public.website_analytics_events
  for insert
  with check (true);
