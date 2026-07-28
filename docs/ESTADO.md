# Estado de implementación vs PRD

Auditoría del código al 27-jul-2026 (commit `deb9951`). Contrastado línea por línea contra
[PRD.md](./PRD.md).

**Resumen: la Fase 1 está ~85% construida.** Las 6 rutas existen, los 13 tabs existen, el
store tiene la lógica de negocio y la máquina de estados. Lo que falta son huecos concretos
y algunos bugs de reglas de negocio.

---

## ✅ Ya implementado y correcto

| Área | Detalle |
| --- | --- |
| Rutas | Las 6 del PRD, ni una de más (`/`, `/booking`, `/auth`, `/hub`, `/doctor`, `/patient`) |
| Landing | Hero, especialidades, doctores, "Por qué MediOS", 3 testimonios, footer |
| Booking | Stepper de 5 pasos, calendario, slots, colisión de horario, pantalla de confirmación |
| Auth | Selector de 3 roles con iconos Shield / Stethoscope / User |
| Hub | Sidebar colapsable + bottom nav mobile, los 7 tabs |
| Doctor | Los 3 tabs, card "Próximo Paciente", notas con autoguardado, modal de cobro |
| Paciente | Los 3 tabs, reagendar, alerta de pagos pendientes |
| Store | Zustand + `persist` en localStorage, botón "Reset demo" |
| Máquina de estados | `validTransitions` completa y correcta (`store.ts:23`) |
| Eventos de cita | Se registran en cada transición, notas y cobro |
| Datos mock | Clínica, 5 especialidades, 4 doctores, 5 pacientes, 10 citas, 3 cobros — exactos |
| Toasts | En crear, transicionar, cobrar, guardar config |

---

## ❌ Huecos vs PRD

### ~~1. Onboarding wizard — no existe~~ ✅ CONSTRUIDO (28-jul-2026)

`src/components/onboarding-wizard.tsx`, 4 pasos con stepper: datos de la clínica → primer
doctor → servicios y precios → resumen final.

**Cuándo se dispara.** El PRD decía "flag en localStorage", pero eso solo falla mal: si el
admin cambia de navegador o lo limpia, le sale el asistente con la clínica ya montada; y un
segundo admin en otro equipo nunca lo ve. Se cruza el flag con el **estado real de la
base**: solo aparece si además no hay ni doctores ni servicios. Si la clínica ya está
configurada, el flag se marca solo, en silencio.

Se puede relanzar desde Configuración → "Volver a ejecutarlo", útil para repasar la
configuración o enseñarlo en una demo.

**Cada paso guarda al avanzar**, no al final: si alguien cierra la ventana a mitad, lo
hecho no se pierde. El paso 2 detecta doctores existentes y ofrece "Saltar"; el paso 3
sugiere servicios habituales de un clic y exige al menos uno para continuar (sin servicios
no se puede agendar).

Verificado en el navegador: con localStorage limpio y la clínica montada **no aparece** y
el flag se marca solo; lanzado a mano recorre los 4 pasos con los datos reales precargados
(4 doctores, 5 servicios) y vuelve al Dashboard sin tocar la base.

### 2. Hub → Doctores

- **No se puede editar un doctor.** El PRD pide "click en doctor abre detalle con edición de
  horarios". Solo existe "Agregar Doctor". Los iconos `Pencil` y `X` están importados pero
  sin usar ([`hub.tsx:7`](../src/routes/hub.tsx:7)).
- **El formulario de alta no permite elegir días.** Hardcodea `days: [1,2,3,4,5]`
  ([`hub.tsx:403`](../src/routes/hub.tsx:403)); el PRD pide "horario por día".

### 3. Hub → Pacientes

El perfil no muestra **cobros asociados** ni tiene el botón **"Crear Cita" para este
paciente**. Ambos están en el PRD.

### 4. Hub → Cobros

Falta el filtro de **rango de fechas** (existen los de estado y doctor).

### 5. Hub → Configuración

Falta **"duración default por especialidad"** — o sea, la tabla editable de servicios y
precios. El store ya tiene `addSpecialty` y `updateSpecialty`
([`store.ts:224`](../src/lib/store.ts:224)) pero no hay UI que los llame.

### ~~6. Booking → Paso 2~~ ✅ CORREGIDO (28-jul-2026)

Las cards mostraban `"Disponible 09:00 - 17:00"`, que es la jornada del doctor — no dice si
le queda hueco. Ahora muestran los **próximos 3 horarios libres reales**, y cada uno es un
atajo: al pulsarlo se salta el paso de fecha.

Se calcula en la base con `doctor_next_slots()` (migración `20260727121200`), que cruza el
horario del doctor con sus citas. Hacerlo en el cliente habría exigido una consulta por
doctor **y por día** hasta dar con un hueco.

Como en `doctor_busy_blocks`, la fecha y hora de referencia **llegan del cliente**: el
servidor va en UTC y la clínica no.

Verificado en la base — tres comportamientos a la vez:

| Doctor | Horario | Próximos huecos (con hoy agotado) |
| --- | --- | --- |
| Ana López | L, M, J | jue 30 — **salta el miércoles** |
| Roberto Díaz | M, J, V | jue 30 — **salta el miércoles** |
| Sofía Martínez | L–V | mié 29: `09:00, 09:30, 10:30` — **salta las 10:00**, donde tiene cita |

**Bug detectado al probarlo en el navegador:** el atajo saltaba hasta la confirmación, y sin
sesión eso se comía también el paso "Tus datos" — la cita se habría creado sin nombre ni
teléfono. Corregido: salta solo el paso de fecha.

