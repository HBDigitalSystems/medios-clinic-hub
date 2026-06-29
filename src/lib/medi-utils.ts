import type { AppointmentStatus } from "./types";

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

export const todayISO = () => new Date().toISOString().slice(0, 10);

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
