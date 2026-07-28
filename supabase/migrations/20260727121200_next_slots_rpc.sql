-- =====================================================================
-- Proximos huecos libres de un doctor
--
-- El PRD pide que las tarjetas del paso 2 del booking muestren los
-- "proximos 3 horarios disponibles". Calcularlo en el cliente exigiria
-- una consulta por doctor y por dia hasta encontrar hueco.
--
-- La fecha y hora de referencia llegan como parametro, NO se usa now():
-- el servidor va en UTC y la clinica no. Quien sabe que hora es para el
-- usuario es el navegador.
--
-- Devuelve solo fecha y hora, igual que doctor_busy_blocks: nada de
-- datos de pacientes.
-- =====================================================================

create or replace function public.doctor_next_slots(
  p_doctor_id uuid,
  p_duration   int,
  p_from_date  date,
  p_from_time  time,
  p_limit      int default 3
)
returns table (slot_date date, slot_time time)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_schedule    jsonb;
  v_dias        int[];
  v_inicio      time;
  v_fin         time;
  v_dia         date;
  v_slot        time;
  v_encontrados int := 0;
  -- Tope de busqueda: si en dos meses no hay hueco, algo va mal en la agenda
  v_limite_dias constant int := 60;
begin
  select schedule into v_schedule
    from public.doctors
   where id = p_doctor_id and active;

  if v_schedule is null or p_duration <= 0 then
    return;
  end if;

  v_dias   := array(select jsonb_array_elements_text(v_schedule -> 'days')::int);
  v_inicio := (v_schedule ->> 'start')::time;
  v_fin    := (v_schedule ->> 'end')::time;

  v_dia := p_from_date;

  while v_dia < p_from_date + v_limite_dias and v_encontrados < p_limit loop
    -- isodow: 1 = lunes ... 7 = domingo, igual que el schedule
    if extract(isodow from v_dia)::int = any(v_dias) then
      v_slot := v_inicio;

      while v_slot + make_interval(mins => p_duration) <= v_fin
            and v_encontrados < p_limit loop

        if not (v_dia = p_from_date and v_slot <= p_from_time)
           and not exists (
             select 1
               from public.appointments a
              where a.doctor_id = p_doctor_id
                and a.appointment_date = v_dia
                and a.status not in ('cancelled', 'no_show')
                and tsrange(
                      v_dia + a.start_time,
                      v_dia + a.start_time + make_interval(mins => a.duration_minutes)
                    ) && tsrange(
                      v_dia + v_slot,
                      v_dia + v_slot + make_interval(mins => p_duration)
                    )
           )
        then
          slot_date := v_dia;
          slot_time := v_slot;
          v_encontrados := v_encontrados + 1;
          return next;
        end if;

        v_slot := v_slot + make_interval(mins => p_duration);
      end loop;
    end if;

    v_dia := v_dia + 1;
  end loop;
end;
$$;

comment on function public.doctor_next_slots is
  'Proximos huecos libres de un doctor, cruzando su horario con sus citas. Solo fecha y hora. La usa el booking publico.';

grant execute on function public.doctor_next_slots(uuid, int, date, time, int) to anon, authenticated;