### 7. Paciente → Cancelar

- **No hay diálogo de confirmación**; cancela al primer click
  ([`patient.tsx:109`](../src/routes/patient.tsx:109)).
- **No se aplica la regla de las 2 horas.** El PRD dice "un paciente puede cancelar hasta 2
  horas antes de la cita"; no hay ninguna validación de tiempo.

---

## 🐛 Bugs de reglas de negocio

### ~~B1 — La duración no bloquea el bloque de agenda~~ ✅ CORREGIDO (27-jul-2026)

Detectaba colisión comparando `x.time === a.time`, o sea **solo hora exacta**. Una cita de
odontología de 45 min a las 11:30 no impedía agendar otra de 30 min a las 12:00.

**Solución.** Dos helpers nuevos en [`medi-utils.ts`](../src/lib/medi-utils.ts):

- `rangesOverlap(startA, durA, startB, durB)` — una cita ocupa `[inicio, inicio + duración)`;
  dos bloques chocan si se traslapan aunque no empiecen a la misma hora.
- `blocksAgenda(status)` — `cancelled` y `no_show` liberan el horario; el resto lo ocupa.

Aplicados en:
- `addAppointment` del store (cubre booking público y el modal "Nueva Cita" del admin).
- El paso 3 de booking, que ahora filtra los slots por solapamiento real en vez de ocultar
  solo la hora de inicio exacta. Si no queda ninguno, muestra "No quedan horarios
  disponibles ese día".

**Verificado:** 16 assertions de lógica en verde, y en la UI el Dr. Herrera el 29-jul ofrece
`10:00 10:45 12:15 13:00 …` — el 11:30 (cita existente) ya no aparece.

### B2 — El horario del doctor se muestra siempre como "L-V"

[`hub.tsx:430`](../src/routes/hub.tsx:430) tiene `L-V` hardcodeado. Pero `doc_03` es L, M, J
y `doc_04` es M, J, V. La card muestra información falsa para 2 de los 4 doctores.

### ~~B3 — Se pueden agendar horas pasadas del día de hoy~~ ✅ CORREGIDO (28-jul-2026)

El calendario deshabilitaba días anteriores, pero al elegir hoy seguía ofreciendo los slots
de la mañana por la tarde.

**Al arreglarlo apareció algo peor: las fechas se calculaban en UTC.** `todayISO()`,
`sumarDias()`, `inicioDeSemana()` y el calendario del booking usaban
`toISOString().slice(0,10)`, que devuelve la fecha **UTC**, no la del usuario:

- En México (GMT-6), a partir de las 18:00 la app pasaba a creer que ya era el día
  siguiente: "Mi Día" del doctor, "citas hoy" del dashboard y la agenda mostraban la
  jornada equivocada.
- En Europa (GMT+2) el fallo es al revés: el calendario del booking mapeaba cada casilla al
  **día anterior**, así que reservar el 30 creaba la cita el 29.

Se añadió `isoLocal()` y se migraron todos los cálculos de fecha. También `paid_at` en
`invoices.ts`, que ponía la fecha UTC en vez de la del cajero.

Verificado (9 comprobaciones en verde): las 23:30 del 29-jul siguen siendo el 29 —
`toISOString()` habría dicho 30. Y en el navegador, pulsar el día 30 consulta `2026-07-30`.

### B4 — "Ingresos del mes" suma todo el histórico

En Reportes ([`hub.tsx:605`](../src/routes/hub.tsx:605)) y en Dashboard
([`hub.tsx:147`](../src/routes/hub.tsx:147)) se suman **todos** los cobros pagados, sin
filtrar por mes. El label dice "del mes".

### B5 — "Citas esta semana" cuenta el histórico completo

[`hub.tsx:418`](../src/routes/hub.tsx:418): `weekApts` no filtra por semana.

### B6 — KPI "Pacientes nuevos" muestra el total de pacientes

[`hub.tsx:168`](../src/routes/hub.tsx:168) usa `patients.length`.

### B7 — Reagendar no valida nada

[`patient.tsx:126`](../src/routes/patient.tsx:126) permite cualquier fecha/hora: no revisa
colisión con otras citas ni si el doctor trabaja ese día.

---

## Orden de trabajo propuesto

Primero las reglas de negocio (es lo que hace que la demo se sienta real), luego los huecos
de UI, y el onboarding al final porque es lo más aislado.

| # | Tarea | Tipo |
| --- | --- | --- |
| ~~1~~ | ~~Colisión por bloque de duración + ocultar slots ocupados reales~~ ✅ | Bug B1 |
| 2 | No permitir horas pasadas hoy | Bug B3 |
| 3 | Horario real del doctor en la card (no "L-V") | Bug B2 |
| 4 | Métricas correctas: mes, semana, pacientes nuevos | Bugs B4, B5, B6 |
| 5 | Editar doctor (detalle + horario por día) | Hueco 2 |
| 6 | Cancelar con confirmación + regla de 2 horas | Hueco 7 |
| 7 | Reagendar con validación | Bug B7 |
| 8 | Perfil de paciente: cobros + "Crear Cita" | Hueco 3 |
| 9 | Filtro de rango de fechas en Cobros | Hueco 4 |
| 10 | Servicios y precios editables en Configuración | Hueco 5 |
| 11 | Próximos 3 horarios en las cards de booking | Hueco 6 |
| 12 | Onboarding wizard de 4 pasos | Hueco 1 |
