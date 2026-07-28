# MediOS — Roadmap de Implementación

Plan para llevar MediOS de datos mock a producción con Supabase y deploy.

> **Nota sobre estados.** Este documento se redactó originalmente con las Fases 2–4 marcadas
> como completadas. Una auditoría del código (27-jul-2026) confirmó que **solo la Fase 1 está
> hecha**. Los estados de abajo reflejan lo verificado en el repositorio, no la redacción
> original. Ver [Auditoría del estado real](#auditoría-del-estado-real-27-jul-2026).

---

## Auditoría del estado real (27-jul-2026)

Verificado sobre el repo `HBDigitalSystems/medios-clinic-hub`, commit `deb9951`.

### Stack real (difiere de lo que asumía el roadmap)

| Capa | Roadmap original | **Real en el repo** |
|---|---|---|
| Framework | React 18 + Vite (SPA) | **TanStack Start (SSR) + React 19** |
| Routing | — | **TanStack Router** (file-based, `src/routes/`) |
| Cliente Supabase | `src/lib/supabase.ts` | **`src/integrations/supabase/`** (client + client.server + middleware) |
| Deploy | Vercel + `vercel.json` (rewrites SPA) | **Nitro** (preset Cloudflare por defecto); sin `vercel.json` |
| Repo GitHub | `SinCodigoLat/medios` | **`HBDigitalSystems/medios-clinic-hub`** |
| Proyecto Supabase | `citlzbdewetxsgdxwxjj` (us-east-2) | **`xvpzyycqrmtfsxwpyjbt`** |
| Gestor de paquetes | npm | **bun** (`bun.lock`, `bunfig.toml`) |
| Origen | — | Proyecto **Lovable** (sincroniza con la rama; no reescribir historia) |

> ⚠️ **Pendiente de decidir:** el roadmap asume un SPA desplegado en Vercel con rewrites.
> El proyecto real es SSR con Nitro. Esto cambia la estrategia de deploy y de auth
> (hay middleware de sesión en servidor). A resolver antes de la Fase 4.

> ⚠️ **Pendiente de aclarar:** hay dos IDs de proyecto Supabase distintos. Confirmar cuál
> es el bueno antes de crear el schema.

### Qué existe hoy en el código

```
src/
  routes/            index, auth, booking, doctor, hub, patient, __root
  lib/
    mock-data.ts     ← fuente de datos actual (4 doctores, 5 pacientes, 10 citas…)
    store.ts         ← Zustand con TODA la lógica de negocio + localStorage
    types.ts, medi-utils.ts
  integrations/supabase/
    client.ts, client.server.ts, auth-middleware.ts, auth-attacher.ts
    types.ts         ← generado, pero con CERO tablas: Tables: { [_ in never]: never }
  components/ui/     ← shadcn/ui completo (~50 componentes)
supabase/
  config.toml        ← solo el project_id; NO hay migraciones
```

### Hallazgos que hay que atender

1. **`.env` está commiteado** en el repo (claves anon/publishable de Supabase). No es
   crítico porque son claves públicas, pero debe salir del control de versiones.
2. **No hay migraciones.** `supabase/` solo tiene `config.toml`. Todo el schema tendrá
   que escribirse desde cero como migración versionada.
3. **`types.ts` no tiene tablas**, coherente con que el schema no existe todavía.
4. **No hay tests** de ningún tipo.
5. Aviso benigno de Vite 8: `vite-tsconfig-paths` ya es nativo. No tocar — lo inyecta
   `@lovable.dev/vite-tanstack-config`.

---

## Fase 1 — UI con datos mock ✅ COMPLETADA

- [x] Landing page pública
- [x] Flujo de booking paso a paso
- [x] Auth mock con selector de rol
- [x] Panel Admin (`/hub`)
- [x] Panel Doctor (`/doctor`)
- [x] Portal Paciente (`/patient`)
- [x] Onboarding wizard
- [x] Store Zustand con lógica de negocio
- [x] Datos mock: 4 doctores, 5 pacientes, 10 citas, 3 cobros
- [x] Transiciones de estado validadas
- [x] Persistencia en localStorage

---

## Fase 2 — Supabase: Base de Datos y Auth ⬜ PENDIENTE

### 2.1 — Setup inicial ✅ COMPLETADO (27-jul-2026)

- [x] Proyecto Supabase definitivo: **`kwbhegytvghqebrjuywu`** ("DoctorCita", us-west-1,
      Postgres 17.6). Descartados los dos IDs anteriores.
- [x] `@supabase/supabase-js` instalado
- [x] Cliente Supabase existe (`src/integrations/supabase/client.ts` + `client.server.ts`)
- [x] `.env` sacado del control de versiones (`git rm --cached`), `.gitignore` actualizado
      y `.env.example` documentado
- [x] `.env` reescrito con las credenciales del proyecto nuevo, separando claves públicas
      (`VITE_*`) de las de servidor (`SUPABASE_SERVICE_ROLE_KEY`, sin prefijo `VITE_`)
- [x] `supabase/config.toml` apuntando al proyecto correcto
- [x] Acceso verificado: token válido, proyecto `ACTIVE_HEALTHY`, schema `public` vacío

**Herramienta de trabajo.** En vez del CLI (no instalado, y `db push` pediría la contraseña
de la base) se usa la **Management API** de Supabase:
`POST https://api.supabase.com/v1/projects/{ref}/database/query` con el PAT. Aplica SQL
directamente. Las migraciones igual se versionan en `supabase/migrations/`.

### 2.2 — Schema de base de datos ✅ COMPLETADO (27-jul-2026)

Migraciones versionadas en `supabase/migrations/`:
- `20260727120000_initial_schema.sql`
- `20260727120100_seed_demo_data.sql`

- [x] `clinics` (1 registro)
- [x] `profiles` (0 — se llenan al crear usuarios en 2.3)
- [x] `services` (5)
- [x] `doctors` (4, con `schedule` JSONB)
- [x] `patients` (5)
- [x] `appointments` (10: 3 scheduled, 2 confirmed, 2 completed, 1 in_progress,
      1 no_show, 1 cancelled — exactamente lo que pide el PRD)
- [x] `appointment_events` (28)
- [x] `invoices` (3: 2 pagados efectivo/tarjeta + 1 pendiente)
- [x] Índices en las columnas más consultadas (agenda por doctor+fecha, búsqueda de
      pacientes por nombre con GIN, cobros por clínica+estado, etc.)
- [x] `src/integrations/supabase/types.ts` regenerado desde la base real; `tsc` limpio

**Decisiones de diseño:**

- **UUIDs fijos en el seed** para que sea reproducible y las referencias no dependan del
  orden de inserción. Fechas relativas a `current_date`, así la demo nunca caduca.
- **Enums de Postgres** para `app_role`, `appointment_status`, `invoice_status` y
  `payment_method`, en vez de texto libre.
- **`appointments_no_overlap`**: constraint `EXCLUDE USING gist` que impide a nivel de base
  que un doctor tenga dos citas cuyos bloques se traslapen — la misma regla que se arregló
  en el cliente en el paso 1 de Fase 1, ahora también imposible de saltar desde la API.
  Las canceladas y los no-show quedan fuera vía `WHERE`, así liberan el horario.
  Verificado: solapamiento → rechazado; citas consecutivas (back-to-back) → aceptadas.
- **`invoices_paid_ck`**: un cobro `paid` obliga a tener método y fecha de pago.
- **RLS activado en las 8 tablas pero sin políticas todavía.** Es el default seguro: sin
  políticas, PostgREST no deja pasar nada con las claves anon/authenticated. La app no
  podrá leer nada hasta que se escriban las políticas en 2.4 — que es el siguiente paso.

### 2.3 — Autenticación ✅ COMPLETADO (27-jul-2026)

Migraciones: `20260727120200_auth.sql`, `20260727120300_rls_profiles.sql`

- [x] Supabase Auth con email + password
- [x] `profiles` con `role`, poblado por trigger
- [x] Trigger `handle_new_user()` en `auth.users`
- [x] `/auth` reescrito: login real, sin selector de rol mock
- [x] Registro de pacientes (toggle login/signup en `/auth`)
- [x] Rutas protegidas por rol vía `<ProtectedRoute allow="…">`
- [x] `AuthProvider` de cliente en `src/lib/auth.tsx`
- [x] Token refresh (`autoRefreshToken` + `onAuthStateChange`) y logout
- [x] Usuarios demo `@doctorcita.demo` (el dominio cambió con el rename de marca)
- [x] `user_id` vinculado: Sofía → `doctors`, María → `patients`

**Decisión de arquitectura: auth en cliente.** El scaffolding de Lovable ya venía montado
así — `auth-attacher.ts` coge el token de `supabase.auth.getSession()` (localStorage) y lo
adjunta como Bearer a las server functions, y está registrado en `src/start.ts`. El
`auth-middleware.ts` de servidor sirve para server functions, no para proteger páginas. Se
sigue ese patrón: sesión en cliente + RLS como frontera de seguridad real.

Consecuencia: la sesión no existe durante el SSR, así que `ProtectedRoute` muestra un
spinner en la primera pintada antes de decidir. Por eso no redirige hasta que
`loading` es `false`.

**Seguridad — el rol no se acepta desde el cliente.** `raw_user_meta_data` lo controla
quien se registra. Si el trigger leyera el rol de ahí, cualquiera podría registrarse como
`admin`. En su lugar:

- signup público → siempre `patient`
- `doctor` → solo con invitación que apunte a un registro de doctor existente y **sin
  cuenta ya vinculada** (`user_id is null`, así una invitación no se reutiliza)
- `admin` → nunca por esta vía; se asigna a mano

Verificado en la práctica: `admin@doctorcita.demo` se creó como `patient` y hubo que
promoverlo con SQL.

**Se adelantó la política RLS de `profiles`** desde 2.4, porque sin ella el frontend no
puede leer su propio rol y la 2.3 no funciona. Los helpers `is_admin()`,
`current_user_role()`, `current_doctor_id()`, etc. son `SECURITY DEFINER` con
`search_path` fijado, para consultar `profiles` desde una política sobre `profiles` sin
recursión.

**Verificado end-to-end en el navegador:**

| Prueba | Resultado |
| --- | --- |
| `/hub` sin sesión | redirige a `/auth` |
| Login admin | → `/hub`, sesión en localStorage |
| Admin entrando a `/doctor` | "Esta sección no es para tu rol" |
| Logout | limpia localStorage y redirige |
| Login Sofía | → `/doctor`, panel con su nombre |
| RLS de `profiles` | Sofía y María ven 1 perfil; admin ve los 3 |

⚠️ **Pendiente hasta 2.6:** los paneles siguen leyendo del store mock, así que los datos
que se ven no son todavía los del usuario logueado. Marcado con `TODO(fase 2.6)` en
`doctor.tsx` y `patient.tsx`.

### 2.4 — Row Level Security ✅ COMPLETADO (27-jul-2026)

Migraciones: `20260727120400_appointment_notes.sql`, `20260727120500_rls_policies.sql`

- [x] `clinics` — lectura pública, escritura solo admin
- [x] `services` — lectura pública, CRUD solo admin
- [x] `doctors` — lectura pública, CRUD solo admin
- [x] `patients` — admin CRUD, doctor lee los de su clínica, paciente solo su ficha,
      anon puede insertar (booking) pero **nunca leer**
- [x] `appointments` — admin CRUD; doctor lee/crea/actualiza las suyas; paciente
      lee/crea/**solo cancela**; anon inserta como `scheduled`
- [x] `appointment_events` — admin CRUD; doctor/paciente insertan; lectura según appointments
- [x] `invoices` — admin CRUD; doctor lee y crea los de sus citas; paciente solo los suyos
- [x] `profiles` — hecho en 2.3
- [x] `appointment_notes` — **tabla nueva**, solo admin y el doctor de la cita

#### Las notas clínicas se movieron a su propia tabla

**RLS filtra filas, no columnas.** Con `clinical_notes` dentro de `appointments`, cualquier
paciente que leyera su cita leería también las notas privadas del doctor — justo lo que el
PRD prohíbe.

Los grants por columna no resuelven esto: doctor y paciente son **el mismo rol de Postgres**
(`authenticated`), así que a nivel de privilegios son indistinguibles. La única solución
limpia es separar la tabla. Ahora `appointments` no tiene columnas secretas y un `select *`
es seguro para cualquiera.

#### Trigger que congela las columnas para el paciente

Una política `UPDATE` solo ve la fila nueva en su `WITH CHECK`; no puede compararla con la
vieja. Sin protección extra, un paciente podía colar un cambio de fecha, doctor o servicio
dentro de la misma operación de "cancelar". `guard_patient_appointment_update()` lo impide.

#### Verificación (con logins reales, no por inspección)

Filas visibles por rol — totales reales: 1 clínica, 5 servicios, 4 doctores, 5 pacientes,
10 citas, 2 notas, 28 eventos, 3 cobros:

| tabla | anon | admin | doctora | paciente |
| --- | --- | --- | --- | --- |
| clinics | 1 | 1 | 1 | 1 |
| services | 5 | 5 | 5 | 5 |
| doctors | 4 | 4 | 4 | 4 |
| patients | 0 | 5 | 5 | 1 |
| appointments | 0 | 10 | 4 | 2 |
| **appointment_notes** | 0 | 2 | 1 | **0** |
| appointment_events | 0 | 28 | 12 | 9 |
| invoices | 0 | 3 | 2 | 2 |

Intentos de abuso:

| Ataque | Resultado |
| --- | --- |
| Paciente mueve la fecha de su cita | rechazado por el trigger |
| Paciente se cambia de doctor | rechazado por el trigger |
| Paciente cancela su cita | permitido (correcto) |
| Paciente se autoasciende a `admin` | bloqueado |
| Doctora crea un servicio | bloqueado (solo admin) |
| Anon lee la lista de pacientes | bloqueado |
| Anon da de alta un paciente (booking) | permitido (correcto) |

⚠️ **Para 2.6:** los INSERT como `anon` **no pueden pedir `Prefer: return=representation`**.
Devolver la fila creada exige permiso de `SELECT`, y anon no lo tiene sobre `patients` ni
`appointments`. Hay que insertar sin pedir la representación de vuelta.

⚠️ **Nota de producto:** que `anon` pueda insertar pacientes y citas es lo que pide el PRD
(booking público sin cuenta), pero es una vía de spam. En producción tocaría captcha o
rate limiting.

### 2.5 — Capa de datos ✅ COMPLETADO (27-jul-2026)

- [x] `src/lib/api/` con un módulo por entidad:
  - [x] `types.ts` — tipos de dominio + mapeo `snake_case` ↔ `camelCase`
  - [x] `shared.ts` — claves de React Query + traducción de errores de Postgres
  - [x] `clinic.ts` — lectura pública + actualización
  - [x] `services.ts` — CRUD + lectura pública
  - [x] `doctors.ts` — CRUD + `useDoctorByUserId` + `useActiveDoctors`
  - [x] `patients.ts` — CRUD + `usePatientByUserId` + alta anónima
  - [x] `appointments.ts` — CRUD + transiciones + eventos + alta anónima
  - [x] `notes.ts` — notas clínicas (tabla aparte por privacidad)
  - [x] `invoices.ts` — CRUD + marcar pagado + cancelar + saldo pendiente
- [x] React Query (`useQuery` / `useMutation`) con invalidación por prefijo
- [x] Transformación `snake_case` ↔ `camelCase` aislada en `types.ts`
- [ ] `storage.ts` — pertenece a 3.2; el bucket `avatars` todavía no existe
- [ ] Reducir el store Zustand — **se hace al final de 2.6**: vaciarlo ahora rompería
      todos los componentes, que aún leen de él

**Decisiones:**

- **El solapamiento no se comprueba en el cliente.** Lo impone la constraint de la base;
  la capa API solo traduce el error `23P01` a "Ese horario ya está ocupado". Comprobarlo
  antes de insertar sería una carrera entre dos usuarios reservando a la vez; en la base
  es atómico.
- **El booking anónimo genera el UUID en el cliente.** `anon` tiene INSERT pero no SELECT
  sobre `patients` y `appointments`, así que no se puede encadenar `.select()` para
  recuperar la fila creada (hallazgo de 2.4). Se genera el id con `crypto.randomUUID()`
  y se devuelve.
- **Los eventos de historial no tumban la operación principal.** Si falla el insert del
  evento se registra un warning: la cita ya cambió de estado y eso es lo que importa.
- **`mensajeDeError` traduce los códigos de Postgres** (`23P01`, `23514`, `23505`, `42501`)
  y el mensaje del trigger de pacientes, para que los toasts digan algo útil.

**Verificado contra la base real (12 comprobaciones, todas en verde):**

| Prueba | Resultado |
| --- | --- |
| `services` / `doctors` legibles sin sesión | 5 y 4 filas |
| `patients` NO legibles sin sesión | 0 filas |
| `schedule` JSONB parseado | `{days:[1..5], start:"10:00", end:"18:00"}` |
| Máquina de estados (`scheduled→completed` bloqueado, etc.) | correcta |
| Booking anónimo: alta de paciente + cita | ambos creados |
| Cita solapada por booking anónimo | "Ese horario ya está ocupado para el doctor" |

### 2.6 — Migración componente por componente 🔄 EN CURSO

Orden acordado: **público → doctor → paciente → admin**.

#### Bloque 1: público ✅ (27-jul-2026)

- [x] **Landing (`index.tsx`)** — `useClinic()`, `useServices()`, `useActiveDoctors()`
- [x] **Booking (`booking.tsx`)** — servicios, doctores y huecos desde Supabase; alta de
      paciente + cita por el camino anónimo

**Problema encontrado y resuelto: el booking no podía ver los horarios ocupados.**
`anon` no puede leer `appointments` (bien: ahí hay datos de pacientes), pero el paso 3
necesita ocultar los huecos cogidos. Se añadió `doctor_busy_blocks(doctor, fecha)`
(migración `20260727120600`), una función `SECURITY DEFINER` que devuelve **solo hora de
inicio y duración** — ni paciente, ni motivo, ni estado. Es justo lo que una agenda
pública tiene que revelar para poder reservar, y nada más.

Detalle operativo: PostgREST cachea el schema, así que tras crear una función hay que
lanzar `notify pgrst, 'reload schema'` o devuelve 404.

**Regresión detectada y corregida:** las queries ordenaban por `name`, lo que dejaba
Dermatología primero en la landing. Se cambió a `created_at` en `services` y `doctors`
para conservar el orden de presentación del PRD.

**Verificado end-to-end en el navegador:**

| Prueba | Resultado |
| --- | --- |
| Landing lee clínica, servicios y doctores | desde Supabase |
| Slots del Dr. Herrera el 29-jul | `10:00 10:45 12:15 …` — sin el 11:30 (cita existente) |
| Reserva completa de los 5 pasos | cita creada en la base con su evento `created` |
| Tras reservar las 12:15, recargar | ese hueco ya no se ofrece |

#### Bloque 2: panel del doctor ✅ (27-jul-2026)

- [x] **DoctorPanel** — `useDoctorByUserId()` resuelve la ficha por `user_id`; ya no
      se coge "el primer doctor del mock"
- [x] **Mi Día** — agenda real del día + card de próximo paciente, transiciones de estado
- [x] **Consulta** — consulta activa, historial del paciente, notas con autoguardado, cobro
- [x] **Mis Pacientes** — pacientes atendidos por ese doctor, con su historial

**Autoguardado de notas con debounce.** El mock escribía en el store en cada pulsación.
Contra Supabase eso sería una petición por tecla, así que se escribe en estado local y se
persiste 900 ms después de dejar de teclear. Verificado: tras escribir una nota completa
quedó **un solo** evento `notes_added`, no uno por carácter.

**Caso límite cubierto:** una cuenta con rol `doctor` pero sin ficha vinculada (si un admin
borra el registro, o la invitación quedó a medias) ahora ve un mensaje claro en vez de una
pantalla en blanco.

**Verificado en el navegador con la cuenta de Sofía:**

| Prueba | Resultado |
| --- | --- |
| Mi Día | 11:00 María García (en consulta), 16:30 Laura Sánchez (confirmada) — sus 2 citas de hoy |
| Consulta activa | María García, 37 años, con su historial del 24-jul |
| Escribir nota clínica | persistida en `appointment_notes`, 1 sola escritura |

**Privacidad confirmada sobre datos reales.** Con una nota escrita sobre la cita de María:

| Quién | `appointment_notes` | `appointments` |
| --- | --- | --- |
| María (la paciente de esa cita) | **0 filas** | 1 fila, y ya sin columna de notas |
| Sofía (su doctora) | ve el contenido | 1 fila |

#### Bloque 3: portal del paciente ✅ (27-jul-2026)

- [x] **PatientPortal** — `usePatientByUserId()` resuelve la ficha por `user_id`
- [x] **Mis Citas** — próximas citas reales, cancelar con confirmación, reagendar
- [x] **Historial** — consultas pasadas, solo el motivo (nunca las notas del doctor)
- [x] **Pagos** — recibos reales con alerta de pendientes

**Conflicto PRD ↔ RLS resuelto (migración `20260727120700`).** El PRD dice que el paciente
puede reagendar, pero las políticas de 2.4 solo le dejaban cancelar: cualquier `UPDATE`
suyo tenía que acabar en `status = 'cancelled'`, así que el botón "Reagendar" habría
fallado siempre. Se añadió `appointments_reschedule_own` y se relajó el trigger para dejar
pasar fecha y hora. Sigue congelado lo que importa: **no puede cambiarse de doctor, ni de
servicio (ni por tanto de precio), ni tocar la cita de otro.** Y la agenda del doctor
sigue protegida por `appointments_no_overlap`.

**Regla de las 2 horas del PRD, ya implementada.** Estaba pendiente desde la Fase 1
(hueco 7 de `ESTADO.md`). El botón Cancelar se deshabilita si faltan menos de 2 h y explica
por qué. Se comprueba en cliente; el servidor todavía no la impone.

**Verificado en el navegador con la cuenta de María:**

| Prueba | Resultado |
| --- | --- |
| Mis Citas al entrar | "No tienes citas programadas" — correcto: sus 2 citas son `completed` e `in_progress` |
| Historial | su consulta del 24-jul, con el motivo pero **sin** las notas clínicas |
| Pagos | $800 pagado (efectivo) + $200 pendiente, con la alerta |
| Cita a 42 min | botón Cancelar deshabilitado + "Faltan menos de 2h" |
| Cita a 5 días | Cancelar activo → diálogo de confirmación → cancelada en la base |
| Reagendar a un hueco ocupado | "Ese horario ya está ocupado para el doctor" |
| Reagendar a un hueco libre | movida, con evento `rescheduled` |

⚠️ **Detectado:** `current_date` en Postgres (UTC) puede ir un día por delante de la fecha
local del usuario (GMT-6). Afecta a los seeds y a cualquier comparación de "hoy" entre
cliente y servidor. No es un fallo actual, pero conviene tenerlo presente.

#### Bloque 4: hub del admin ✅ (27-jul-2026)

Los 7 tabs migrados a React Query, y de paso arreglados varios bugs de `ESTADO.md`:

- [x] **Dashboard** — KPIs, gráfica de 7 días, alertas. *Ingresos del mes* ya filtra por mes
      (bug B4)
- [x] **Agenda** — vista día/semana, detalle de cita que **solo ofrece transiciones legales**
      (se leen de `transicionesValidas`, no hardcodeadas), nueva cita
- [x] **Doctores** — CRUD completo con modal en 3 secciones (Perfil / Horario / Acceso),
      selector de días real, toggle activo, borrado con confirmación, enlace de invitación
- [x] **Pacientes** — CRUD, perfil con métricas, historial, **cobros asociados** y botón
      **Crear Cita** (hueco 3), búsqueda, enlace de invitación al portal
- [x] **Cobros** — **filtro por rango de fechas** (hueco 4), cobrar pendientes, anular,
      alta manual de cobros
- [x] **Reportes** — ingresos del mes reales, tasa de no-show, doctor más activo, gráficas
- [x] **Configuración** — datos de la clínica + **servicios y precios editables** (hueco 5)

**Bugs de la auditoría cerrados aquí:** B2 (horario "L-V" hardcodeado), B4 (ingresos del
mes sumaban todo el histórico), B5 (citas "esta semana" contaban todo). B6 no se arregló:
se reetiquetó la KPI como "Pacientes" porque la capa API no expone `created_at` de
pacientes; contarlos por mes requeriría añadirlo.

**Bug nuevo encontrado y corregido (migración `20260727120800`).** La landing pintaba las
especialidades en orden aleatorio. Causa: el seed insertó cada tabla en un solo `INSERT`, y
`now()` es constante dentro de una transacción, así que los 5 servicios quedaron con el
**mismo** `created_at` — ordenar por esa columna daba un orden arbitrario en cada consulta.
Se escalonaron los timestamps según el orden del PRD.

**Verificado en el navegador con la cuenta de admin:**

| Prueba | Resultado |
| --- | --- |
| Dashboard | 1 cita hoy, 2 completadas, 1 no-show, ingresos del mes $2,000 |
| Doctores | Dra. López "L, M, J"; Dr. Díaz "M, J, V" — ya no el falso "L-V" |
| Doctores | "1 citas esta semana", no el histórico |
| Cobros | filtros de estado/doctor/rango de fechas, total $2,000 |
| Marcar cobro pagado | persistido en la base (`paid`, efectivo) — luego revertido |
| Configuración | servicios en el orden del PRD, editables |

#### Store de Zustand vaciado ✅

Ya no quedaba ningún componente leyendo del mock, así que:

- `src/lib/store.ts` reducido a solo `onboardingCompleted` (estado de UI)
- `src/lib/mock-data.ts` **eliminado**
- `src/lib/types.ts` **eliminado**; `medi-utils` ahora tipa los estados desde el enum de
  Postgres, así cliente y base no pueden divergir

`tsc --noEmit` limpio. El lint solo reporta ruido de CRLF (preexistente, Windows vs
prettier configurado a LF) y 8 warnings de `react-refresh`.

⚠️ **Corrección a lo que se afirmó en 2.2** — ✅ **resuelto el 28-jul-2026.** Ahí se dijo
que con fechas relativas a `current_date` "la demo nunca caduca". Era falso: `current_date`
se evalúa una sola vez, al insertar, así que las fechas quedaban fijas y el seed envejecía.

Resuelto con `reset_demo_data()` (migración `20260727121100`), que vuelve a anclar las 10
citas y los 3 cobros del seed sobre el día de hoy, con los estados del PRD. Se dispara
desde **Configuración → Restablecer demo**, que además recupera el "botón de reset" que
pide el PRD y que se había perdido al migrar desde el store mock.

**No borra nada.** Solo recoloca las filas del seed; las reservas hechas durante una demo
se quedan, y el diálogo de confirmación lo dice. Una función que borrase "lo que no
reconoce" sería demasiado peligrosa el día que esto corra con pacientes reales.

Verificado: antes el dashboard decía "1 cita hoy" (las de hoy habían quedado a -1 día);
después, las 3 correctas. La autorización la impone la propia función en Postgres — la
doctora y la paciente reciben *"Solo un administrador puede restablecer los datos demo"*.

#### Bloques pendientes

Cada uno pasa de `useStore()` a hooks de React Query:

- [ ] SettingsTab — clínica + servicios editables
- [ ] DoctorsTab — CRUD con modal (Perfil / Horario / Acceso), foto, toggle activo
- [ ] PatientsTab — CRUD con perfil detallado, métricas, historial, foto
- [ ] AgendaTab — crear cita, transicionar estado
- [ ] BillingTab — cobros manuales (efectivo/tarjeta/transferencia), marcar pagado, cancelar
- [ ] Dashboard — KPIs, gráfica 7 días, alertas
- [ ] ReportsTab — ingresos del mes, tasa no-show, doctor más activo
- [ ] Booking — flujo adaptativo (logueado salta datos; anónimo puede crear cuenta)
- [ ] DoctorPanel — filtrado por doctor logueado
- [ ] PatientPortal — filtrado por paciente logueado
- [ ] Landing (`index`) — queries públicas de servicios, doctores, clínica
- [ ] Onboarding
- [ ] MyDay — navegación por fecha
- [ ] Consultation — notas con autoguardado, cobro rápido, completar consulta
- [ ] MyPatientsTab / MyAppointments / HistoryTab / PaymentsTab

> Nota: varios de estos "componentes" hoy viven dentro de los archivos de ruta
> (`hub.tsx` tiene 649 líneas). Parte del trabajo es extraerlos.

### 2.7 — CRUD completo y sistema de invitación ✅ COMPLETADO (27-jul-2026)

El CRUD de doctores, pacientes y servicios se hizo en el bloque 4 de 2.6. Aquí se probó de
punta a punta el sistema de invitación, que estaba construido pero **nunca ejecutado**.

**Dos bugs encontrados al probarlo (y solo se veían probándolo):**

1. **El enlace de invitación redirigía fuera.** Si había una sesión abierta en el
   navegador, el `useEffect` de `/auth` mandaba al visitante a su panel y **nunca veía el
   formulario de registro**. Pasa en cuanto alguien abre su invitación en el ordenador de
   recepción. Ahora, con invitación en la URL, no se redirige, y se avisa de que hay otra
   sesión abierta con un botón para cerrarla.
2. **Falso aviso de "otra sesión".** Supabase abre sesión automáticamente al registrarse,
   así que el aviso del punto anterior aparecía señalando la sesión *recién creada por el
   propio usuario*. Se distingue con una marca `recienRegistrado`: si la sesión es la que
   se acaba de crear ahí, se redirige al panel en vez de avisar.

**Flujo verificado de punta a punta:**

| Paso | Resultado |
| --- | --- |
| Admin copia el enlace de un doctor sin cuenta | `/auth?invite=doctor&id=…` |
| Abrir el enlace | "Completa tu registro como doctor de la clínica" |
| Registrarse | perfil con rol `doctor` (no `patient`), clínica heredada, `user_id` vinculado |
| Enlace de paciente | igual, y al entrar Juan ve **su** cita real |

**Ataques probados, ambos bloqueados:**

| Intento | Resultado |
| --- | --- |
| Reutilizar una invitación ya usada | cuenta creada como `patient`, pero la ficha sigue apuntando al dueño original |
| Mandar `role: admin` en el metadata del signup | sale `patient` |

El primero lo impide el `user_id is null` del `UPDATE` en `handle_new_user()`; el segundo,
que el trigger ignora por completo el rol que venga del cliente.

**Cuentas demo nuevas** (creadas por el propio flujo de invitación, contraseña `demo1234`):
`carlos@doctorcita.demo` (doctor) y `juan@doctorcita.demo` (paciente).

#### Booking inteligente ✅ (28-jul-2026)

El flujo se adapta a si hay sesión, en vez de tener siempre los mismos 5 pasos.

- **Sin sesión** — 5 pasos. El de "Tus datos" incluye una casilla opcional **"Crear mi
  cuenta"** con contraseña. La cita se agenda igual si no se marca.
- **Con sesión** — 4 pasos: el de datos desaparece y se usa la ficha del paciente. El
  stepper saluda ("Hola Sofía, usamos los datos de tu cuenta") y el motivo de consulta,
  que vivía en el paso suprimido, se pide en la confirmación.

**Los pasos se nombran, no se numeran.** Con `step === 3` el flujo se rompía al quitar un
paso: los índices bailan. Ahora hay un array de ids (`"datos"`, `"confirmacion"`…) y la UI
pregunta por nombre.

**La cuenta se crea DESPUÉS de agendar, a propósito.** Si el email ya existe, el signup
falla — pero la cita ya está guardada y solo se avisa de que no se pudo crear la cuenta.
Al revés se perdería la reserva por un problema secundario.

Verificado en el navegador, los dos caminos:

| Prueba | Resultado |
| --- | --- |
| Sin sesión | 5 pasos, con la casilla de crear cuenta |
| "Continuar" con la casilla marcada y sin contraseña | deshabilitado |
| Reserva + cuenta | cita creada, perfil `patient`, ficha vinculada al `user_id` |
| Recargar ya con sesión | 4 pasos y saludo por nombre |
| Reserva autenticada | pasa por `appointments_insert_own`, no por la política de anon |

Un fallo detectado y corregido al mirar la pantalla final: el "Paciente:" salía vacío con
sesión, porque leía el formulario en lugar de la ficha.

---

<details>
<summary>Checklist original de 2.7</summary>


- [ ] Doctores: lista, detalle (perfil + horario + stats), editar, eliminar con confirmación
- [ ] Pacientes: lista con búsqueda, detalle (perfil + historial + métricas), CRUD
- [ ] Invitación por enlace: `/auth?invite=doctor|patient&id={recordId}`
  - [ ] `/auth` detecta el invite y muestra signup contextual
  - [ ] Trigger vincula `user_id` y obtiene `clinic_id` del registro
  - [ ] Badge en cards: check verde (vinculada) / icono cadena (copia el enlace)
- [ ] Booking inteligente (logueado vs anónimo)
- [ ] QA de RLS por rol

</details>

---

## Fase 3 — Funcionalidad Avanzada ⏸️ FUERA DE ALCANCE (siguiente etapa)

**No se hace ahora.** Los pagos son manuales (efectivo/tarjeta/transferencia) desde el
panel del doctor.

### 3.1 — Realtime ⏸️
- Suscripciones Supabase Realtime en agenda
- Notificación en dashboard al llegar nueva cita

### 3.2 — Storage ✅ COMPLETADO (27-jul-2026)

Migraciones: `20260727120900_storage_avatars.sql`, `20260727121000_self_profile.sql`

- [x] Bucket `avatars` público, 5 MB, solo tipos de imagen
- [x] Políticas: lectura pública (las fotos salen en la landing sin sesión), escritura solo
      con sesión
- [x] `src/lib/api/storage.ts` — subida, borrado, validación y traducción de errores
- [x] `ImageUpload` reutilizable con vista previa, estado de subida y fallback de inicial
- [x] Foto de doctor (alta y edición desde el hub)
- [x] Foto de paciente (desde el hub y desde su propio portal)
- [x] **Logo de clínica** — hizo falta añadir la columna `logo` a `clinics`
- [x] **Perfil propio**: doctor y paciente pueden cambiar su foto desde su panel

**Desde el móvil funciona.** El input usa `accept="image/*"` **sin** `capture`: así el
sistema deja elegir entre cámara y galería. Con `capture` se forzaría la cámara, que
estorba cuando la foto ya está en el carrete.

**Cada subida crea un objeto nuevo** (`<id>-<timestamp>.<ext>`) y borra el anterior. Si se
reutilizara la ruta, el CDN y el navegador seguirían sirviendo la foto vieja durante horas.
Las URLs de Unsplash del seed se ignoran al borrar: solo se limpian las propias.

**Hubo que abrir permisos, con cuidado.** `doctors` solo tenía políticas de admin, así que
un doctor no podía ni cambiar su propia foto. Se añadió `doctors_update_own` **más un
trigger** que congela nombre, especialidad, horario y estado activo: son decisiones de la
clínica, no suyas.

Verificado con la cuenta del Dr. Herrera:

| Intento | Resultado |
| --- | --- |
| Cambiar su foto y su bio | permitido |
| Ampliarse el horario | rechazado |
| Cambiarse el nombre o la especialidad | rechazado |
| Reactivarse tras ser desactivado por un admin | rechazado |

Verificado en el navegador: subida real de un PNG desde el portal del paciente → objeto en
el bucket (2.293 bytes, `image/png`) → URL guardada en la ficha → avatar visible en la
cabecera. Datos de prueba limpiados después.

### 3.3 — Edge Functions ⏸️
- Recordatorios 24h antes (Edge Function + cron)
- Webhook WhatsApp/SMS (Twilio)
- Confirmación de cita por link

### 3.4 — Pagos online ⏸️
- Stripe
- Recibos PDF

### 3.5 — Calendario externo ⏸️
- Sync con Google Calendar

---

## Fase 4 — Deploy a Producción ⬜ PENDIENTE

### 4.1 — Preparación del build ✅ (28-jul-2026)

- [x] `bun run build` pasa sin errores
- [x] **Target decidido: Vercel.** El paquete de Lovable pone `cloudflare-module` como
      `defaultPreset`; se fija `nitro: { preset: "vercel" }` en `vite.config.ts`. Dentro
      del sandbox de Lovable ellos fuerzan Cloudflare igualmente, así que su preview
      sigue funcionando.
- [x] El build genera `.vercel/output` (Build Output API v3): función SSR `__server` y
      rutas con `filesystem` + fallback al servidor
- [x] `vercel.json` fija `bun install --frozen-lockfile` y `bun run build`, para que
      Vercel no use npm teniendo un lockfile de bun
- [x] `.vercel` y `.claude` en `.gitignore`

### 4.2 — Setup del hosting 🔄

- [x] Código publicado en GitHub (`main`, commit `55da5ac`)
- [x] `.env` fuera del repositorio
- [ ] Importar el repo en Vercel y desplegar *(lo hace el dueño de la cuenta)*
- [ ] Variables de entorno en Vercel

**Solo 5 variables, y NO la `service_role`:**

```
VITE_SUPABASE_URL          VITE_SUPABASE_PROJECT_ID    VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL               SUPABASE_PUBLISHABLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` **no se pone**: nadie importa `client.server.ts` ni el
middleware de servidor — la app entera va por el cliente con RLS como frontera. Subirla
sería exponer una llave maestra sin usarla.

> ⚠️ **Las variables tienen que existir ANTES del primer build.** Se comprobó sobre el
> build real: la URL de Supabase queda **incrustada** en `static/assets/index-*.js` y en
> `functions/__server.func/`. No se leen en tiempo de ejecución. Si se despliega sin
> ellas, `client.ts` lanza "Missing Supabase environment variable(s)" y la app no arranca;
> añadirlas después **exige volver a desplegar**, no basta con reiniciar.

### 4.3 — Dominio y producción ✅ (28-jul-2026)

**En producción:** https://medios-clinic-hub.vercel.app

- [x] Deploy funcional
- [x] `site_url` y lista de redirecciones configuradas en Supabase:
      producción, previews de Vercel (`medios-clinic-hub-*.vercel.app`) y
      `localhost:8080` para desarrollo
- [x] Test E2E en producción: login de admin → dashboard con datos reales
- [ ] Dominio personalizado (opcional, pendiente)

**Incidencia del primer arranque: la clave llegó corrupta.** La app desplegaba pero
reventaba con `Failed to construct 'Headers': String contains non ISO-8859-1 code point`, y
no cargaba ni el login ni las especialidades.

Inspeccionando el bundle desplegado, el valor incrustado tenía la **longitud correcta
(208)** pero solo los **8 primeros caracteres eran reales**: los otros 200 eran `•`
(U+2022). Se había copiado desde un campo enmascarado, y se guardaron literalmente los
puntitos. Como `•` no es válido en una cabecera HTTP, **ninguna petición a Supabase llegaba
a salir**.

Aprendizaje para futuras variables: **no marcar como "Sensitive" la clave publishable.**
Es pública por diseño —viaja en el bundle del navegador— y activarlo impide verificar el
valor, que es justo lo que causó el problema.

### 4.4 — Agendar exige cuenta ✅ (28-jul-2026)

Migraciones: `20260728120000`, `20260728120100`

Cambio de producto posterior al lanzamiento: se retira la reserva anónima.

- [x] Fuera las políticas de escritura anónima sobre `appointments`, `patients` y
      `appointment_events`
- [x] `patients_insert_own`: el usuario crea su ficha con `user_id = auth.uid()`
- [x] `/booking` con pantalla de acceso y vuelta automática vía `?redirect=`
- [x] Lectura pública intacta: el landing se ve sin cuenta

**El `revoke` no funcionó a la primera.** Revocar `EXECUTE` al rol `anon` sobre las
funciones de horarios no surtió efecto: Postgres concede `EXECUTE` a `PUBLIC` al crear una
función y `anon` lo hereda. Hay que revocar a `PUBLIC` y volver a conceder solo a
`authenticated`.

Verificado en producción: sin sesión, `/booking` muestra la pantalla de acceso, y los
intentos de insertar paciente o cita por API devuelven
`violates row-level security policy`.

**Decisión de producto tomada:** `mailer_autoconfirm` se queda **activado** — no se
verifica el email. Mantiene fluido el registro desde el booking (reservar → crear cuenta →
ver tus citas, sin salir a buscar un correo). Contrapartida asumida: alguien puede
registrarse con un email que no es suyo.

---

## Arquitectura objetivo

| Capa | Tecnología |
|---|---|
| Frontend | TanStack Start (SSR) + React 19 + TypeScript + Vite 8 |
| UI | Tailwind 4 + shadcn/ui + Radix |
| Estado servidor | React Query (TanStack Query) |
| Estado UI | Zustand (solo `onboardingCompleted`) |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| Gráficas | Recharts |
| Deploy | Por definir (Nitro → Cloudflare / Vercel / Node) |

## Usuarios demo (a crear en Fase 2.3)

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@medios.demo` | `demo1234` |
| Doctor (Sofía) | `sofia@medios.demo` | `demo1234` |
| Paciente (María) | `maria@medios.demo` | `demo1234` |

## Orden de ejecución

| Paso | Qué se hace | Estado |
|---|---|---|
| 1 | Setup Supabase + schema + seed (migraciones) | ⬜ |
| 2 | Auth real + usuarios demo | ⬜ |
| 3 | RLS completo (todos los roles) | ⬜ |
| 4 | Capa de datos API (React Query) | ⬜ |
| 5 | Migrar todos los componentes | ⬜ |
| 6 | CRUD doctores + pacientes + servicios | ⬜ |
| 7 | Sistema de invitación por enlace | ⬜ |
| 8 | Storage (fotos) | ⬜ |
| 9 | Booking inteligente (logueado/anónimo) | ⬜ |
| 10 | QA de RLS y flujos | ⬜ |
| 11 | Build + deploy | ⬜ |
