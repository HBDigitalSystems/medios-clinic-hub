import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { todayISO, horaActual } from "@/lib/medi-utils";
import { toAppointment, toEvent, hhmm, type Appointment, type AppointmentEvent, type AppointmentStatus } from "./types";

/** Un hueco ocupado en la agenda de un doctor. */
export interface BusyBlock {
  time: string;
  duration: number;
}

/**
 * Huecos ocupados de un doctor en una fecha, para el booking publico.
 *
 * Va por RPC y no por `select` sobre `appointments` porque `anon` no puede
 * leer esa tabla (ahi hay datos de pacientes). La funcion
 * `doctor_busy_blocks` devuelve solo hora y duracion.
 */
export function useDoctorBusyBlocks(doctorId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ["busy-blocks", doctorId ?? "", date ?? ""] as const,
    enabled: !!doctorId && !!date,
    queryFn: async (): Promise<BusyBlock[]> => {
      const { data, error } = await supabase.rpc("doctor_busy_blocks", {
        p_doctor_id: doctorId!,
        p_date: date!,
      });
      lanzarSiError(error);
      return (data ?? []).map((b) => ({ time: hhmm(b.start_time), duration: b.duration_minutes }));
    },
  });
}

/**
 * Maquina de estados del PRD. Un estado final no lleva a ninguna parte.
 * La UI solo debe ofrecer las transiciones que aparecen aqui.
 */
export const transicionesValidas: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export const puedeTransicionar = (desde: AppointmentStatus, hasta: AppointmentStatus) =>
  transicionesValidas[desde].includes(hasta);

const SELECT = "*";

/** Un hueco concreto: dia y hora. */
export interface FreeSlot {
  date: string;
  time: string;
}

/**
 * Proximos huecos libres de un doctor, para las tarjetas del booking.
 *
 * La fecha y hora de referencia se mandan desde el cliente: el servidor va
 * en UTC y la clinica no, asi que "que hora es" solo lo sabe el navegador.
 */
export function useDoctorNextSlots(doctorId: string, duration: number, limite = 3) {
  const desdeFecha = todayISO();
  const desdeHora = horaActual();

  return useQuery({
    // La hora entra en la clave para que no se sirva un hueco ya pasado
    queryKey: ["next-slots", doctorId, duration, desdeFecha, desdeHora] as const,
    enabled: !!doctorId && duration > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<FreeSlot[]> => {
      const { data, error } = await supabase.rpc("doctor_next_slots", {
        p_doctor_id: doctorId,
        p_duration: duration,
        p_from_date: desdeFecha,
        p_from_time: desdeHora,
        p_limit: limite,
      });
      lanzarSiError(error);
      return (data ?? []).map((s) => ({ date: s.slot_date, time: hhmm(s.slot_time) }));
    },
  });
}

/** Todas las citas que el usuario tenga derecho a ver (lo decide RLS). */
export function useAppointments() {
  return useQuery({
    queryKey: qk.appointments,
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select(SELECT)
        .order("appointment_date")
        .order("start_time");
      lanzarSiError(error);
      return (data ?? []).map(toAppointment);
    },
  });
}

export function useAppointmentEvents(appointmentId: string | undefined) {
  return useQuery({
    queryKey: qk.appointmentEvents(appointmentId ?? ""),
    enabled: !!appointmentId,
    queryFn: async (): Promise<AppointmentEvent[]> => {
      const { data, error } = await supabase
        .from("appointment_events")
        .select("*")
        .eq("appointment_id", appointmentId!)
        .order("created_at");
      lanzarSiError(error);
      return (data ?? []).map(toEvent);
    },
  });
}

export interface NuevaCita {
  clinicId: string;
  patientId: string;
  doctorId: string;
  serviceId: string | null;
  date: string;
  time: string;
  duration: number;
  reason?: string;
  status?: AppointmentStatus;
}

/**
 * El solapamiento NO se comprueba aqui: lo impone la constraint
 * `appointments_no_overlap` en la base. Si choca, Postgres devuelve 23P01
 * y `mensajeDeError` lo convierte en "Ese horario ya esta ocupado".
 * Comprobarlo en el cliente seria una carrera; en la base es atomico.
 */
export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NuevaCita): Promise<Appointment> => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          clinic_id: c.clinicId,
          patient_id: c.patientId,
          doctor_id: c.doctorId,
          service_id: c.serviceId,
          appointment_date: c.date,
          start_time: c.time,
          duration_minutes: c.duration,
          reason: c.reason ?? "",
          status: c.status ?? "scheduled",
        })
        .select()
        .single();
      lanzarSiError(error);

      await registrarEvento(data!.id, "created");
      return toAppointment(data!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.appointments }),
  });
}

/**
 * Alta de cita desde el booking PUBLICO (sin sesion).
 *
 * Igual que en `crearPacienteAnonimo`: nada de `.select()`, porque `anon`
 * tiene INSERT pero no SELECT sobre `appointments`.
 */
export async function crearCitaAnonima(c: NuevaCita): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("appointments").insert({
    id,
    clinic_id: c.clinicId,
    patient_id: c.patientId,
    doctor_id: c.doctorId,
    service_id: c.serviceId,
    appointment_date: c.date,
    start_time: c.time,
    duration_minutes: c.duration,
    reason: c.reason ?? "",
    status: "scheduled",
  });
  lanzarSiError(error);

  // La politica de anon sobre appointment_events solo admite type='created'
  await supabase.from("appointment_events").insert({ appointment_id: id, type: "created" });
  return id;
}

/** Cambia el estado validando la transicion y dejando rastro en el historial. */
export function useTransitionAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      desde,
      hasta,
    }: {
      id: string;
      desde: AppointmentStatus;
      hasta: AppointmentStatus;
    }) => {
      if (!puedeTransicionar(desde, hasta)) {
        throw new Error(`Transicion invalida: ${desde} -> ${hasta}`);
      }

      const { error } = await supabase.from("appointments").update({ status: hasta }).eq("id", id);
      lanzarSiError(error);

      await registrarEvento(id, hasta);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.appointments }),
  });
}

export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, date, time }: { id: string; date: string; time: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ appointment_date: date, start_time: time })
        .eq("id", id);
      lanzarSiError(error);

      await registrarEvento(id, "rescheduled");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.appointments }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.appointments }),
  });
}

/**
 * El historial es informativo: si falla, no tumba la operacion principal
 * (la cita ya cambio de estado y eso es lo que importa).
 */
async function registrarEvento(appointmentId: string, type: string) {
  const { error } = await supabase
    .from("appointment_events")
    .insert({ appointment_id: appointmentId, type });
  if (error) console.warn("[appointments] no se pudo registrar el evento:", error.message);
}
