export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia";
export type InvoiceStatus = "pending" | "paid" | "cancelled";
export type Role = "admin" | "doctor" | "patient";

export interface Specialty {
  id: string;
  name: string;
  duration: number; // minutes
  price: number; // MXN
  description: string;
  icon: string;
}

export interface DoctorSchedule {
  days: number[]; // 1=Mon..5=Fri
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface Doctor {
  id: string;
  name: string;
  specialtyId: string;
  photo: string;
  schedule: DoctorSchedule;
  active: boolean;
  bio: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthDate: string; // ISO
}

export interface AppointmentEvent {
  type: string;
  timestamp: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialtyId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number;
  status: AppointmentStatus;
  reason: string;
  clinicalNotes: string;
  events: AppointmentEvent[];
}

export interface Invoice {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  status: InvoiceStatus;
  method: PaymentMethod | null;
  paidAt: string | null;
  notes: string;
  createdAt: string;
}

export interface ClinicConfig {
  name: string;
  address: string;
  phone: string;
  email: string;
  openTime: string;
  closeTime: string;
}
