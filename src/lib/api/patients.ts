import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { toPatient, type Patient } from "./types";

/**
 * RLS decide cuantos se ven: el admin los de su clinica, el doctor los de la
 * suya, y un paciente solo su propia ficha.
 */
export function usePatients() {
  return useQuery({
    queryKey: qk.patients,
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase.from("patients").select("*").order("name");
      lanzarSiError(error);
      return (data ?? []).map(toPatient);
    },
  });
}

/** Resuelve la ficha del paciente logueado, para el portal. */
export function usePatientByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: qk.patientByUser(userId ?? "anon"),
    enabled: !!userId,
    queryFn: async (): Promise<Patient | null> => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      lanzarSiError(error);
      return data ? toPatient(data) : null;
    },
  });
}

export interface NuevoPaciente {
  clinicId: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string | null;
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: NuevoPaciente): Promise<Patient> => {
      const { data, error } = await supabase
        .from("patients")
        .insert({
          clinic_id: p.clinicId,
          name: p.name,
          phone: p.phone,
          email: p.email ?? "",
          birth_date: p.birthDate ?? null,
        })
        .select()
        .single();
      lanzarSiError(error);
      return toPatient(data!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.patients }),
  });
}

/**
 * Crea la ficha de paciente del usuario logueado.
 *
 * Pasa cuando alguien se registra por su cuenta (no por invitacion) y
 * agenda por primera vez: tiene cuenta, pero todavia no ficha.
 *
 * Nace con `user_id` puesto. Es obligatorio: la politica
 * `patients_insert_own` exige `user_id = auth.uid()`, y sin el la ficha
 * quedaria invisible para su propio dueño, porque `patients_select_own`
 * filtra por esa columna.
 *
 * No es un hook: el booking la llama dentro de su propio flujo.
 */
export async function crearMiFicha(p: NuevoPaciente & { userId: string }): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await supabase.from("patients").insert({
    id,
    clinic_id: p.clinicId,
    user_id: p.userId,
    name: p.name,
    phone: p.phone,
    email: p.email ?? "",
    birth_date: p.birthDate ?? null,
  });
  lanzarSiError(error);
  return id;
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Patient> }) => {
      const { error } = await supabase
        .from("patients")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.birthDate !== undefined ? { birth_date: patch.birthDate } : {}),
          ...(patch.photo !== undefined ? { photo: patch.photo } : {}),
          ...(patch.emergencyName !== undefined ? { emergency_name: patch.emergencyName } : {}),
          ...(patch.emergencyPhone !== undefined ? { emergency_phone: patch.emergencyPhone } : {}),
          ...(patch.emergencyRelation !== undefined ? { emergency_relation: patch.emergencyRelation } : {}),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.patients }),
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.patients });
      qc.invalidateQueries({ queryKey: qk.appointments });
      qc.invalidateQueries({ queryKey: qk.invoices });
    },
  });
}
