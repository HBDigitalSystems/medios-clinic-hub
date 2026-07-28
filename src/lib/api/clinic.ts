import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { toClinic, type Clinic } from "./types";

/**
 * La clinica es publica (la landing la necesita sin sesion).
 * De momento el sistema es de una sola clinica: se coge la primera.
 */
export function useClinic() {
  return useQuery({
    queryKey: qk.clinic,
    queryFn: async (): Promise<Clinic | null> => {
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      lanzarSiError(error);
      return data ? toClinic(data) : null;
    },
  });
}

/**
 * Vuelve a anclar las citas y cobros del seed sobre el dia de hoy.
 *
 * Hace falta porque el seed uso `current_date + N`, que se evalua una sola
 * vez al insertar: a los pocos dias las citas "de hoy" ya son pasado y la
 * demo aparece vacia. Solo admin (lo impone la propia funcion en Postgres).
 */
export function useResetDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc("reset_demo_data");
      lanzarSiError(error);
      return data ?? "Demo restablecida";
    },
    // Toca citas, notas y cobros: se refresca todo
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateClinic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Clinic> }) => {
      const { error } = await supabase
        .from("clinics")
        .update({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.address !== undefined ? { address: patch.address } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.openTime !== undefined ? { open_time: patch.openTime } : {}),
          ...(patch.closeTime !== undefined ? { close_time: patch.closeTime } : {}),
          ...(patch.logo !== undefined ? { logo: patch.logo } : {}),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.clinic }),
  });
}
