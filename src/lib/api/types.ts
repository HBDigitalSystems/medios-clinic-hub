/**
 * Tipos de dominio de la app y traduccion desde/hacia las filas de Supabase.
 *
 * La base habla snake_case; la app, camelCase. La frontera esta aqui: ningun
 * componente deberia ver un `appointment_date` ni un `duration_minutes`.
 *
 * Convive temporalmente con src/lib/types.ts, que es el de los datos mock.
 * Ese desaparece al terminar la fase 2.6.
 */
import type { Database } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];
export type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type AppRole = Database["public"]["Enums"]["app_role"];

// ---------------------------------------------------------------------------
// Clinica
// ---------------------------------------------------------------------------
export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
  logo: string | null;
}

export const toClinic = (r: Row<"clinics">): Clinic => ({
  id: r.id,
  name: r.name,
  address: r.address,
  phone: r.phone,
  email: r.email,
  openTime: hhmm(r.open_time),
  closeTime: hhmm(r.close_time),
  logo: r.logo,
});

// ---------------------------------------------------------------------------
// Servicio / especialidad
// ---------------------------------------------------------------------------
export interface Service {
  id: string;
  clinicId: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  icon: string;
  active: boolean;
}

export const toService = (r: Row<"services">): Service => ({
  id: r.id,
  clinicId: r.clinic_id,
  name: r.name,
  duration: r.duration_minutes,
  price: Number(r.price),
  description: r.description,
  icon: r.icon,
  active: r.active,
});

// ---------------------------------------------------------------------------
// Doctor
// ---------------------------------------------------------------------------
export interface DoctorSchedule {
  /** 1 = lunes ... 7 = domingo */
  days: number[];
  start: string;
  end: string;
}

export interface Doctor {
  id: string;
  clinicId: string;
  userId: string | null;
  serviceId: string | null;
  name: string;
  photo: string;
  schedule: DoctorSchedule;
  active: boolean;
  bio: string;
}

const HORARIO_POR_DEFECTO: DoctorSchedule = { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" };

/** El schedule es JSONB, asi que puede llegar con cualquier forma. */
export function toSchedule(value: unknown): DoctorSchedule {
  if (!value || typeof value !== "object") return HORARIO_POR_DEFECTO;
  const v = value as Record<string, unknown>;
  const days = Array.isArray(v.days) ? v.days.filter((d): d is number => typeof d === "number") : null;
  return {
    days: days && days.length > 0 ? days : HORARIO_POR_DEFECTO.days,
    start: typeof v.start === "string" ? v.start : HORARIO_POR_DEFECTO.start,
    end: typeof v.end === "string" ? v.end : HORARIO_POR_DEFECTO.end,
  };
}

export const toDoctor = (r: Row<"doctors">): Doctor => ({
  id: r.id,
  clinicId: r.clinic_id,
  userId: r.user_id,
  serviceId: r.service_id,
  name: r.name,
  photo: r.photo,
  schedule: toSchedule(r.schedule),
  active: r.active,
  bio: r.bio,
});

// ---------------------------------------------------------------------------
// Paciente
// ---------------------------------------------------------------------------
export interface Patient {
  id: string;
  clinicId: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string;
  birthDate: string | null;
  photo: string | null;
}

export const toPatient = (r: Row<"patients">): Patient => ({
  id: r.id,
  clinicId: r.clinic_id,
  userId: r.user_id,
  name: r.name,
  phone: r.phone,
  email: r.email,
  birthDate: r.birth_date,
  photo: r.photo,
});

// ---------------------------------------------------------------------------
// Cita
//
// Ojo: las notas clinicas NO viven aqui. Estan en `appointment_notes`, con su
// propio RLS, porque el paciente no debe poder leerlas. Ver api/notes.ts.
// ---------------------------------------------------------------------------
export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  serviceId: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  duration: number;
  status: AppointmentStatus;
  reason: string;
}

export const toAppointment = (r: Row<"appointments">): Appointment => ({
  id: r.id,
  clinicId: r.clinic_id,
  patientId: r.patient_id,
  doctorId: r.doctor_id,
  serviceId: r.service_id,
  date: r.appointment_date,
  time: hhmm(r.start_time),
  duration: r.duration_minutes,
  status: r.status,
  reason: r.reason,
});

// ---------------------------------------------------------------------------
// Evento de cita
// ---------------------------------------------------------------------------
export interface AppointmentEvent {
  id: string;
  appointmentId: string;
  type: string;
  createdAt: string;
}

export const toEvent = (r: Row<"appointment_events">): AppointmentEvent => ({
  id: r.id,
  appointmentId: r.appointment_id,
  type: r.type,
  createdAt: r.created_at,
});

// ---------------------------------------------------------------------------
// Cobro
// ---------------------------------------------------------------------------
export interface Invoice {
  id: string;
  clinicId: string;
  appointmentId: string | null;
  patientId: string;
  amount: number;
  status: InvoiceStatus;
  method: PaymentMethod | null;
  paidAt: string | null;
  notes: string;
  createdAt: string;
}

export const toInvoice = (r: Row<"invoices">): Invoice => ({
  id: r.id,
  clinicId: r.clinic_id,
  appointmentId: r.appointment_id,
  patientId: r.patient_id,
  amount: Number(r.amount),
  status: r.status,
  method: r.method,
  paidAt: r.paid_at,
  notes: r.notes,
  createdAt: r.created_at,
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
/** Postgres devuelve `time` como "09:00:00"; la app usa "09:00". */
export function hhmm(t: string): string {
  return t.slice(0, 5);
}
