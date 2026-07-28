import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Estado de UI que sobrevive a recargas.
 *
 * Todo lo demas (clinica, doctores, pacientes, citas, cobros) vive en
 * Supabase y se consulta con React Query desde src/lib/api/. Este store
 * ya NO guarda datos de negocio: hacerlo obligaria a mantener dos fuentes
 * de verdad y a sincronizarlas.
 */
interface UiState {
  onboardingCompleted: boolean;
  setOnboardingCompleted: (v: boolean) => void;
}

export const useStore = create<UiState>()(
  persist(
    (set) => ({
      // Arranca en false: un navegador nuevo entra por el asistente.
      // Si la clinica ya esta montada, /hub lo marca solo y no molesta.
      onboardingCompleted: false,
      setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),
    }),
    { name: "doctorcita-ui" },
  ),
);
