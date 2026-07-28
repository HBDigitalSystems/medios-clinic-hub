// Los estados salen del enum de Postgres, para que no puedan divergir
import type { AppointmentStatus } from "./api/types";

export const statusLabel: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En consulta",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistio",
};

export const statusBadgeClass: Record<AppointmentStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700 border border-blue-200",
  confirmed: "bg-blue-600 text-white",
  in_progress: "bg-amber-100 text-amber-700 border border-amber-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled: "bg-slate-200 text-slate-600 border border-slate-300",
  no_show: "bg-rose-100 text-rose-700 border border-rose-200",
};

export const invoiceBadgeClass: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  cancelled: "bg-slate-200 text-slate-600 border border-slate-300",
};

export const doctorColor = (id: string) => {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
};

export const formatMoney = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

/**
 * Fecha YYYY-MM-DD en la zona horaria del usuario.
 *
 * NO usar `toISOString()` para esto: devuelve la fecha en UTC. En Mexico
 * (GMT-6) a partir de las 18:00 la app creeria que ya es el dia siguiente,
 * y en Europa (GMT+2) el calendario marcaria el dia anterior. Para
 * "hoy", "manana" o el dia de una cita, lo que importa es la fecha local.
 */
export const isoLocal = (d: Date) => {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export const todayISO = () => isoLocal(new Date());

/** Hora actual como "HH:mm", para comparar con los slots del dia. */
export const horaActual = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
};

export const formatDateLong = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

export const ageFromBirth = (birth: string) => {
  const b = new Date(birth);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const NOMBRES_DIA = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Horario legible a partir del schedule del doctor.
 * Antes se pintaba "L-V" fijo, que era falso para quien no trabaja
 * de lunes a viernes (bug B2 de ESTADO.md).
 */
export const formatSchedule = (days: number[], start: string, end: string) => {
  if (days.length === 0) return "Sin horario";
  const ordenados = [...days].sort((a, b) => a - b);
  const consecutivos = ordenados.every((d, i) => i === 0 || d === ordenados[i - 1] + 1);
  const etiqueta =
    consecutivos && ordenados.length > 2
      ? `${NOMBRES_DIA[ordenados[0] - 1]}-${NOMBRES_DIA[ordenados[ordenados.length - 1] - 1]}`
      : ordenados.map((d) => NOMBRES_DIA[d - 1]).join(", ");
  return `${etiqueta} ${start} - ${end}`;
};

/** Primer dia del mes actual, en YYYY-MM-DD. */
export const inicioDeMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/** Lunes de la semana actual, en YYYY-MM-DD local. */
export const inicioDeSemana = () => {
  const d = new Date();
  const diaDeLaSemana = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - diaDeLaSemana);
  return isoLocal(d);
};

/** Suma dias a una fecha YYYY-MM-DD, sin salirse de la zona local. */
export const sumarDias = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoLocal(d);
};

/** "09:30" -> 570 */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Una cita ocupa el bloque [inicio, inicio + duracion). Dos bloques chocan si se
 * traslapan aunque no empiecen a la misma hora.
 */
export const rangesOverlap = (startA: string, durationA: number, startB: string, durationB: number) => {
  const a = toMinutes(startA);
  const b = toMinutes(startB);
  return a < b + durationB && b < a + durationA;
};

/** Canceladas y no-shows liberan el horario. */
export const blocksAgenda = (status: AppointmentStatus) => status !== "cancelled" && status !== "no_show";

export const generateTimeSlots = (start: string, end: string, duration: number) => {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins + duration <= endMins) {
    slots.push(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
    mins += duration;
  }
  return slots;
};
