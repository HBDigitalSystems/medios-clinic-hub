# DoctorCita Clinica

> Tu clinica. Tus datos. Tu sistema.

Sistema de gestion para clinicas medicas: agendamiento de citas, gestion de pacientes,
cobros y reportes operativos, con tres roles (admin, doctor, paciente).

Los EHR tradicionales cuestan $300-$800/mes por doctor, tienen interfaces obsoletas y
cobran por exportar tus propios datos. DoctorCita es la alternativa: simple, rapida, y los
datos son tuyos.

---

## Stack

| Capa | Tecnologia |
| --- | --- |
| Framework | TanStack Start (SSR) + React 19 + TypeScript |
| Build | Vite 8 |
| Routing | TanStack Router (file-based, `src/routes/`) |
| Estado de servidor | TanStack Query (React Query) |
| Estado de UI | Zustand (solo `onboardingCompleted`) |
| UI | Tailwind CSS 4 + shadcn/ui + Radix |
| Backend | Supabase (Postgres 17 + Auth + RLS) |
| Graficas | Recharts |
| Paquetes | bun |

## Arranque rapido

```bash
bun install
cp .env.example .env     # rellena con tus credenciales de Supabase
bun run dev              # http://localhost:8080
```

Scripts disponibles:

| Comando | Que hace |
| --- | --- |
| `bun run dev` | Servidor de desarrollo en el puerto 8080 |
| `bun run build` | Build de produccion |
| `bun run preview` | Sirve el build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Variables de entorno

Copia `.env.example` a `.env`. Las encuentras en Supabase → Project Settings → API.

Las que llevan prefijo `VITE_` **se inyectan en el bundle del navegador**: son publicas por
diseno, y la seguridad real la dan las politicas RLS. Las que no lo llevan son de servidor.

> `SUPABASE_SERVICE_ROLE_KEY` se salta **todas** las politicas RLS. Nunca le pongas el
> prefijo `VITE_` ni la subas al repositorio. `.env` esta en `.gitignore`.

## Rutas

| Ruta | Acceso | Contenido |
| --- | --- | --- |
| `/` | Publico | Landing de la clinica |
| `/booking` | Publico | Reserva en 5 pasos, sin necesidad de cuenta |
| `/auth` | Publico | Login y registro |
| `/hub` | Admin | Dashboard, Agenda, Doctores, Pacientes, Cobros, Reportes, Configuracion |
| `/doctor` | Doctor | Mi Dia, Consulta, Mis Pacientes |
| `/patient` | Paciente | Mis Citas, Historial, Pagos |

Cada panel organiza su contenido en tabs internos; no hay mas rutas.

## Estructura

```
src/
  routes/                 Rutas (file-based routing)
  lib/
    api/                  Capa de datos: un modulo por entidad, sobre React Query
      types.ts            Tipos de dominio + mapeo snake_case <-> camelCase
      shared.ts           Claves de query + traduccion de errores de Postgres
      clinic.ts  services.ts  doctors.ts  patients.ts
      appointments.ts  notes.ts  invoices.ts
    auth.tsx              AuthProvider y useAuth
    store.ts              Zustand: solo estado de UI
    medi-utils.ts         Formateo, slots de horario, solapamientos
  components/
    auth/                 ProtectedRoute (guard por rol)
    ui/                   shadcn/ui
  integrations/supabase/  Cliente, cliente de servidor, middleware, tipos generados
supabase/migrations/      Schema versionado
docs/                     PRD, roadmap y auditoria de estado
```

## Base de datos

8 tablas: `clinics`, `profiles`, `services`, `doctors`, `patients`, `appointments`,
`appointment_notes`, `appointment_events`, `invoices`.

Las migraciones viven en `supabase/migrations/` y se aplican con la Management API o con el
CLI de Supabase.

Regenerar los tipos despues de tocar el schema:

```bash
supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts
```

### Dos decisiones que conviene conocer

**Las notas clinicas viven en su propia tabla.** RLS filtra filas, no columnas: si
`clinical_notes` estuviera dentro de `appointments`, cualquier paciente que leyera su cita
leeria tambien las notas privadas de su doctor. Y los grants por columna no sirven, porque
doctor y paciente son el mismo rol de Postgres (`authenticated`). Por eso existe
`appointment_notes`, con politicas solo para admin y para el doctor de esa cita.

**El solapamiento de citas lo impone la base.** La constraint `appointments_no_overlap`
(`EXCLUDE USING gist`) impide que un doctor tenga dos citas cuyos bloques se pisen. Las
canceladas y los no-show liberan el horario. No se comprueba en el cliente a proposito:
seria una carrera entre dos personas reservando a la vez.

## Seguridad

- **RLS activo en las 8 tablas.** Ninguna consulta llega sin pasar por una politica.
- **El rol nunca se acepta desde el cliente.** `raw_user_meta_data` lo controla quien se
  registra, asi que el trigger `handle_new_user()` lo ignora: un signup publico siempre
  sale `patient`. El rol `doctor` solo se concede con una invitacion valida a un registro
  sin cuenta vinculada. `admin` se asigna a mano.
- **El paciente solo puede cancelar o reagendar.** Una politica `UPDATE` no puede comparar
  la fila nueva con la vieja, asi que un trigger congela doctor, servicio, duracion y
  clinica: no se puede colar un cambio de precio dentro de un "cancelar".
- **El booking publico no lee datos de pacientes.** Los horarios ocupados se consultan con
  la funcion `doctor_busy_blocks()`, que devuelve solo hora de inicio y duracion.

## Cuentas demo

| Rol | Email | Password |
| --- | --- | --- |
| Admin | `admin@doctorcita.demo` | `demo1234` |
| Doctor | `sofia@doctorcita.demo` | `demo1234` |
| Paciente | `maria@doctorcita.demo` | `demo1234` |

> Son cuentas de demostracion sobre datos ficticios. No las reutilices en produccion.

## Estado

- **Fase 1** — UI completa con las 6 rutas y los 13 tabs. Pendiente el wizard de
  onboarding y algun bug menor.
- **Fase 2** — Supabase completo: schema, auth real, RLS, capa de datos y todos los
  componentes migrados. Pendiente el sistema de invitacion por enlace (2.7).
- **Fase 3** — Realtime, Storage, notificaciones WhatsApp/SMS, pagos online. Fuera del
  alcance actual.
- **Fase 4** — Deploy. Sin decidir el target: el proyecto es SSR con Nitro, no un SPA.

Detalle en [`docs/ROADMAP.md`](docs/ROADMAP.md). El alcance funcional esta en
[`docs/PRD.md`](docs/PRD.md) y la auditoria de lo que falta en
[`docs/ESTADO.md`](docs/ESTADO.md).

## Nota sobre Lovable

Este proyecto esta conectado a [Lovable](https://lovable.dev). Los commits que se empujan a
la rama conectada se sincronizan con el editor, asi que conviene mantenerla en un estado
que funcione y **no reescribir historia publicada** (nada de force push, rebase o squash
sobre commits ya empujados).
