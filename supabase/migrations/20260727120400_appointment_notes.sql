-- =====================================================================
-- Las notas clinicas salen de `appointments` a su propia tabla.
--
-- Motivo: RLS filtra FILAS, no columnas. Si el paciente puede leer su
-- cita, lee tambien `clinical_notes`. Y el PRD dice que las notas del
-- doctor NO son visibles para el paciente.
--
-- Los grants por columna tampoco valen: doctor y paciente son el mismo
-- rol de Postgres (`authenticated`), asi que no se pueden distinguir a
-- ese nivel. Separar la tabla es la unica forma limpia: `appointments`
-- deja de tener columnas secretas y un `select *` es seguro para todos.
-- =====================================================================

create table public.appointment_notes (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  content        text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger appointment_notes_set_updated_at
  before update on public.appointment_notes
  for each row execute function public.set_updated_at();

-- Traslada las notas que ya existen
insert into public.appointment_notes (appointment_id, content)
select id, clinical_notes
  from public.appointments
 where clinical_notes <> '';

alter table public.appointments drop column clinical_notes;

alter table public.appointment_notes enable row level security;
