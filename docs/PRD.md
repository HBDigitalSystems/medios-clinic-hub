# MediOS — Sistema de Gestión para Clínicas

> PRD de la **Fase 1**: aplicación 100% navegable con datos mock en memoria.
> Estado de implementación verificado: ver [ESTADO.md](./ESTADO.md).
> Plan hacia producción: ver [ROADMAP.md](./ROADMAP.md).

Aplicación web para gestionar el ciclo completo de una clínica médica: agendamiento de
citas, gestión de pacientes, cobros y reportes operativos.

La aplicación debe ser 100% navegable utilizando datos mock en memoria.

En fases posteriores se integrará:

- Supabase para persistencia de datos
- Autenticación real de usuarios
- Notificaciones WhatsApp / SMS (recordatorios de cita)
- Pagos online
- Integración con calendarios externos

## Contexto del negocio

MediOS es el sistema operativo interno de una clínica médica moderna.

Los EHR (Electronic Health Records) tradicionales cuestan $300-$800/mes por doctor, tienen
interfaces obsoletas, cobran miles de dólares por exportar tus datos y obligan a los
doctores a pasar más tiempo frente a la computadora que con sus pacientes.

MediOS es la alternativa: simple, rápido, y los datos son tuyos.

**Tagline:** `MediOS - Tu clínica. Tus datos. Tu sistema.`

## Objetivo

Implementar el flujo completo de una cita médica para tres roles:

`Admin/Gestor -> Doctor -> Paciente`

Flujo operativo:

1. Paciente agenda cita (link público o admin la crea).
2. Sistema envía recordatorio 24h antes (placeholder).
3. Paciente llega, doctor lo atiende.
4. Doctor registra notas de la consulta.
5. Admin/Doctor cobra la consulta.
6. La cita se marca como completada.

## Requisitos generales

- Todo debe funcionar solo con frontend y estado mock.
- Usar store global reactivo.
- Persistir datos en `localStorage`.
- Incluir botón de reset para volver al estado inicial de demo.
- Validar transiciones de estado.
- Mostrar feedback visual con toast en acciones importantes.
- Diseño responsive mobile y desktop.
- Interfaz moderna para salud: limpia, confiable, profesional.
- Paleta: azul médico `#2563EB`, blanco `#FFFFFF`, gris claro `#F8FAFC`,
  verde éxito `#22C55E`, rojo alerta `#EF4444`.

## Arquitectura de rutas y navegación

**IMPORTANTE:** Esta app usa POCAS rutas con TABS internos. Cada tab debe ser una vista
limpia con UNA sola responsabilidad. No apilar múltiples secciones verticalmente en una
misma vista. Cada tab ocupa todo el espacio disponible.

