import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { toService, type Service } from "./types";

/** Lectura publica: la landing y el booking la usan sin sesion. */
export function useServices() {
  return useQuery({
    queryKey: qk.services,
    queryFn: async (): Promise<Service[]> => {
      // Por created_at, no alfabetico: conserva el orden de presentacion
      // del PRD (Medicina General primero, no Dermatologia)
      const { data, error } = await supabase.from("services").select("*").order("created_at");
      lanzarSiError(error);
      return (data ?? []).map(toService);
    },
  });
}

export type NuevoServicio = Omit<Service, "id" | "active"> & { active?: boolean };

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: NuevoServicio) => {
      const { error } = await supabase.from("services").insert({
        clinic_id: s.clinicId,
        name: s.name,
        duration_minutes: s.duration,
        price: s.price,
        description: s.description,
        icon: s.icon,
        active: s.active ?? true,
      });
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Service> }) => {
      const { error } = await supabase
        .from("services")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.duration !== undefined ? { duration_minutes: patch.duration } : {}),
          ...(patch.price !== undefined ? { price: patch.price } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
          ...(patch.active !== undefined ? { active: patch.active } : {}),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.services }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.services });
      // Los doctores referencian el servicio; su join se queda obsoleto
      qc.invalidateQueries({ queryKey: qk.doctors });
    },
  });
}
