-- =====================================================================
-- Huecos ocupados de un doctor, para el booking publico.
--
-- Problema: el paso 3 del booking tiene que ocultar los horarios ya
-- cogidos, pero `anon` no puede leer `appointments` (y no debe: ahi hay
-- datos de pacientes).
--
-- Solucion: una funcion SECURITY DEFINER que devuelve UNICAMENTE la hora
-- de inicio y la duracion de los bloques ocupados. Ni paciente, ni motivo,
-- ni estado. Es exactamente lo que una agenda publica tiene que revelar
-- para poder reservar, y nada mas.
-- =====================================================================

create or replace function public.doctor_busy_blocks(p_doctor_id uuid, p_date date)
returns table (start_time time, duration_minutes int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.start_time, a.duration_minutes
    from public.appointments a
   where a.doctor_id = p_doctor_id
     and a.appointment_date = p_date
     -- Canceladas y no-shows liberan el horario, igual que en la
     -- constraint appointments_no_overlap
     and a.status not in ('cancelled', 'no_show')
   order by a.start_time;
$$;

comment on function public.doctor_busy_blocks is
  'Bloques ocupados de un doctor en una fecha. Solo hora y duracion: no expone datos del paciente. La usa el booking publico.';

grant execute on function public.doctor_busy_blocks(uuid, date) to anon, authenticated;
