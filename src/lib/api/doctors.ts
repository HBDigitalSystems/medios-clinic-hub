import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { toDoctor, type Doctor, type DoctorSchedule } from "./types";

/** Lectura publica: la landing y el booking los listan sin sesion. */
export function useDoctors() {
  return useQuery({
    queryKey: qk.doctors,
    queryFn: async (): Promise<Doctor[]> => {
      // Mismo criterio que services: orden de alta, no alfabetico
      const { data, error } = await supabase.from("doctors").select("*").order("created_at");
      lanzarSiError(error);
      return (data ?? []).map(toDoctor);
    },
  });
}

/** Solo los activos: es lo que debe ofrecer el booking. */
export function useActiveDoctors() {
  const q = useDoctors();
  return { ...q, data: q.data?.filter((d) => d.active) };
}

/**
 * Resuelve el registro `doctors` de quien esta logueado.
 * Es lo que permite al panel del doctor filtrar por SUS citas.
 */
export function useDoctorByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: qk.doctorByUser(userId ?? "anon"),
    enabled: !!userId,
    queryFn: async (): Promise<Doctor | null> => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      lanzarSiError(error);
      return data ? toDoctor(data) : null;
    },
  });
}

export interface NuevoDoctor {
  clinicId: string;
  serviceId: string | null;
  name: string;
  photo?: string;
  schedule: DoctorSchedule;
  bio?: string;
  active?: boolean;
  facebook?: string | null;
  instagram?: string | null;
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: NuevoDoctor): Promise<Doctor> => {
      const { data, error } = await supabase
        .from("doctors")
        .insert({
          clinic_id: d.clinicId,
          service_id: d.serviceId,
          name: d.name,
          photo: d.photo ?? "",
          schedule: d.schedule as unknown as never,
          bio: d.bio ?? "",
          active: d.active ?? true,
          facebook: d.facebook ?? null,
          instagram: d.instagram ?? null,
        })
        .select()
        .single();
      lanzarSiError(error);
      return toDoctor(data!);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.doctors }),
  });
}

export function useUpdateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Doctor> }) => {
      const { error } = await supabase
        .from("doctors")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.serviceId !== undefined ? { service_id: patch.serviceId } : {}),
          ...(patch.photo !== undefined ? { photo: patch.photo } : {}),
          ...(patch.schedule !== undefined ? { schedule: patch.schedule as unknown as never } : {}),
          ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
          ...(patch.facebook !== undefined ? { facebook: patch.facebook } : {}),
          ...(patch.instagram !== undefined ? { instagram: patch.instagram } : {}),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.doctors }),
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.doctors });
      // Borrar un doctor arrastra sus citas (ON DELETE CASCADE)
      qc.invalidateQueries({ queryKey: qk.appointments });
    },
  });
}
