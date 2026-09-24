-- =============================================================================
-- RPVD Success V1 — Schéma Supabase (source de vérité : CONTRACT.md §2)
-- -----------------------------------------------------------------------------
-- Fichier IDEMPOTENT : ré-exécutable tel quel dans l'éditeur SQL Supabase
-- (create table if not exists, create or replace function, drop policy/trigger
-- if exists avant re-création).
--
-- Pré-requis Supabase : « Allow anonymous sign-ins » activé
-- (Authentication → Providers → Anonymous), car l'identité applicative est la
-- session anonyme : auth.uid() = public.users.id.
--
-- Principes de sécurité :
--   * Le client (rôle authenticated, session anonyme incluse) ne lit que sa
--     propre ligne users et ses propres submissions ; il n'écrit JAMAIS
--     directement dans les tables.
--   * Toute mutation sensible (crédits, codes, rate-limit) passe par des RPC
--     SECURITY DEFINER dont l'EXECUTE est réservé au service_role (Netlify
--     Functions avec la clé service).
--   * Les erreurs métier sont des RAISE EXCEPTION dont le MESSAGE est
--     exactement le code d'erreur du contrat (INVALID_CODE, CODE_USED,
--     CODE_EXPIRED, FINGERPRINT_MISMATCH, NO_CREDITS, NOT_FOUND, BAD_REQUEST,
--     UNAUTHORIZED). Le backend lit error.message pour choisir le statut HTTP.
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
-- pgcrypto fournit gen_random_bytes (aléa cryptographique pour les codes).
-- Supabase installe les extensions dans le schéma « extensions » ; si pgcrypto
-- existe déjà (ici ou ailleurs), IF NOT EXISTS n'émet qu'un NOTICE.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- users : profil applicatif, 1 ligne par compte auth (anonyme ou non), créée
-- automatiquement par le trigger on_auth_user_created. Les crédits, le plan et
-- l'empreinte ne sont modifiés que par les RPC service.
create table if not exists public.users (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text,
  credits               int not null default 0 check (credits >= 0),
  plan                  text not null default 'free' check (plan in ('free', 'trial', 'solo', 'trio', 'premium_solo', 'premium_trio')),
  plan_expires_at       timestamptz,
  device_fingerprint    text,
  fingerprint_locked_at timestamptz,
  preferred_notation    text,
  -- Quadri-langue : qc/fr = français (Québec/France), us/uk = anglais (US/UK), tons distincts.
  region                text not null default 'qc' check (region in ('qc', 'fr', 'us', 'uk')),
  -- Gamification (la flamme) : jours consécutifs avec au moins une analyse réussie.
  streak_days           int not null default 0 check (streak_days >= 0),
  last_analysis_date    date,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- activation_codes : codes TRIAL-XXXX (essai) et RPVD-XXXX-XXXX (premium),
-- stockés en MAJUSCULES. Un code consommé reste en base (is_used = true,
-- used_by, used_at) : c'est la « destruction » logique exigée, utile à l'audit.
create table if not exists public.activation_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  type              text not null check (type in ('trial', 'premium')),
  credits           int not null check (credits > 0),
  plan              text not null check (plan in ('trial', 'solo', 'trio', 'premium_solo', 'premium_trio')),
  email             text,
  batch_id          uuid,
  stripe_session_id text,
  is_used           boolean not null default false,
  used_by           uuid references public.users (id) on delete set null,
  used_at           timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz default now(),
  -- Nom de contrainte explicite : create_activation_codes distingue une
  -- collision de code (on regénère) d'une autre violation (propagée).
  constraint activation_codes_code_key unique (code)
);

-- Un achat Trio génère 3 codes qui PARTAGENT le même stripe_session_id (un code par
-- personne/appareil, contrat) — l'ancienne contrainte UNIQUE sur cette colonne n'autorisait
-- qu'un seul code par paiement et doit être retirée si elle existe encore (idempotence).
-- Élargi aux forfaits Premium (120/360 crédits, contrat pricing v2) : remplace l'ancienne
-- contrainte trial/solo/trio uniquement, y compris sur une base qui avait déjà ce schéma.
alter table public.activation_codes drop constraint if exists activation_codes_plan_check;
alter table public.activation_codes add constraint activation_codes_plan_check
  check (plan in ('trial', 'solo', 'trio', 'premium_solo', 'premium_trio'));

alter table public.activation_codes drop constraint if exists activation_codes_stripe_session_id_key;
create index if not exists activation_codes_stripe_session_id_idx
  on public.activation_codes (stripe_session_id);

-- Idempotence : si la table existait déjà avec l'ancienne contrainte RESTRICT
-- implicite sur used_by, on la remplace par ON DELETE SET NULL (permet de
-- supprimer un auth.users même après activation d'un code par ce compte).
alter table public.activation_codes drop constraint if exists activation_codes_used_by_fkey;
alter table public.activation_codes add constraint activation_codes_used_by_fkey
  foreign key (used_by) references public.users (id) on delete set null;

-- submissions : une analyse par exercice soumis. L'image n'est jamais stockée,
-- seulement l'analyse (vie privée). is_saved = présent dans la bibliothèque.
create table if not exists public.submissions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users (id) on delete cascade,
  problem_type     text,
  subject          text check (subject is null or subject in ('math', 'chimie', 'physique', 'sciences', 'francais', 'anglais', 'autre')),
  topic_name       text,
  is_saved         boolean not null default false,
  level_1_response text,
  level_2_response text,
  level_3_response jsonb,
  analysis         jsonb,
  region           text,
  created_at       timestamptz default now()
);

