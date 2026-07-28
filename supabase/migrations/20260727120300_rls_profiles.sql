-- =====================================================================
-- RLS de `profiles`
--
-- Se adelanta desde la fase 2.4 porque la 2.3 no funciona sin ella: el
-- frontend necesita leer su propio perfil para saber que rol tiene y a
-- donde redirigir. El resto de politicas siguen en 2.4.
--
-- Sin recursion: is_admin() es SECURITY DEFINER, asi que al consultar
-- profiles desde una politica sobre profiles no se vuelve a evaluar RLS.
-- =====================================================================

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- Cada quien puede corregir su propio nombre, pero NO su rol ni su clinica.
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_user_role()
    and clinic_id is not distinct from public.current_user_clinic_id()
  );
