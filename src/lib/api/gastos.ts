import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lanzarSiError } from "./shared";
import { toExpense, type Expense } from "./types";

export const qkGastos = ["expenses"] as const;

/**
 * Gastos que el usuario puede ver.
 *
 * RLS decide: el admin los ve todos; un medico, solo los que se le
 * imputan.
 */
export function useGastos() {
  return useQuery({
    queryKey: qkGastos,
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      lanzarSiError(error);
      return (data ?? []).map(toExpense);
    },
  });
}

export interface NuevoGasto {
  clinicId: string;
  /** null = gasto general de la clinica */
  doctorId: string | null;
  concept: string;
  amount: number;
  date: string;
  notes?: string;
}

export function useCrearGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: NuevoGasto) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert({
        clinic_id: g.clinicId,
        doctor_id: g.doctorId,
        concept: g.concept.trim(),
        amount: g.amount,
        expense_date: g.date,
        notes: g.notes ?? "",
        created_by: userData.user?.id ?? null,
      });
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkGastos }),
  });
}

export function useActualizarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Expense> }) => {
      const { error } = await supabase
        .from("expenses")
        .update({
          ...(patch.concept !== undefined ? { concept: patch.concept.trim() } : {}),
          ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
          ...(patch.date !== undefined ? { expense_date: patch.date } : {}),
          ...(patch.doctorId !== undefined ? { doctor_id: patch.doctorId } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkGastos }),
  });
}

export function useBorrarGasto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qkGastos }),
  });
}

/** Suma de gastos dentro de un rango, opcionalmente de un medico. */
export function totalGastos(
  gastos: Expense[],
  { desde, hasta, doctorId }: { desde?: string; hasta?: string; doctorId?: string | null } = {},
) {
  return gastos
    .filter((g) => {
      if (desde && g.date < desde) return false;
      if (hasta && g.date > hasta) return false;
      // `undefined` no filtra; `null` busca los generales de la clinica
      if (doctorId !== undefined && g.doctorId !== doctorId) return false;
      return true;
    })
    .reduce((s, g) => s + g.amount, 0);
}