-- rate_limits : compteur par clé logique (activate:ip:<hash>, gemini:user:<uid>…)
-- sur une fenêtre glissante réinitialisée par check_rate_limit.
create table if not exists public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
);

-- trial_requests : un seul lot d'essai par courriel (PK), courriel en minuscules.
create table if not exists public.trial_requests (
  email      text primary key check (email = lower(trim(email))),
  ip_hash    text,
  batch_id   uuid,
  created_at timestamptz default now()
);

-- security_events : journal d'audit (ex. kind = 'fingerprint_mismatch').
create table if not exists public.security_events (
  id         bigserial primary key,
  user_id    uuid,
  kind       text not null,
  details    jsonb,
  created_at timestamptz default now()
);


-- =============================================================================
-- 2bis. IDEMPOTENCE ADDITIVE (tables déjà existantes avant ce schéma)
-- =============================================================================
-- « create table if not exists » ne touche pas une table déjà présente : si ce
-- projet Supabase avait déjà `users` / `submissions` (versions antérieures du
-- produit, avant ce schéma), les colonnes manquantes doivent être ajoutées ici.
-- Sans danger sur une base neuve : chaque colonne existe déjà, `add column if
-- not exists` ne fait rien.
alter table public.users
  add column if not exists email                 text,
  add column if not exists credits                int not null default 0,
  add column if not exists plan                   text not null default 'free',
  add column if not exists plan_expires_at        timestamptz,
  add column if not exists device_fingerprint     text,
  add column if not exists fingerprint_locked_at  timestamptz,
  add column if not exists preferred_notation     text,
  add column if not exists region                 text not null default 'qc',
  add column if not exists streak_days             int not null default 0,
  add column if not exists last_analysis_date      date,
  add column if not exists created_at             timestamptz default now(),
  add column if not exists updated_at             timestamptz default now(),
  -- Abonnement Stripe récurrent (contrat pricing v3, Basic/Pro) : identifie le client/l'abonnement
  -- pour router les webhooks de renouvellement (invoice.paid) vers le bon compte, et permettre au
  -- Customer Portal Stripe de gérer/annuler l'abonnement depuis l'app.
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

alter table public.users drop constraint if exists users_stripe_subscription_id_key;
alter table public.users add constraint users_stripe_subscription_id_key unique (stripe_subscription_id);

-- Contraintes check ajoutées séparément (« add column ... check » ne supporte
-- pas IF NOT EXISTS) : on les recrée à chaque exécution.
alter table public.users drop constraint if exists users_credits_check;
alter table public.users add constraint users_credits_check check (credits >= 0);
alter table public.users drop constraint if exists users_plan_check;
alter table public.users add constraint users_plan_check
  check (plan in ('free', 'trial', 'solo', 'trio', 'premium_solo', 'premium_trio', 'basic', 'pro'));
-- Élargi à us/uk (quadri-langue) : remplace l'ancienne contrainte qc/fr uniquement,
-- y compris sur une base qui avait déjà ce schéma avant l'ajout des 2 locales anglaises.
alter table public.users drop constraint if exists users_region_check;
alter table public.users add constraint users_region_check check (region in ('qc', 'fr', 'us', 'uk'));
alter table public.users drop constraint if exists users_streak_days_check;
alter table public.users add constraint users_streak_days_check check (streak_days >= 0);

alter table public.submissions
  add column if not exists problem_type     text,
  add column if not exists subject          text,
  add column if not exists topic_name       text,
  add column if not exists is_saved         boolean not null default false,
  add column if not exists level_1_response text,
  add column if not exists level_2_response text,
  add column if not exists level_3_response jsonb,
  add column if not exists analysis         jsonb,
  add column if not exists region           text,
  add column if not exists created_at       timestamptz default now();

alter table public.submissions drop constraint if exists submissions_subject_check;
alter table public.submissions add constraint submissions_subject_check
  check (subject is null or subject in ('math', 'chimie', 'physique', 'sciences', 'francais', 'anglais', 'autre'));

-- Si `level_3_response` pré-existait en `text` (ancienne version qui y stockait
-- du JSON.stringify), on la convertit en jsonb sans perte ; no-op si déjà jsonb.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'submissions' and column_name = 'level_3_response')
     = 'text' then
    alter table public.submissions
      alter column level_3_response type jsonb
      using case
        when level_3_response is null or trim(level_3_response) = '' then null
        else level_3_response::jsonb
      end;
  end if;
end $$;


-- =============================================================================
-- 3. INDEX
-- =============================================================================
-- Bibliothèque : « mes submissions sauvegardées, les plus récentes d'abord ».
create index if not exists submissions_user_saved_created_idx
  on public.submissions (user_id, is_saved, created_at desc);


