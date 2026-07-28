import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk, lanzarSiError } from "./shared";
import { toInvoice, type Invoice, type PaymentMethod } from "./types";
// La fecha de pago es la del cajero, no la UTC
import { todayISO } from "@/lib/medi-utils";

/** RLS decide: admin todos, doctor los de sus citas, paciente los suyos. */
export function useInvoices() {
  return useQuery({
    queryKey: qk.invoices,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      lanzarSiError(error);
      return (data ?? []).map(toInvoice);
    },
  });
}

export interface NuevoCobro {
  clinicId: string;
  appointmentId: string | null;
  patientId: string;
  amount: number;
  /** Sin metodo se crea como pendiente; con metodo, como pagado. */
  method?: PaymentMethod | null;
  notes?: string;
}

/**
 * El check `invoices_paid_ck` de la base obliga a que un cobro 'paid' lleve
 * metodo y fecha. Por eso el estado se deriva de si viene metodo o no.
 */
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NuevoCobro) => {
      const pagado = !!c.method;
      const { error } = await supabase.from("invoices").insert({
        clinic_id: c.clinicId,
        appointment_id: c.appointmentId,
        patient_id: c.patientId,
        amount: c.amount,
        status: pagado ? "paid" : "pending",
        method: c.method ?? null,
        paid_at: pagado ? todayISO() : null,
        notes: c.notes ?? "",
      });
      lanzarSiError(error);

      if (c.appointmentId) {
        const { error: evError } = await supabase
          .from("appointment_events")
          .insert({ appointment_id: c.appointmentId, type: "invoice_created" });
        if (evError) console.warn("[invoices] no se pudo registrar el evento:", evError.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invoices });
      qc.invalidateQueries({ queryKey: qk.appointments });
    },
  });
}

export function useMarkInvoicePaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, method }: { id: string; method: PaymentMethod }) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          method,
          paid_at: todayISO(),
        })
        .eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invoices }),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
      lanzarSiError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invoices }),
  });
}

/** Saldo pendiente de un paciente, calculado sobre lo que RLS deje ver. */
export const saldoPendiente = (patientId: string, invoices: Invoice[]) =>
  invoices
    .filter((i) => i.patientId === patientId && i.status === "pending")
    .reduce((s, i) => s + i.amount, 0);
