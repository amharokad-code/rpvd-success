-- Bêta fermée : à coller dans Supabase > SQL Editor (idempotent). Même contenu que la fin de supabase_schema.sql.


-- =============================================================================
-- BÊTA FERMÉE 48 h (+24 h de grâce pour voter) : codes, feedback, votes, observation d'empreinte.
-- Idempotent : à coller dans Supabase > SQL Editor. (Nommée « beta » pour ne pas se mêler au
-- Bootcamp Zoom, qui a déjà sa table bootcamp_votes basée sur le courriel.)
-- =============================================================================
alter table public.users add column if not exists is_beta boolean not null default false;
alter table public.users add column if not exists beta_started_at timestamptz;

-- Les codes de bêta sont des codes d'essai (type 'trial', plan 'trial') marqués kind = 'beta'.
alter table public.activation_codes add column if not exists kind text not null default 'standard';
-- (activation_codes.expires_at existe déjà : date limite pour ACTIVER le code.)

create table if not exists public.beta_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  poll_key text not null,
  choices jsonb not null,
  autre text check (autre is null or char_length(autre) <= 40),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, poll_key)
);
create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null,
  niveau_debloquant text check (niveau_debloquant is null or niveau_debloquant in ('1','2','3','aucun')),
  refaire_seul text check (refaire_seul is null or refaire_seul in ('oui','presque','non')),
  commentaire text check (commentaire is null or char_length(commentaire) <= 140),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, submission_id)
);
create table if not exists public.fingerprint_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fp_hash text not null,
  created_at timestamptz default now()
);
create index if not exists fingerprint_events_user_idx on public.fingerprint_events (user_id);

alter table public.beta_votes enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.fingerprint_events enable row level security;

-- L'élève lit, insère et modifie SEULEMENT ses lignes, et seulement pendant sa fenêtre de 72 h.
drop policy if exists bv_own on public.beta_votes;
drop policy if exists bv_read on public.beta_votes;
drop policy if exists bv_write on public.beta_votes;
create policy bv_read on public.beta_votes for select using (auth.uid() = user_id);
create policy bv_write on public.beta_votes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.users u
     where u.id = auth.uid() and u.is_beta and now() < u.beta_started_at + interval '72 hours'));

drop policy if exists bf_own on public.beta_feedback;
drop policy if exists bf_read on public.beta_feedback;
drop policy if exists bf_write on public.beta_feedback;
create policy bf_read on public.beta_feedback for select using (auth.uid() = user_id);
create policy bf_write on public.beta_feedback for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.users u
                 where u.id = auth.uid() and u.is_beta and now() < u.beta_started_at + interval '72 hours')
    and exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));
-- fingerprint_events : aucune policy (écriture par la fonction serveur seulement).

-- activate_code : même fonction qu'avant, + marque is_beta / beta_started_at pour kind = 'beta'.
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
         email                 = coalesce(email, v_code.email),
         -- Bêta fermée : un code kind = 'beta' marque le compte et démarre la fenêtre de 72 h.
         is_beta               = is_beta or (v_code.kind = 'beta'),
         beta_started_at       = case when v_code.kind = 'beta' then coalesce(beta_started_at, now()) else beta_started_at end
   where id = p_user_id
   returning credits into v_credits;

  return jsonb_build_object('credits', v_credits, 'plan', v_plan, 'email', v_code.email);
end;
$$;

-- get_my_profile : même fonction qu'avant, + is_beta, beta_started_at, beta_ends_at.
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
           'last_analysis_date', u.last_analysis_date,
           'created_at',         u.created_at,
           'is_beta',            u.is_beta,
           'beta_started_at',    u.beta_started_at,
           'beta_ends_at',       (u.beta_started_at + interval '72 hours')
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