-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- updated_at automatique sur users (toute mise à jour de ligne).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Création automatique de la ligne public.users à chaque nouveau compte auth
-- (session anonyme incluse). SECURITY DEFINER : le trigger tourne dans le
-- contexte du service d'auth, qui n'a pas de droits sur public.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================
-- RLS activée partout. Sans policy = deny all pour anon/authenticated ;
-- le service_role contourne la RLS (Netlify Functions).
alter table public.users            enable row level security;
alter table public.activation_codes enable row level security;
alter table public.submissions      enable row level security;
alter table public.rate_limits      enable row level security;
alter table public.trial_requests   enable row level security;
alter table public.security_events  enable row level security;

-- users : lecture de sa propre ligne uniquement.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (auth.uid() = id);

-- submissions : lecture de ses propres analyses uniquement (fetchLibrary).
drop policy if exists submissions_select_own on public.submissions;
create policy submissions_select_own on public.submissions
  for select to authenticated
  using (auth.uid() = user_id);

-- Défense en profondeur (en plus de la RLS) : aucun privilège d'écriture pour
-- anon/authenticated sur users/submissions, aucun privilège du tout sur les
-- tables réservées au service. Les privilèges du service_role sont inchangés.
revoke all on table public.users, public.submissions from anon, authenticated;
grant select on table public.users, public.submissions to authenticated;
revoke all on table public.activation_codes, public.rate_limits,
                    public.trial_requests, public.security_events
  from anon, authenticated;


-- =============================================================================
-- 6. RPC SERVICE-ONLY (SECURITY DEFINER, exécutables par service_role seul)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- activate_code : consomme un code d'activation et crédite le compte.
-- Atomique : FOR UPDATE sur le code PUIS sur l'utilisateur (ordre stable dans
-- toutes les RPC → pas de deadlock). Verrouille l'empreinte à la 1re activation.
-- Erreurs : BAD_REQUEST, INVALID_CODE, CODE_USED, CODE_EXPIRED, UNAUTHORIZED,
-- FINGERPRINT_MISMATCH.
-- -----------------------------------------------------------------------------
create or replace function public.activate_code(p_user_id uuid, p_code text, p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Insensible à la casse et aux espaces (upper + suppression des blancs).
  v_normalized text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  v_code       public.activation_codes%rowtype;
  v_user       public.users%rowtype;
  v_plan       text;
  v_credits    int;
begin
  if p_user_id is null or p_fingerprint is null or p_fingerprint = '' then
    raise exception 'BAD_REQUEST';
  end if;

  -- 1) Verrou sur le code (toujours AVANT l'utilisateur).
  select * into v_code
    from public.activation_codes
   where code = v_normalized
     for update;

  if not found then
    raise exception 'INVALID_CODE';
  end if;
  if v_code.is_used then
    raise exception 'CODE_USED';
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'CODE_EXPIRED';
  end if;

  -- 2) Verrou sur l'utilisateur.
  select * into v_user
    from public.users
   where id = p_user_id
     for update;

  if not found then
    raise exception 'UNAUTHORIZED';
  end if;

  -- 3) Empreinte : null → verrouillée maintenant ; différente → refus.
  if v_user.device_fingerprint is not null and v_user.device_fingerprint <> p_fingerprint then
    raise exception 'FINGERPRINT_MISMATCH';
  end if;

  -- 4) Plan résultant : un code premium impose son plan ; un code d'essai
  --    passe en 'trial' sans jamais rétrograder un plan payant.
  if v_code.type = 'premium' then
    v_plan := v_code.plan;
  elsif v_user.plan in ('free', 'trial') then
    v_plan := 'trial';
  else
    v_plan := v_user.plan;
  end if;

  -- 5) Consommation du code + crédit du compte, dans la même transaction.
  update public.activation_codes
     set is_used = true,
         used_by = p_user_id,
         used_at = now()
   where id = v_code.id;

  update public.users
     set credits               = credits + v_code.credits,
         plan                  = v_plan,
         plan_expires_at       = case when v_code.type = 'premium'
                                      then now() + interval '90 days'
                                      else plan_expires_at end,
         device_fingerprint    = coalesce(device_fingerprint, p_fingerprint),
         fingerprint_locked_at = coalesce(fingerprint_locked_at, now()),
         -- Rattache le courriel du parent au compte anonyme s'il n'en a pas.
         email                 = coalesce(email, v_code.email)
   where id = p_user_id
   returning credits into v_credits;

  return jsonb_build_object('credits', v_credits, 'plan', v_plan, 'email', v_code.email);
end;
$$;

