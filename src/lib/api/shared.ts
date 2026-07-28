import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Claves de React Query, centralizadas para poder invalidar por prefijo.
 * Ej: invalidar ["appointments"] refresca listas y detalles a la vez.
 */
export const qk = {
  clinic: ["clinic"] as const,

  services: ["services"] as const,
  service: (id: string) => ["services", id] as const,

  doctors: ["doctors"] as const,
  doctor: (id: string) => ["doctors", id] as const,
  doctorByUser: (userId: string) => ["doctors", "by-user", userId] as const,

  patients: ["patients"] as const,
  patient: (id: string) => ["patients", id] as const,
  patientByUser: (userId: string) => ["patients", "by-user", userId] as const,

  appointments: ["appointments"] as const,
  appointment: (id: string) => ["appointments", id] as const,
  appointmentEvents: (id: string) => ["appointments", id, "events"] as const,
  appointmentNote: (id: string) => ["appointments", id, "note"] as const,

  invoices: ["invoices"] as const,
  invoice: (id: string) => ["invoices", id] as const,
};

/** Violacion de constraint EXCLUDE: dos citas del mismo doctor se pisan. */
const EXCLUSION_VIOLATION = "23P01";
/** Violacion de check constraint. */
const CHECK_VIOLATION = "23514";
/** Violacion de unique. */
const UNIQUE_VIOLATION = "23505";

/**
 * Traduce los errores de Postgres a algo que se pueda enseñar en un toast.
 *
 * El caso importante es 23P01: lo lanza `appointments_no_overlap`, la
 * constraint que impide que un doctor tenga dos citas solapadas.
 */
export function mensajeDeError(error: PostgrestError | null, porDefecto = "Algo salio mal"): string {
  if (!error) return porDefecto;

  switch (error.code) {
    case EXCLUSION_VIOLATION:
      return "Ese horario ya esta ocupado para el doctor. Elige otro.";
    case UNIQUE_VIOLATION:
      return "Ese registro ya existe.";
    case CHECK_VIOLATION:
      if (error.message.includes("invoices_paid_ck")) {
        return "Un cobro pagado necesita metodo y fecha de pago.";
      }
      if (error.message.includes("duration")) return "La duracion debe ser mayor que cero.";
      return "Los datos no cumplen una regla de la clinica.";
    default:
      break;
  }

  // Lo lanza guard_patient_appointment_update()
  if (error.message.includes("solo puede cambiar el estado")) {
    return "Solo puedes cancelar la cita, no modificarla.";
  }

  // RLS rechazando la operacion
  if (error.code === "42501" || error.message.toLowerCase().includes("row-level security")) {
    return "No tienes permiso para hacer eso.";
  }

  return error.message || porDefecto;
}

/** Lanza con mensaje legible; los hooks de mutacion lo capturan en onError. */
export function lanzarSiError(error: PostgrestError | null, porDefecto?: string): void {
  if (error) throw new Error(mensajeDeError(error, porDefecto));
}
