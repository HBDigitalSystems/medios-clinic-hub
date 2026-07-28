-- =====================================================================
-- Orden de presentacion estable para servicios y doctores.
--
-- El seed inserto cada tabla en un solo INSERT, y `now()` es constante
-- dentro de una transaccion: los 5 servicios y los 4 doctores quedaron
-- con el MISMO created_at. Al ordenar por esa columna, Postgres devuelve
-- las filas en orden arbitrario, asi que la landing pintaba las
-- especialidades desordenadas en cada consulta.
--
-- Se escalona created_at un segundo por posicion, respetando el orden
-- del PRD (Medicina General primero, Dra. Sofia primero).
-- =====================================================================

update public.services s
   set created_at = s.created_at + (v.pos * interval '1 second')
  from (values
    ('Medicina General', 1),
    ('Odontologia',      2),
    ('Pediatria',        3),
    ('Dermatologia',     4),
    ('Nutricion',        5)
  ) as v(nombre, pos)
 where s.name = v.nombre;

update public.doctors d
   set created_at = d.created_at + (v.pos * interval '1 second')
  from (values
    ('Dra. Sofia Martinez', 1),
    ('Dr. Carlos Herrera',  2),
    ('Dra. Ana Lopez',      3),
    ('Dr. Roberto Diaz',    4)
  ) as v(nombre, pos)
 where d.name = v.nombre;