-- -----------------------------------------------------------------------------
-- consume_credit : décrémente 1 crédit avant l'appel Gemini.
-- Ordre imposé : NO_CREDITS d'abord, FINGERPRINT_MISMATCH ensuite.
-- NOTE : un RAISE annule la transaction, donc un INSERT security_events fait
-- ici ne serait jamais persisté (PostgreSQL n'a pas de transaction autonome).
-- analyze-homework.js doit écrire lui-même la ligne security_events
-- (kind = 'fingerprint_mismatch') avec le client service après avoir attrapé
-- cette exception.
-- -----------------------------------------------------------------------------
create or replace function public.consume_credit(p_user_id uuid, p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user      public.users%rowtype;
  v_remaining int;
begin
  select * into v_user
    from public.users
   where id = p_user_id
     for update;

  if not found then
    raise exception 'UNAUTHORIZED';
  end if;

  if v_user.credits <= 0 then
    raise exception 'NO_CREDITS';
  end if;

  if v_user.device_fingerprint is not null
     and (p_fingerprint is null or v_user.device_fingerprint <> p_fingerprint) then
    raise exception 'FINGERPRINT_MISMATCH';
  end if;

  update public.users
     set credits = credits - 1
   where id = p_user_id
   returning credits into v_remaining;

  return jsonb_build_object('credits_remaining', v_remaining);
end;
$$;

-- -----------------------------------------------------------------------------
-- refund_credit : rend 1 crédit si Gemini échoue après consume_credit.
-- -----------------------------------------------------------------------------
create or replace function public.refund_credit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set credits = credits + 1
   where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- bump_streak : gamification (la flamme, contrat §6). Appelée après CHAQUE analyse
-- réussie (pas sur OCR_FAIL/AI_ERROR) : incrémente si la dernière analyse datait
-- d'hier, ne change rien si c'est déjà aujourd'hui, remet à 1 sinon (jour manqué).
-- Retourne le nouveau compteur pour que le frontend affiche la flamme sans un
-- second aller-retour.
-- -----------------------------------------------------------------------------
create or replace function public.bump_streak(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last    date;
  v_streak  int;
  v_today   date := current_date;
begin
  select last_analysis_date, streak_days
    into v_last, v_streak
    from public.users
   where id = p_user_id
     for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_last = v_today then
    -- Déjà comptée aujourd'hui (plusieurs analyses dans la même journée) : inchangé.
    null;
  elsif v_last = v_today - 1 then
    v_streak := coalesce(v_streak, 0) + 1;
  else
    -- Jour manqué (ou toute première analyse) : la flamme repart à 1.
    v_streak := 1;
  end if;

  update public.users
     set streak_days        = v_streak,
         last_analysis_date = v_today
   where id = p_user_id;

  return jsonb_build_object('streak_days', v_streak);
end;
$$;

-- -----------------------------------------------------------------------------
-- check_rate_limit : true = autorisé. Upsert atomique : la fenêtre expirée est
-- réinitialisée (count = 1), sinon count + 1 ; on compare ensuite au plafond.
-- -----------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
     set count = case
                   when rl.window_start + (p_window_seconds * interval '1 second') < now() then 1
                   else rl.count + 1
                 end,
         window_start = case
                   when rl.window_start + (p_window_seconds * interval '1 second') < now() then now()
                   else rl.window_start
                 end
  returning rl.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- -----------------------------------------------------------------------------
-- create_activation_codes : génère p_count codes en SQL et les insère.
--   * type 'trial'   → TRIAL-XXXX ; type 'premium' → RPVD-XXXX-XXXX
--   * alphabet sans ambiguïté (32 symboles → un octet % 32 est uniforme)
--   * collision de code (unique_violation sur activation_codes_code_key) →
--     on regénère ; toute autre violation est propagée
--   * idempotence webhook : p_stripe_session_id déjà présent → ARRAY[]::text[]
-- search_path inclut « extensions » pour résoudre gen_random_bytes (pgcrypto).
-- -----------------------------------------------------------------------------
create or replace function public.create_activation_codes(
  p_type              text,
  p_plan              text,
  p_credits           int,
  p_count             int,
  p_email             text,
  p_batch_id          uuid,
  p_stripe_session_id text,
  p_expires_at        timestamptz
)
returns text[]
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  c_alphabet   constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c_max_tries  constant int  := 25;
  v_codes      text[] := array[]::text[];
  v_code       text;
  v_bytes      bytea;
  v_chunk1     text;
  v_chunk2     text;
  v_tries      int;
  v_constraint text;
  v_n          int;
  v_i          int;
begin
  if p_type is null or p_type not in ('trial', 'premium') then
    raise exception 'BAD_REQUEST';
  end if;
  if p_plan is null or p_plan not in ('trial', 'solo', 'trio') then
    raise exception 'BAD_REQUEST';
  end if;
  if p_credits is null or p_credits <= 0 or p_count is null or p_count <= 0 then
    raise exception 'BAD_REQUEST';
  end if;

  -- Verrou transactionnel par session Stripe : sans lui, deux livraisons concurrentes du
  -- même webhook (Stripe retente parfois) pourraient toutes deux passer le test d'idempotence
  -- ci-dessous avant qu'aucune n'ait inséré de ligne, et générer chacune leurs 3 codes en double.
  -- Relâché automatiquement à la fin de la transaction appelante.
  if p_stripe_session_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_stripe_session_id, 0));
  end if;

  -- Idempotence webhook Stripe : session déjà traitée → rien à faire.
  if p_stripe_session_id is not null and exists (
       select 1 from public.activation_codes where stripe_session_id = p_stripe_session_id
     ) then
    return array[]::text[];
  end if;

  for v_n in 1..p_count loop
    v_tries := 0;
    loop
      v_tries := v_tries + 1;
      if v_tries > c_max_tries then
        raise exception 'CODE_GENERATION_FAILED';
      end if;

      -- 8 octets aléatoires → 2 blocs de 4 symboles.
      v_bytes  := gen_random_bytes(8);
      v_chunk1 := '';
      v_chunk2 := '';
      for v_i in 0..3 loop
        v_chunk1 := v_chunk1 || substr(c_alphabet, (get_byte(v_bytes, v_i) % 32) + 1, 1);
        v_chunk2 := v_chunk2 || substr(c_alphabet, (get_byte(v_bytes, v_i + 4) % 32) + 1, 1);
      end loop;

      v_code := case when p_type = 'trial'
                     then 'TRIAL-' || v_chunk1
                     else 'RPVD-' || v_chunk1 || '-' || v_chunk2
                end;

      begin
        insert into public.activation_codes
          (code, type, credits, plan, email, batch_id, stripe_session_id, expires_at)
        values
          (v_code, p_type, p_credits, p_plan, lower(nullif(trim(coalesce(p_email, '')), '')),
           p_batch_id, p_stripe_session_id, p_expires_at);
        v_codes := v_codes || v_code;
        exit; -- code inséré → bloc suivant
      exception when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint <> 'activation_codes_code_key' then
          raise; -- collision stripe_session_id (ou autre) : on propage
        end if;
        -- collision de code : on boucle et on regénère
      end;
    end loop;
  end loop;

  return v_codes;
end;
$$;

-- Droits : révoqués pour tout le monde sauf service_role.
revoke execute on function public.activate_code(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.activate_code(uuid, text, text) to service_role;

revoke execute on function public.consume_credit(uuid, text) from public, anon, authenticated;
grant  execute on function public.consume_credit(uuid, text) to service_role;

revoke execute on function public.refund_credit(uuid) from public, anon, authenticated;
grant  execute on function public.refund_credit(uuid) to service_role;

revoke execute on function public.bump_streak(uuid) from public, anon, authenticated;
grant  execute on function public.bump_streak(uuid) to service_role;

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant  execute on function public.check_rate_limit(text, int, int) to service_role;

revoke execute on function public.create_activation_codes(text, text, int, int, text, uuid, text, timestamptz)
  from public, anon, authenticated;
grant  execute on function public.create_activation_codes(text, text, int, int, text, uuid, text, timestamptz)
  to service_role;

-- Mise à niveau Base (solo/trio) → Premium (contrat pricing v2) : la différence de prix a déjà
-- été facturée par Stripe côté function (webhook), cette RPC applique juste le nouveau total de
-- crédits + le nouveau plan sur le compte, sans générer de code (même appareil, pas de nouvelle
-- activation à saisir). Idempotente par stripe_session_id comme create_activation_codes ci-dessus.
create or replace function public.apply_premium_upgrade(
  p_user_id           uuid,
  p_plan              text,
  p_credits           int,
  p_stripe_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  if p_plan is null or p_plan not in ('premium_solo', 'premium_trio') then
    raise exception 'BAD_REQUEST';
  end if;
  if p_credits is null or p_credits <= 0 or p_user_id is null then
    raise exception 'BAD_REQUEST';
  end if;

  if p_stripe_session_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(p_stripe_session_id, 0));
    if exists (select 1 from public.activation_codes where stripe_session_id = p_stripe_session_id) then
      return false; -- session déjà traitée (retry webhook Stripe)
    end if;
  end if;

  update public.users
     set credits         = p_credits,
         plan             = p_plan,
         plan_expires_at  = now() + interval '90 days'
   where id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  -- Trace d'audit dans la même table que les codes (déjà "utilisée" : aucune saisie requise).
  v_code := 'UPGRADE-' || upper(substr(p_user_id::text, 1, 8)) || '-' || to_char(now(), 'HH24MISSMS');
  insert into public.activation_codes
    (code, type, credits, plan, email, batch_id, stripe_session_id, is_used, used_by, used_at, expires_at)
  values
    (v_code, 'premium', p_credits, p_plan, null, null, p_stripe_session_id, true, p_user_id, now(), null);

  return true;
end;
$$;

revoke execute on function public.apply_premium_upgrade(uuid, text, int, text) from public, anon, authenticated;
grant  execute on function public.apply_premium_upgrade(uuid, text, int, text) to service_role;


-- =============================================================================
-- 7. RPC CLIENT (exécutables par authenticated, gardées par auth.uid())
-- =============================================================================
-- SECURITY DEFINER car il n'existe aucune policy UPDATE : la garde
-- « user_id = auth.uid() » est faite dans la fonction, et 0 ligne → NOT_FOUND.

-- -----------------------------------------------------------------------------
-- save_submission : ajoute une analyse à la bibliothèque (matière + sujet).
-- -----------------------------------------------------------------------------
create or replace function public.save_submission(p_submission_id uuid, p_subject text, p_topic_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic text := nullif(trim(coalesce(p_topic_name, '')), '');
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_subject is not null
     and p_subject not in ('math', 'chimie', 'physique', 'sciences', 'francais', 'anglais', 'autre') then
    raise exception 'BAD_REQUEST';
  end if;
  if v_topic is null then
    raise exception 'BAD_REQUEST';
  end if;

  update public.submissions
     set is_saved   = true,
         subject    = p_subject,
         topic_name = v_topic
   where id = p_submission_id
     and user_id = auth.uid();

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- unsave_submission : retire une analyse de la bibliothèque (même garde).
-- -----------------------------------------------------------------------------
create or replace function public.unsave_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  update public.submissions
     set is_saved = false
   where id = p_submission_id
     and user_id = auth.uid();

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- set_preferences : notation préférée (≤ 300 caractères, vide → null) + région.
-- -----------------------------------------------------------------------------
create or replace function public.set_preferences(p_preferred_notation text, p_region text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notation text := nullif(trim(coalesce(p_preferred_notation, '')), '');
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;
  if p_region is null or p_region not in ('qc', 'fr', 'us', 'uk') then
    raise exception 'BAD_REQUEST';
  end if;
  if length(v_notation) > 300 then
    raise exception 'BAD_REQUEST';
  end if;

  update public.users
     set preferred_notation = v_notation,
         region             = p_region
   where id = auth.uid();

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- get_my_profile : profil de l'appelant, sans l'empreinte complète
-- (has_fingerprint boolean). Auto-réparation : si la ligne users manque
-- (compte auth créé avant l'installation du trigger), elle est créée à vide.
-- -----------------------------------------------------------------------------
create or replace function public.get_my_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile jsonb;
begin
  if v_uid is null then
    raise exception 'UNAUTHORIZED';
  end if;

  insert into public.users (id)
  values (v_uid)
  on conflict (id) do nothing;

  select jsonb_build_object(
           'id',                 u.id,
           'email',              u.email,
           'credits',            u.credits,
           'plan',               u.plan,
           'plan_expires_at',    u.plan_expires_at,
           'has_fingerprint',    (u.device_fingerprint is not null),
           'preferred_notation', u.preferred_notation,
           'region',             u.region,
           'streak_days',        u.streak_days,
           'created_at',         u.created_at
         )
    into v_profile
    from public.users u
   where u.id = v_uid;

  if v_profile is null then
    raise exception 'NOT_FOUND';
  end if;

  return v_profile;
end;
$$;

-- Droits : authenticated (et service_role) ; jamais anon ni PUBLIC.
revoke execute on function public.save_submission(uuid, text, text) from public, anon;
grant  execute on function public.save_submission(uuid, text, text) to authenticated, service_role;

revoke execute on function public.unsave_submission(uuid) from public, anon;
grant  execute on function public.unsave_submission(uuid) to authenticated, service_role;

revoke execute on function public.set_preferences(text, text) from public, anon;
grant  execute on function public.set_preferences(text, text) to authenticated, service_role;

revoke execute on function public.get_my_profile() from public, anon;
grant  execute on function public.get_my_profile() to authenticated, service_role;

-- Force PostgREST à recharger son cache de schéma (nouvelles RPC visibles
-- immédiatement via supabase.rpc()).
notify pgrst, 'reload schema';


-- =============================================================================
-- TESTS RAPIDES (à exécuter une requête à la fois dans l'éditeur SQL ; le
-- fichier reste ré-exécutable car ce bloc est entièrement commenté).
-- Remplacer <uid> par un id présent dans auth.users (ex. une session anonyme :
--   select id from auth.users order by created_at desc limit 1;)
-- =============================================================================
--
-- 1) Lot d'essai : 3 codes TRIAL-XXXX à 3 crédits, valables 30 jours.
-- select public.create_activation_codes(
--   'trial', 'trial', 3, 3, 'parent@example.com', gen_random_uuid(), null, now() + interval '30 days'
-- );
--
-- 2) Activation (empreinte hex64 factice, code en minuscules pour tester la
--    normalisation) → {"credits":3,"plan":"trial","email":"parent@example.com"}.
--    Rejouer la même requête → CODE_USED ; un code inconnu → INVALID_CODE.
-- select public.activate_code('<uid>', 'trial-xxxx', repeat('a', 64));
--
-- 3) Consommation → {"credits_remaining":2}. Avec repeat('b', 64) →
--    FINGERPRINT_MISMATCH ; une fois à 0 crédit → NO_CREDITS.
-- select public.consume_credit('<uid>', repeat('a', 64));
--
-- 4) Rate limit 3/60 s : les 3 premiers appels → true, le 4e → false,
--    puis true à nouveau après 60 s (fenêtre réinitialisée).
-- select public.check_rate_limit('activate:ip:test', 3, 60);
--
-- 5) Profil côté client : simulation d'un JWT authenticated dans une
--    transaction annulée (has_fingerprint = true après le test 2).
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims to '{"sub":"<uid>","role":"authenticated"}';
--   select public.get_my_profile();
-- rollback;
--
-- Bonus) Idempotence webhook : le 1er appel renvoie 1 code RPVD-XXXX-XXXX,
--    le 2e appel avec le même stripe_session_id renvoie {} (tableau vide).
-- select public.create_activation_codes(
--   'premium', 'solo', 50, 1, 'parent@example.com', null, 'cs_test_123', now() + interval '365 days'
-- );


