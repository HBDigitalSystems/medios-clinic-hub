-- =====================================================================
-- Los proximos horarios vuelven a ser publicos
--
-- Cambio de flujo: explorar especialidades y medicos ya no exige cuenta.
-- La cuenta se pide al elegir medico, justo antes de reservar. Para que
-- las tarjetas muestren disponibilidad real hace falta que un visitante
-- sin sesion pueda consultarla.
--
-- Lo que expone `doctor_next_slots` es cuando un medico tiene hueco, que
-- es exactamente lo que cualquier pagina de reservas ensena. Ni pacientes,
-- ni motivos, ni estados.
--
-- `doctor_busy_blocks` NO se reabre: solo la usa el paso de fecha y hora,
-- que ya ocurre con sesion.
-- =====================================================================

grant execute on function public.doctor_next_slots(uuid, int, date, time, int) to anon;
