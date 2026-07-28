-- =====================================================================
-- Restablecer los datos de demostracion
--
-- El seed uso `current_date + N`, pero eso se evalua UNA vez, al insertar.
-- Las fechas quedan congeladas y la demo envejece: a los dos dias, las
-- citas "de hoy" son de anteayer y el dashboard aparece vacio.
--
-- Esta funcion vuelve a anclar las 10 citas del seed y sus 3 cobros al
-- dia de hoy, con los mismos offsets y estados del PRD.
--
-- Lo que NO hace: borrar nada. Las citas y pacientes creados despues se
-- quedan. Es a proposito: una funcion que borra filas "que no reconoce"
-- es demasiado peligrosa si un dia esto corre con datos reales.
-- =====================================================================

create or replace function public.reset_demo_data()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_citas int;
begin
  -- Solo el admin puede reiniciar la demo
  if not public.is_admin() then
    raise exception 'Solo un administrador puede restablecer los datos demo';
  end if;

  -- Las notas se borran antes: la de una cita que vuelve a 'scheduled'
  -- no tendria sentido
  delete from public.appointment_notes
   where appointment_id in (
     select id from public.appointments
      where id::text like '55555555-0000-0000-0000-%'
   );

  -- Estados y fechas canonicos del PRD, recolocados sobre hoy.
  -- El orden de los offsets evita solapamientos por doctor.
  update public.appointments a
     set appointment_date = current_date + v.dias,
         start_time       = v.hora,
         duration_minutes = v.duracion,
         status           = v.estado::public.appointment_status,
         reason           = v.motivo
    from (values
      ('55555555-0000-0000-0000-000000000001', 1,  '10:00'::time, 30, 'scheduled',   'Dolor de cabeza recurrente'),
      ('55555555-0000-0000-0000-000000000002', 2,  '11:30'::time, 45, 'scheduled',   'Limpieza dental'),
      ('55555555-0000-0000-0000-000000000003', 3,  '09:30'::time, 30, 'scheduled',   'Control mensual'),
      ('55555555-0000-0000-0000-000000000004', 0,  '15:00'::time, 30, 'confirmed',   'Manchas en la piel'),
      ('55555555-0000-0000-0000-000000000005', 0,  '16:30'::time, 30, 'confirmed',   'Revision general'),
      ('55555555-0000-0000-0000-000000000006', -3, '10:00'::time, 30, 'completed',   'Gripa fuerte'),
      ('55555555-0000-0000-0000-000000000007', -7, '12:00'::time, 45, 'completed',   'Caries molar'),
      ('55555555-0000-0000-0000-000000000008', 0,  '11:00'::time, 30, 'in_progress', 'Seguimiento'),
      ('55555555-0000-0000-0000-000000000009', -1, '13:00'::time, 30, 'no_show',     'Acne'),
      ('55555555-0000-0000-0000-000000000010', -2, '09:00'::time, 30, 'cancelled',   'Consulta')
    ) as v(id, dias, hora, duracion, estado, motivo)
   where a.id = v.id::uuid;

  get diagnostics v_citas = row_count;

  -- Las notas clinicas de las dos citas completadas
  insert into public.appointment_notes (appointment_id, content)
  values
    ('55555555-0000-0000-0000-000000000006',
     'Paciente con cuadro gripal. Indicado paracetamol 500mg cada 8h por 5 dias.'),
    ('55555555-0000-0000-0000-000000000007',
     'Restauracion de molar inferior. Control en 6 meses.')
  on conflict (appointment_id) do update set content = excluded.content;

  -- Cobros: dos pagados y uno pendiente
  update public.invoices i
     set status  = v.estado::public.invoice_status,
         method  = v.metodo::public.payment_method,
         paid_at = case when v.dias is null then null else current_date + v.dias end,
         amount  = v.monto
    from (values
      ('66666666-0000-0000-0000-000000000001', 'paid',    'efectivo', -3,   800.00),
      ('66666666-0000-0000-0000-000000000002', 'paid',    'tarjeta',  -7,  1200.00),
      ('66666666-0000-0000-0000-000000000003', 'pending', null,       null,  200.00)
    ) as v(id, estado, metodo, dias, monto)
   where i.id = v.id::uuid;

  return format('Demo restablecida: %s citas recolocadas sobre %s', v_citas, current_date);
end;
$$;

comment on function public.reset_demo_data is
  'Vuelve a anclar las citas y cobros del seed al dia de hoy. No borra datos creados despues. Solo admin.';

grant execute on function public.reset_demo_data() to authenticated;