-- =============================================================================
-- 9. FONCTIONNALITÉS PHASE 1 (RPVD_FEATURES_PROMPT.md) — clones, indice, piège,
--    traduction de consigne, simulation chronométrée, veille d'exam, tentative.
-- =============================================================================

-- Clones générés pour une soumission (contexte de pratique, jamais la photo originale) et
-- métriques Gemini de l'analyse elle-même (coût/latence, contrat "logue chaque appel").
alter table public.submissions
  add column if not exists clones         jsonb,
  add column if not exists gemini_metrics jsonb;

-- Historique des tentatives de l'élève sur un clone (texte/photo, correct ou non) — sert de
-- base à la simulation chronométrée et au suivi de progression.
create table if not exists public.clone_attempts (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions (id) on delete cascade,
  clone_number   int not null,
  user_answer    text,
  is_correct     boolean,
  created_at     timestamptz default now()
);
create index if not exists clone_attempts_submission_idx on public.clone_attempts (submission_id);

alter table public.clone_attempts enable row level security;
-- Pas de policy select/insert directe pour authenticated : tout passe par les Netlify
-- Functions (service_role), comme submissions/activation_codes — cohérent avec le reste du schéma.
revoke all on table public.clone_attempts from anon, authenticated;

-- Une session de simulation chronométrée : N clones tirés d'une soumission, score final.
create table if not exists public.simulations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users (id) on delete cascade,
  submission_id      uuid not null references public.submissions (id) on delete cascade,
  clone_numbers      int[] not null,
  time_limit_seconds int not null check (time_limit_seconds > 0),
  time_spent_seconds int,
  correct_count      int not null default 0,
  total_count        int not null check (total_count > 0),
  score_percent      int,
  finished_at        timestamptz,
  created_at         timestamptz default now()
);
create index if not exists simulations_user_idx on public.simulations (user_id);

