import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";

/**
 * Notas clinicas de una cita.
 *
 * Viven en `appointment_notes`, separadas de `appointments`, porque RLS
 * filtra filas y no columnas: si estuvieran en la cita, el paciente las
 * leeria al leer su propia cita. Solo el admin y el doctor de esa cita
 * tienen politicas sobre esta tabla; para el paciente, no existe.
 */
export function useAppointmentNote(appointmentId: string | undefined) {
  return useQuery({
    queryKey: qk.appointmentNote(appointmentId ?? ""),
    enabled: !!appointmentId,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("appointment_notes")
        .select("content")
        .eq("appointment_id", appointmentId!)
        .maybeSingle();
      lanzarSiError(error);
      return data?.content ?? "";
    },
  });
}

/** Upsert: la fila de notas se crea la primera vez que el doctor escribe. */
export function useSaveAppointmentNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ appointmentId, content }: { appointmentId: string; content: string }) => {
      const { error } = await supabase
        .from("appointment_notes")
        .upsert({ appointment_id: appointmentId, content }, { onConflict: "appointment_id" });
      lanzarSiError(error);

      const { error: evError } = await supabase
        .from("appointment_events")
        .insert({ appointment_id: appointmentId, type: "notes_added" });
      if (evError) console.warn("[notes] no se pudo registrar el evento:", evError.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.appointmentNote(vars.appointmentId) });
    },
  });
}
