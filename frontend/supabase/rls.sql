-- ===================================================================
-- SutoGas — políticas básicas de RLS (Semana 5, permissive)
-- Refinar na Semana 6 (multi-tenant por usuário).
-- ===================================================================

alter table public.pedidos       enable row level security;
alter table public.entregadores  enable row level security;
alter table public.conversas     enable row level security;
alter table public.agencias      enable row level security;

-- service_role já bypassa RLS por padrão, mas adicionamos políticas
-- permissivas para o role 'authenticated' (frontend com anon key + JWT).

-- ---------- pedidos ----------
drop policy if exists "pedidos_select_authenticated"  on public.pedidos;
drop policy if exists "pedidos_insert_authenticated"  on public.pedidos;
drop policy if exists "pedidos_update_authenticated"  on public.pedidos;

create policy "pedidos_select_authenticated"
  on public.pedidos for select
  to authenticated, anon
  using (true);

create policy "pedidos_insert_authenticated"
  on public.pedidos for insert
  to authenticated
  with check (true);

create policy "pedidos_update_authenticated"
  on public.pedidos for update
  to authenticated
  using (true) with check (true);

-- ---------- entregadores ----------
drop policy if exists "entregadores_select_authenticated"  on public.entregadores;
drop policy if exists "entregadores_insert_authenticated"  on public.entregadores;
drop policy if exists "entregadores_update_authenticated"  on public.entregadores;

create policy "entregadores_select_authenticated"
  on public.entregadores for select
  to authenticated, anon
  using (true);

create policy "entregadores_insert_authenticated"
  on public.entregadores for insert
  to authenticated, anon
  with check (true);

create policy "entregadores_update_authenticated"
  on public.entregadores for update
  to authenticated, anon
  using (true) with check (true);

-- ---------- conversas ----------
drop policy if exists "conversas_select_authenticated"  on public.conversas;
drop policy if exists "conversas_insert_authenticated"  on public.conversas;
drop policy if exists "conversas_update_authenticated"  on public.conversas;

create policy "conversas_select_authenticated"
  on public.conversas for select
  to authenticated
  using (true);

create policy "conversas_insert_authenticated"
  on public.conversas for insert
  to authenticated
  with check (true);

create policy "conversas_update_authenticated"
  on public.conversas for update
  to authenticated
  using (true) with check (true);

-- ---------- agencias ----------
drop policy if exists "agencias_select_authenticated"  on public.agencias;
drop policy if exists "agencias_update_authenticated"  on public.agencias;

create policy "agencias_select_authenticated"
  on public.agencias for select
  to authenticated, anon
  using (true);

create policy "agencias_update_authenticated"
  on public.agencias for update
  to authenticated, anon
  using (true) with check (true);