alter table public.simulations enable row level security;
-- Lecture directe autorisée (historique de simulations dans un futur écran de progression) ;
-- écriture réservée au service_role (Netlify Functions), comme le reste du schéma.
drop policy if exists simulations_select_own on public.simulations;
create policy simulations_select_own on public.simulations
  for select to authenticated
  using (auth.uid() = user_id);
revoke all on table public.simulations from anon, authenticated;
grant select on table public.simulations to authenticated;

-- -----------------------------------------------------------------------------
-- start_simulation : crée une session de simulation à partir des clones déjà
-- générés pour une soumission (ne génère rien elle-même — generate-clone le fait).
-- -----------------------------------------------------------------------------
create or replace function public.start_simulation(
  p_user_id       uuid,
  p_submission_id uuid,
  p_clone_numbers int[],
  p_seconds_per_clone int default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_simulation public.simulations%rowtype;
begin
  if p_clone_numbers is null or array_length(p_clone_numbers, 1) is null or array_length(p_clone_numbers, 1) < 1 then
    raise exception 'BAD_REQUEST';
  end if;

  if not exists (
    select 1 from public.submissions where id = p_submission_id and user_id = p_user_id
  ) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.simulations
    (user_id, submission_id, clone_numbers, time_limit_seconds, total_count)
  values
    (p_user_id, p_submission_id, p_clone_numbers,
     array_length(p_clone_numbers, 1) * p_seconds_per_clone, array_length(p_clone_numbers, 1))
  returning * into v_simulation;

  return jsonb_build_object(
    'id', v_simulation.id,
    'time_limit_seconds', v_simulation.time_limit_seconds,
    'total_count', v_simulation.total_count
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- finish_simulation : enregistre le résultat final (garde propriétaire via p_user_id,
-- une simulation déjà terminée ne peut pas être réécrite).
-- -----------------------------------------------------------------------------
create or replace function public.finish_simulation(
  p_user_id            uuid,
  p_simulation_id      uuid,
  p_correct_count      int,
  p_time_spent_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.simulations%rowtype;
begin
  select * into v_row
    from public.simulations
   where id = p_simulation_id and user_id = p_user_id
     for update;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  if v_row.finished_at is not null then
    raise exception 'BAD_REQUEST';
  end if;

  update public.simulations
     set correct_count      = greatest(least(p_correct_count, v_row.total_count), 0),
         time_spent_seconds = greatest(p_time_spent_seconds, 0),
         score_percent      = round(greatest(least(p_correct_count, v_row.total_count), 0) * 100.0 / v_row.total_count),
         finished_at        = now()
   where id = p_simulation_id
   returning * into v_row;

  return jsonb_build_object(
    'correct_count', v_row.correct_count,
    'total_count', v_row.total_count,
    'score_percent', v_row.score_percent,
    'time_spent_seconds', v_row.time_spent_seconds
  );
end;
$$;

revoke execute on function public.start_simulation(uuid, uuid, int[], int) from public, anon, authenticated;
grant  execute on function public.start_simulation(uuid, uuid, int[], int) to service_role;
revoke execute on function public.finish_simulation(uuid, uuid, int, int) from public, anon, authenticated;
grant  execute on function public.finish_simulation(uuid, uuid, int, int) to service_role;


-- =============================================================================
-- 10. ABONNEMENTS RÉCURRENTS STRIPE (contrat pricing v3 — Basic/Pro, remplace les forfaits
--     à paiement unique Solo/Trio/Premium ; ces derniers restent lisibles pour l'historique et
--     les codes déjà émis, mais ne sont plus vendus).
-- =============================================================================

-- Déduplication générique des événements Stripe (checkout.session.completed en mode
-- subscription, invoice.paid, customer.subscription.deleted) : Stripe peut renvoyer le même
-- événement plusieurs fois (retry réseau) — un seul traitement par stripe_event_id.
create table if not exists public.processed_stripe_events (
  stripe_event_id text primary key,
  kind            text not null,
  created_at      timestamptz default now()
);
alter table public.processed_stripe_events enable row level security;
revoke all on table public.processed_stripe_events from anon, authenticated;

-- -----------------------------------------------------------------------------
-- activate_subscription : première activation d'un abonnement Basic/Pro (checkout.session.
-- completed, mode=subscription). Idempotente par stripe_event_id (webhook Stripe peut réessayer).
-- -----------------------------------------------------------------------------
create or replace function public.activate_subscription(
  p_stripe_event_id      text,
  p_user_id              uuid,
  p_plan                 text,
  p_credits              int,
  p_stripe_customer_id   text,
  p_stripe_subscription_id text,
  p_plan_expires_at      timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_plan is null or p_plan not in ('basic', 'pro') then
    raise exception 'BAD_REQUEST';
  end if;
  if p_credits is null or p_credits <= 0 or p_user_id is null then
    raise exception 'BAD_REQUEST';
  end if;

  insert into public.processed_stripe_events (stripe_event_id, kind)
  values (p_stripe_event_id, 'activate_subscription')
  on conflict (stripe_event_id) do nothing;
  if not found then
    return false; -- déjà traité
  end if;

  update public.users
     set credits                = p_credits,
         plan                   = p_plan,
         plan_expires_at        = p_plan_expires_at,
         stripe_customer_id     = p_stripe_customer_id,
         stripe_subscription_id = p_stripe_subscription_id
   where id = p_user_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- renew_subscription_credits : renouvellement automatique (invoice.paid, billing_reason =
-- subscription_cycle) — retrouve le compte par stripe_subscription_id (pas par user_id, le
-- webhook ne connaît que l'abonnement Stripe à ce stade), remet les crédits au plein montant du
-- plan et prolonge la validité de 3 mois. Idempotente par stripe_event_id.
-- -----------------------------------------------------------------------------
create or replace function public.renew_subscription_credits(
  p_stripe_event_id        text,
  p_stripe_subscription_id text,
  p_credits                int,
  p_plan_expires_at        timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_stripe_subscription_id is null or p_credits is null or p_credits <= 0 then
    raise exception 'BAD_REQUEST';
  end if;

  insert into public.processed_stripe_events (stripe_event_id, kind)
  values (p_stripe_event_id, 'renew_subscription_credits')
  on conflict (stripe_event_id) do nothing;
  if not found then
    return false;
  end if;

  update public.users
     set credits         = p_credits,
         plan_expires_at = p_plan_expires_at
   where stripe_subscription_id = p_stripe_subscription_id;

  if not found then
    -- Abonnement inconnu (ex: créé hors app) : rien à renouveler côté RPVD, pas une erreur bloquante.
    return false;
  end if;

  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- cancel_subscription : l'abonnement Stripe est résilié (customer.subscription.deleted) — on
-- détache juste l'ID d'abonnement pour qu'un futur événement Stripe égaré ne touche plus ce
-- compte ; les crédits déjà crédités restent utilisables jusqu'à leur épuisement naturel (pas de
-- reprise rétroactive, contrat honnêteté commerciale).
-- -----------------------------------------------------------------------------
create or replace function public.cancel_subscription(
  p_stripe_event_id        text,
  p_stripe_subscription_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.processed_stripe_events (stripe_event_id, kind)
  values (p_stripe_event_id, 'cancel_subscription')
  on conflict (stripe_event_id) do nothing;
  if not found then
    return false;
  end if;

  update public.users
     set stripe_subscription_id = null
   where stripe_subscription_id = p_stripe_subscription_id;

  return true;
end;
$$;

revoke execute on function public.activate_subscription(text, uuid, text, int, text, text, timestamptz) from public, anon, authenticated;
grant  execute on function public.activate_subscription(text, uuid, text, int, text, text, timestamptz) to service_role;
revoke execute on function public.renew_subscription_credits(text, text, int, timestamptz) from public, anon, authenticated;
grant  execute on function public.renew_subscription_credits(text, text, int, timestamptz) to service_role;
revoke execute on function public.cancel_subscription(text, text) from public, anon, authenticated;
grant  execute on function public.cancel_subscription(text, text) to service_role;