### Rutas

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/` | Público | Landing de la clínica |
| `/booking` | Público | Flujo de agendamiento paso a paso |
| `/auth` | Público | Login mock con selector de rol |
| `/hub` | Admin | Panel administrativo con tabs |
| `/doctor` | Doctor | Panel del doctor con tabs |
| `/patient` | Paciente | Portal del paciente con tabs |

**NO crear rutas adicionales.** Todo el contenido vive dentro de tabs en las 3 rutas
principales (`/hub`, `/doctor`, `/patient`).

### Navegación por tabs

#### `/hub` — Panel Admin

Sidebar izquierdo fijo con iconos + labels.

| Tab | Icono | Contenido |
| --- | --- | --- |
| Dashboard | LayoutDashboard | KPIs, gráfica, alertas |
| Agenda | Calendar | Calendario global de todos los doctores |
| Doctores | UserCog | Lista, agregar, editar horarios |
| Pacientes | Users | Buscar, ver perfil, historial |
| Cobros | CreditCard | Tabla de cobros con filtros |
| Reportes | BarChart3 | Métricas e ingresos |
| Configuración | Settings | Datos de la clínica |

Layout: sidebar (64px colapsado / 240px expandido) + área principal. En mobile se colapsa
a bottom nav con iconos.

#### `/doctor` — Panel Doctor

Tabs superiores (horizontal tab bar):

| Tab | Contenido |
| --- | --- |
| Mi Día | Agenda del día + card próximo paciente |
| Consulta | Vista de consulta activa (notas, perfil paciente, cobro) |
| Mis Pacientes | Lista de pacientes atendidos, con historial |

En mobile los tabs son swipeables.

#### `/patient` — Portal Paciente

| Tab | Contenido |
| --- | --- |
| Mis Citas | Próximas citas + botón agendar nueva |
| Historial | Consultas pasadas |
| Pagos | Recibos y estado de pagos |

## Landing (`/`)

- Hero: nombre de la clínica + tagline + botón "Agendar Cita" grande
- Sección especialidades: cards con icono, nombre, descripción breve
- Sección doctores: cards con foto, nombre, especialidad
- Sección "Por qué MediOS": 3 cards (tus datos son tuyos, sin contratos, simple de usar)
- Testimonios mock de pacientes (3 cards con foto, nombre, texto)
- Footer con datos de contacto

Para imágenes usar URLs de Unsplash con búsquedas como "doctor portrait", "modern clinic",
"dental office". No usar placeholders genéricos.

## Booking público (`/booking`)

Flujo paso a paso con stepper visual (barra de progreso arriba):

**Paso 1 — Especialidad.** Cards grandes con icono y nombre. Click selecciona y avanza.

**Paso 2 — Doctor.** Cards con foto, nombre, especialidad, **próximos 3 horarios
disponibles**. Click selecciona y avanza.

**Paso 3 — Fecha y hora.** Calendario visual a la izquierda. Slots de hora como botones a
la derecha. Días sin disponibilidad deshabilitados. Horarios ocupados no se muestran.

**Paso 4 — Datos del paciente.** Formulario: nombre, teléfono, email, motivo de consulta.

**Paso 5 — Confirmación.** Resumen completo. Botón "Confirmar Cita". Al confirmar: toast
de éxito + pantalla de confirmación con detalle.

Botón "Atrás" en cada paso. **No permitir agendar en el pasado.**

## Auth (`/auth`)

Pantalla centrada con card de login. Selector visual de rol (3 cards grandes):

- Admin (icono Shield) — "Gestiona la clínica"
- Doctor (icono Stethoscope) — "Atiende pacientes"
- Paciente (icono User) — "Agenda y consulta"

Click en rol + botón "Entrar" redirige a la ruta correspondiente.

## Panel Admin — `/hub`

### Tab: Dashboard

Fila superior de 5 KPI cards:

- Citas hoy (Calendar)
- Completadas (CheckCircle)
- No-shows (XCircle)
- Ingresos hoy (DollarSign)
- Pacientes nuevos (UserPlus)

Debajo:
- Gráfica de barras: citas por día (últimos 7 días)
- Lista de alertas: citas sin confirmar, cobros pendientes

### Tab: Agenda

Vista de calendario por día o semana (toggle). Citas de todos los doctores con código de
color por doctor.

Click en cita abre modal con detalle completo y botones de acción según estado (confirmar,
cancelar, marcar no-show).

Botón "Nueva Cita" abre modal con formulario rápido (paciente, doctor, fecha, hora, servicio).

### Tab: Doctores

Grid de cards con: foto, nombre, especialidad, estado (activo/inactivo) con toggle, horario
resumido, stats (citas esta semana, no-shows).

Botón "Agregar Doctor" abre modal con formulario (nombre, especialidad, **horario por
día**, foto URL).

**Click en doctor abre detalle con edición de horarios.**

### Tab: Pacientes

Barra de búsqueda prominente (por nombre o teléfono).

Tabla con: nombre, teléfono, última visita, balance pendiente.

Click en paciente abre perfil con: datos personales, historial de citas, **cobros
asociados**, botón **"Crear Cita" para este paciente**.

### Tab: Cobros

Tabla: fecha, paciente, doctor, servicio, monto, estado (badge paid verde / pending
amarillo / cancelled rojo), método de pago.

Filtros: estado, **rango de fechas**, doctor.

### Tab: Reportes

4 cards de métricas:
- Ingresos del mes
- Tasa de no-show (%)
- Doctor más activo
- Horario más demandado

Debajo:
- Gráfica de barras: ingresos por semana (último mes)
- Gráfica circular: completadas vs no-shows vs canceladas

### Tab: Configuración

Formulario editable: nombre de la clínica, dirección, teléfono, email, horario de atención
(apertura, cierre), **duración default por especialidad**.

Botón "Guardar" con toast de confirmación.

## Panel Doctor — `/doctor`

### Tab: Mi Día

**Superior:** Card destacada "Próximo Paciente" — nombre, edad, motivo, hora, historial
breve, botón "Iniciar Consulta" (→ `in_progress`, lleva a tab Consulta).

**Inferior:** Lista cronológica del día. Cada cita como card horizontal: hora, paciente,
motivo, badge de estado, acción según estado.

### Tab: Consulta

Muestra la consulta activa (`in_progress`). Si no hay: "No hay consulta en curso. Inicia
una desde Mi Día."

Layout 2 columnas en desktop, 1 en mobile:

**Izquierda — Paciente:** nombre, edad, teléfono, email; historial de consultas anteriores.

**Derecha — Consulta actual:** servicio y motivo; textarea "Notas de la consulta"
(autoguardado); botón "Completar Consulta" (→ `completed`); botón "Cobrar".

**Modal de cobro rápido:** monto prellenado con precio del servicio, selector de método
(efectivo/tarjeta/transferencia), notas opcionales, "Confirmar Cobro" → crea cobro `paid`
+ toast.

### Tab: Mis Pacientes

Lista de pacientes que este doctor ha atendido: nombre, última visita, total de consultas.
Click abre perfil con historial (solo consultas de este doctor).

## Portal Paciente — `/patient`

### Tab: Mis Citas

Botón "Agendar Nueva Cita" (→ `/booking`).

Lista de próximas citas (`scheduled` o `confirmed`). Card por cita: doctor (nombre + foto),
especialidad, fecha y hora, badge de estado, botón "Cancelar" (**abre confirmación**),
botón "Reagendar".

Si no hay citas: "No tienes citas programadas" + botón agendar.

### Tab: Historial

Consultas pasadas (`completed`, `cancelled`, `no_show`): fecha, doctor, especialidad,
estado final, resumen breve (motivo — **NO notas internas del doctor**).

### Tab: Pagos

Recibos: fecha, monto, estado (paid/pending), método, servicio asociado.
Si hay pendientes: alerta arriba "Tienes pagos pendientes".

## Onboarding (primera vez)

Al entrar como Admin por primera vez (flag `onboarding_completed` en localStorage), mostrar
wizard modal de pantalla completa:

- **Paso 1**: Nombre de la clínica + dirección + teléfono
- **Paso 2**: Agregar primer doctor (nombre, especialidad, horario)
- **Paso 3**: Definir servicios y precios (tabla editable)
- **Paso 4**: "Tu clínica está lista" + botón "Ir al Dashboard"

Stepper visual arriba. Al completar, guardar flag y redirigir a `/hub`.

## Sistema de roles

**Admin / Gestor** — acceso completo: agenda de todos los doctores, crear/editar/cancelar
citas, gestionar doctores y pacientes, ver y generar cobros, reportes, configuración.

**Doctor** — sus citas asignadas, perfil de sus pacientes, notas clínicas (solo las suyas),
cobro rápido, su agenda y disponibilidad.

**Paciente** — agendar citas, ver próximas citas, cancelar o reagendar, historial de
consultas (sin notas internas), recibos de pago.

## Entidades principales

**Servicios/Especialidades:** id, nombre, duración (min), precio, descripción corta, icono (Lucide).

**Doctores:** id, nombre completo, especialidad_id, foto (Unsplash), horario disponible
(días + rango de horas), activo (bool), bio corta.

**Pacientes:** id, nombre completo, teléfono, email, fecha de nacimiento, historial de citas,
balance pendiente (calculado).

**Citas:** id, paciente_id, doctor_id, servicio_id, fecha, hora, duración, estado, motivo,
notas clínicas (solo doctor y admin), eventos.

**Cobros:** id, cita_id, paciente_id, monto, estado, método de pago, fecha de pago, notas.

## Estados de cita

`scheduled` · `confirmed` · `in_progress` · `completed` · `cancelled` · `no_show`

Colores de badge: scheduled azul · confirmed azul oscuro · in_progress amarillo ·
completed verde · cancelled gris · no_show rojo.

## Transiciones de estado

Válidas:

- `scheduled -> confirmed`
- `scheduled -> cancelled`
- `scheduled -> no_show`
- `confirmed -> in_progress`
- `confirmed -> cancelled`
- `confirmed -> no_show`
- `in_progress -> completed`

Transiciones inválidas deben bloquearse y mostrar toast de error.

## Eventos de cita

```json
[
  { "tipo": "created",          "timestamp": "..." },
  { "tipo": "reminder_sent",    "timestamp": "..." },
  { "tipo": "confirmed",        "timestamp": "..." },
  { "tipo": "in_progress",      "timestamp": "..." },
  { "tipo": "notes_added",      "timestamp": "..." },
  { "tipo": "completed",        "timestamp": "..." },
  { "tipo": "invoice_created",  "timestamp": "..." }
]
```

## Reglas de negocio

- Una cita debe tener paciente, doctor, servicio y horario disponible.
- Un doctor no puede tener dos citas simultáneas.
- **La duración del servicio determina el bloque de agenda ocupado.**
- No se deben mostrar horarios ocupados en el flujo de reserva.
- La cita solo puede marcarse como completada si pasó por `in_progress`.
- El cobro se genera al completar la consulta o manualmente por admin.
- **Un paciente puede cancelar hasta 2 horas antes de la cita (mock).**
- Notas clínicas del doctor NO son visibles para el paciente.

## Datos mock iniciales

**Clínica:** Clínica MediOS Demo · Av. Reforma 500, Col. Centro, Ciudad de México ·
+52 55 1234 5678 · Lunes a Viernes 9:00–19:00

### Doctores

| id | Nombre | Especialidad | Horario |
| --- | --- | --- | --- |
| `doc_01` | Dra. Sofía Martínez | Medicina General | L–V 9:00–17:00 |
| `doc_02` | Dr. Carlos Herrera | Odontología | L–V 10:00–18:00 |
| `doc_03` | Dra. Ana López | Pediatría | L, M, J 9:00–14:00 |
| `doc_04` | Dr. Roberto Díaz | Dermatología | M, J, V 11:00–19:00 |

### Pacientes

| id | Nombre | Edad | Teléfono |
| --- | --- | --- | --- |
| `pac_01` | María García | 35 | 5512345001 |
| `pac_02` | Juan Rodríguez | 28 | 5512345002 |
| `pac_03` | Laura Sánchez | 42 | 5512345003 |
| `pac_04` | Pedro González | 55 | 5512345004 |
| `pac_05` | Ana Torres | 8 (pediatría) | 5512345005 |

### Especialidades

| Especialidad | Duración | Precio | Icono |
| --- | --- | --- | --- |
| Medicina General | 30 min | $800 MXN | Stethoscope |
| Odontología | 45 min | $1,200 MXN | SmilePlus |
| Pediatría | 30 min | $900 MXN | Baby |
| Dermatología | 30 min | $1,000 MXN | Scan |
| Nutrición | 45 min | $700 MXN | Apple |

### Citas iniciales (10)

- 3 en `scheduled` (próximos días)
- 2 en `confirmed` (hoy)
- 2 en `completed` (días pasados, con notas clínicas y cobro asociado)
- 1 en `in_progress` (ahora mismo, `doc_01` con `pac_01`)
- 1 en `no_show` (ayer)
- 1 en `cancelled`

### Cobros iniciales

- 2 cobros `paid` asociados a citas completed (uno efectivo, uno tarjeta)
- 1 cobro `pending` asociado a una cita completed

## UX

- Badges de estado claros con los colores definidos.
- Toast en cada acción (crear, editar, cancelar, cobrar).
- Responsive mobile first.
- Cards con bordes suaves y sombra sutil.
- Tabs limpios, sin contenido apilado. Cada tab ocupa todo el espacio disponible.
- Transiciones suaves entre tabs.
- Calendario visual limpio; slots de hora como botones seleccionables con hover.
- Mobile: sidebar del hub → bottom navigation; tabs horizontales swipeables.

## Objetivo final

Construir una aplicación web completamente navegable que permita ejecutar el flujo completo
de una cita médica usando datos mock en memoria.

La app debe verse como un producto real, no como un prototipo. El nivel de pulido debe ser
suficiente para mostrar en un video de YouTube y para que un doctor diga "esto lo quiero
para mi clínica".

## Restricciones técnicas

- No implementar backend real.
- No depender de APIs externas.
- No dejar pantallas vacías. Todas las tabs deben tener datos mock visibles.
- Incluir datos seed y navegación funcional entre todas las rutas y tabs.
- Cualquier acción importante debe reflejarse en la UI inmediatamente.
- NO crear rutas adicionales fuera de las 6 definidas.
- NO apilar secciones largas verticalmente dentro de un tab.

## Lo que viene después (NO implementar ahora)

- Supabase (auth + DB + edge functions)
- Notificaciones WhatsApp vía Twilio o API directa
- Recordatorios automáticos (edge function + cron)
- Pagos con Stripe
- Expediente clínico completo (historial médico, alergias, medicamentos)
- Integración con Google Calendar
- Multi-sucursal
