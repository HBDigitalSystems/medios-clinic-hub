-- =====================================================================
-- Cerrar de verdad las funciones del booking a los anonimos
--
-- La migracion anterior hacia `revoke execute ... from anon` y no surtio
-- efecto: al crear una funcion, Postgres concede EXECUTE a PUBLIC por
-- defecto, y `anon` hereda de PUBLIC. Revocar al rol concreto no quita
-- lo heredado.
--
-- Hay que revocar a PUBLIC y luego conceder solo a quien debe usarlas.
-- =====================================================================

revoke execute on function public.doctor_busy_blocks(uuid, date) from public;
revoke execute on function public.doctor_busy_blocks(uuid, date) from anon;
grant  execute on function public.doctor_busy_blocks(uuid, date) to authenticated;

revoke execute on function public.doctor_next_slots(uuid, int, date, time, int) from public;
revoke execute on function public.doctor_next_slots(uuid, int, date, time, int) from anon;
grant  execute on function public.doctor_next_slots(uuid, int, date, time, int) to authenticated;

-- Mismo problema en reset_demo_data: la funcion ya comprueba is_admin()
-- por dentro, pero no hay motivo para que un anonimo pueda ni invocarla.
revoke execute on function public.reset_demo_data() from public;
revoke execute on function public.reset_demo_data() from anon;
grant  execute on function public.reset_demo_data() to authenticated;
