-- =============================================================================
-- APP MOBILE (iOS / Android) — à exécuter UNE fois dans Supabase > SQL Editor (idempotent).
-- Ajoute uniquement ce qui manque au backend existant : les jetons de notifications push.
-- Tout le reste (profil, crédits, analyses, abonnements) réutilise le schéma déjà en place.
-- =============================================================================

create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform    text not null check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated with check (user_id = auth.uid());

-- upsert (insert ... on conflict (token) do update) exige aussi UPDATE sur la ligne existante.
drop policy if exists push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_tokens_delete_own on public.push_tokens;
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (user_id = auth.uid());
