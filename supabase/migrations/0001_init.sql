-- Wilderena initial schema
-- Conventions:
--   * `licensing_id` = the Jagex/Steam Dragonwilds licensing ID read by UE4SS Lua at runtime.
--   * `auth.users.id` = Supabase Auth user (created via email magic link on wilderena.com).
--   * One web account may link exactly one licensing_id (1:1, enforced by unique constraints).

------------------------------------------------------------
-- profiles: public-facing user data, 1:1 with auth.users
------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by anyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

------------------------------------------------------------
-- licensing_links: web account <-> Dragonwilds licensing ID
------------------------------------------------------------
create table public.licensing_links (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  licensing_id text not null unique,
  linked_at    timestamptz not null default now()
);

alter table public.licensing_links enable row level security;

create policy "users can read their own link"
  on public.licensing_links for select
  using (auth.uid() = user_id);

------------------------------------------------------------
-- pairing_codes: short-lived codes the in-game mod posts
-- and the website consumes to bind user_id -> licensing_id.
-- Server-side access only (service role).
------------------------------------------------------------
create table public.pairing_codes (
  code         text primary key,
  licensing_id text not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '10 minutes'),
  used_at      timestamptz
);

create index pairing_codes_licensing_id_idx on public.pairing_codes(licensing_id);
alter table public.pairing_codes enable row level security;
-- no policies = no client access; only service_role can read/write

------------------------------------------------------------
-- subscriptions: mirror of Stripe state, keyed by user
------------------------------------------------------------
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'
);

create table public.subscriptions (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id   text not null unique,
  stripe_subscription_id text unique,
  status               subscription_status not null,
  price_id             text,
  current_period_end   timestamptz,
  trial_end            timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "users can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

------------------------------------------------------------
-- seasons: quarterly windows for leaderboard resets
------------------------------------------------------------
create table public.seasons (
  id         serial primary key,
  name       text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  is_current boolean not null default false
);

create unique index only_one_current_season on public.seasons(is_current) where is_current = true;
alter table public.seasons enable row level security;
create policy "seasons are public" on public.seasons for select using (true);

------------------------------------------------------------
-- matches: one row per finished CTF match
------------------------------------------------------------
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  season_id    int references public.seasons(id),
  map          text,
  started_at   timestamptz not null,
  ended_at     timestamptz not null,
  winner_team  smallint check (winner_team in (0, 1)),
  red_score    smallint not null default 0,
  blue_score   smallint not null default 0
);

create index matches_season_id_idx on public.matches(season_id);
create index matches_ended_at_idx on public.matches(ended_at desc);
alter table public.matches enable row level security;
create policy "matches are public" on public.matches for select using (true);

------------------------------------------------------------
-- match_players: per-player results within a match
------------------------------------------------------------
create table public.match_players (
  id            bigserial primary key,
  match_id      uuid not null references public.matches(id) on delete cascade,
  licensing_id  text not null,
  display_name  text not null,
  class         text not null check (class in ('archer', 'assassin', 'guardian', 'berserker', 'fire_mage', 'air_mage')),
  team          smallint not null check (team in (0, 1)),
  kills         smallint not null default 0,
  deaths        smallint not null default 0,
  assists       smallint not null default 0,
  captures      smallint not null default 0,
  flag_returns  smallint not null default 0,
  damage_dealt  int not null default 0,
  is_mvp        boolean not null default false,
  result        smallint not null check (result in (-1, 0, 1)), -- -1 loss, 0 draw, 1 win
  -- MMR snapshot at time of insert. Computed by the ingest Edge Function using
  -- standard team Elo (K=32 under 30 matches, K=16 after) on team avg MMRs.
  -- The trigger below applies `mmr_delta` to player_stats.mmr.
  mmr_before    smallint not null default 1000,
  mmr_delta     smallint not null default 0
);

create index match_players_match_id_idx on public.match_players(match_id);
create index match_players_licensing_id_idx on public.match_players(licensing_id);
alter table public.match_players enable row level security;
create policy "match_players are public" on public.match_players for select using (true);

------------------------------------------------------------
-- player_stats: rolling per-season aggregates for fast leaderboard reads
-- Maintained by trigger on match_players insert.
------------------------------------------------------------
create table public.player_stats (
  licensing_id text not null,
  season_id    int not null references public.seasons(id),
  display_name text not null,
  matches      int not null default 0,
  wins         int not null default 0,
  losses       int not null default 0,
  draws        int not null default 0,
  kills        int not null default 0,
  deaths       int not null default 0,
  captures     int not null default 0,
  mmr          int not null default 1000,
  last_seen    timestamptz not null default now(),
  primary key (licensing_id, season_id)
);

create index player_stats_season_mmr_idx on public.player_stats(season_id, mmr desc);
alter table public.player_stats enable row level security;
create policy "player_stats are public" on public.player_stats for select using (true);

------------------------------------------------------------
-- aggregate trigger: on match_players insert, bump player_stats
------------------------------------------------------------
create or replace function public.bump_player_stats()
returns trigger language plpgsql as $$
declare
  v_season_id int;
begin
  select season_id into v_season_id from public.matches where id = new.match_id;
  if v_season_id is null then return new; end if;

  insert into public.player_stats (licensing_id, season_id, display_name, matches, wins, losses, draws, kills, deaths, captures, mmr, last_seen)
  values (
    new.licensing_id, v_season_id, new.display_name, 1,
    case when new.result =  1 then 1 else 0 end,
    case when new.result = -1 then 1 else 0 end,
    case when new.result =  0 then 1 else 0 end,
    new.kills, new.deaths, new.captures,
    greatest(0, new.mmr_before + new.mmr_delta),
    now()
  )
  on conflict (licensing_id, season_id) do update set
    display_name = excluded.display_name,
    matches      = player_stats.matches  + 1,
    wins         = player_stats.wins     + case when new.result =  1 then 1 else 0 end,
    losses       = player_stats.losses   + case when new.result = -1 then 1 else 0 end,
    draws        = player_stats.draws    + case when new.result =  0 then 1 else 0 end,
    kills        = player_stats.kills    + new.kills,
    deaths       = player_stats.deaths   + new.deaths,
    captures     = player_stats.captures + new.captures,
    mmr          = greatest(0, player_stats.mmr + new.mmr_delta),
    last_seen    = now();

  return new;
end $$;

create trigger match_players_after_insert
  after insert on public.match_players
  for each row execute function public.bump_player_stats();

------------------------------------------------------------
-- helper: is_subscribed(licensing_id) — used by game server on join
------------------------------------------------------------
create or replace function public.is_subscribed(p_licensing_id text)
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.licensing_links l
    join public.subscriptions s on s.user_id = l.user_id
    where l.licensing_id = p_licensing_id
      and s.status in ('trialing', 'active')
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;
