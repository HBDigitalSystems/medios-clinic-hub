import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Appointment,
  AppointmentStatus,
  ClinicConfig,
  Doctor,
  Invoice,
  Patient,
  PaymentMethod,
  Role,
  Specialty,
} from "./types";
import {
  initialAppointments,
  initialClinic,
  initialDoctors,
  initialInvoices,
  initialPatients,
  initialSpecialties,
} from "./mock-data";

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
};

interface CurrentUser {
  role: Role;
  id: string; // doctorId or patientId or "admin"
  name: string;
}

interface State {
  clinic: ClinicConfig;
  specialties: Specialty[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  invoices: Invoice[];
  currentUser: CurrentUser | null;
  onboardingCompleted: boolean;

  setCurrentUser: (u: CurrentUser | null) => void;
  setOnboardingCompleted: (v: boolean) => void;
  updateClinic: (c: Partial<ClinicConfig>) => void;

  addDoctor: (d: Omit<Doctor, "id">) => Doctor;
  updateDoctor: (id: string, patch: Partial<Doctor>) => void;
  toggleDoctorActive: (id: string) => void;

  addPatient: (p: Omit<Patient, "id">) => Patient;

  addAppointment: (a: Omit<Appointment, "id" | "events" | "clinicalNotes" | "status"> & { status?: AppointmentStatus }) => Appointment | null;
  updateAppointmentStatus: (id: string, next: AppointmentStatus) => { ok: boolean; error?: string };
  updateAppointmentNotes: (id: string, notes: string) => void;
  rescheduleAppointment: (id: string, date: string, time: string) => void;

  addInvoice: (appointmentId: string, amount: number, method: PaymentMethod, notes?: string) => Invoice;
  updateInvoiceStatus: (id: string, status: Invoice["status"]) => void;

  addSpecialty: (s: Omit<Specialty, "id">) => Specialty;
  updateSpecialty: (id: string, patch: Partial<Specialty>) => void;

  reset: () => void;
}

const initialState = () => ({
  clinic: initialClinic,
  specialties: initialSpecialties,
  doctors: initialDoctors,
  patients: initialPatients,
  appointments: initialAppointments,
  invoices: initialInvoices,
  currentUser: null,
  onboardingCompleted: true, // demo: skip onboarding by default
});

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialState(),

      setCurrentUser: (u) => set({ currentUser: u }),
      setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),
      updateClinic: (c) => set({ clinic: { ...get().clinic, ...c } }),

      addDoctor: (d) => {
        const doc = { ...d, id: uid("doc") } as Doctor;
        set({ doctors: [...get().doctors, doc] });
        return doc;
      },
      updateDoctor: (id, patch) =>
        set({ doctors: get().doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)) }),
      toggleDoctorActive: (id) =>
        set({ doctors: get().doctors.map((d) => (d.id === id ? { ...d, active: !d.active } : d)) }),

      addPatient: (p) => {
        const pat = { ...p, id: uid("pac") } as Patient;
        set({ patients: [...get().patients, pat] });
        return pat;
      },

      addAppointment: (a) => {
        const { appointments, specialties } = get();
        const sp = specialties.find((s) => s.id === a.specialtyId);
        const duration = a.duration || sp?.duration || 30;
        // collision check
        const conflict = appointments.find(
          (x) =>
            x.doctorId === a.doctorId &&
            x.date === a.date &&
            x.time === a.time &&
            !["cancelled", "no_show"].includes(x.status),
        );
        if (conflict) return null;
        const apt: Appointment = {
          id: uid("apt"),
          patientId: a.patientId,
          doctorId: a.doctorId,
          specialtyId: a.specialtyId,
          date: a.date,
          time: a.time,
          duration,
          status: a.status || "scheduled",
          reason: a.reason,
          clinicalNotes: "",
          events: [{ type: "created", timestamp: new Date().toISOString() }],
        };
        set({ appointments: [...appointments, apt] });
        return apt;
      },

      updateAppointmentStatus: (id, next) => {
        const apt = get().appointments.find((a) => a.id === id);
        if (!apt) return { ok: false, error: "Cita no encontrada" };
        if (!validTransitions[apt.status].includes(next)) {
          return { ok: false, error: `Transicion invalida: ${apt.status} -> ${next}` };
        }
        set({
          appointments: get().appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: next,
                  events: [...a.events, { type: next, timestamp: new Date().toISOString() }],
                }
              : a,
          ),
        });
        return { ok: true };
      },

      updateAppointmentNotes: (id, notes) =>
        set({
          appointments: get().appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  clinicalNotes: notes,
                  events:
                    a.clinicalNotes === notes
                      ? a.events
                      : [...a.events, { type: "notes_added", timestamp: new Date().toISOString() }].filter(
                          (e, i, arr) =>
                            e.type !== "notes_added" || i === arr.map((x) => x.type).lastIndexOf("notes_added"),
                        ),
                }
              : a,
          ),
        }),

      rescheduleAppointment: (id, date, time) =>
        set({
          appointments: get().appointments.map((a) =>
            a.id === id
              ? {
                  ...a,
                  date,
                  time,
                  events: [...a.events, { type: "rescheduled", timestamp: new Date().toISOString() }],
                }
              : a,
          ),
        }),

      addInvoice: (appointmentId, amount, method, notes = "") => {
        const apt = get().appointments.find((a) => a.id === appointmentId);
        const inv: Invoice = {
          id: uid("inv"),
          appointmentId,
          patientId: apt?.patientId || "",
          amount,
          status: "paid",
          method,
          paidAt: new Date().toISOString().slice(0, 10),
          notes,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        set({
          invoices: [...get().invoices, inv],
          appointments: get().appointments.map((a) =>
            a.id === appointmentId
              ? { ...a, events: [...a.events, { type: "invoice_created", timestamp: new Date().toISOString() }] }
              : a,
          ),
        });
        return inv;
      },

      updateInvoiceStatus: (id, status) =>
        set({
          invoices: get().invoices.map((i) =>
            i.id === id ? { ...i, status, paidAt: status === "paid" ? new Date().toISOString().slice(0, 10) : i.paidAt } : i,
          ),
        }),

      addSpecialty: (s) => {
        const sp = { ...s, id: uid("spe") } as Specialty;
        set({ specialties: [...get().specialties, sp] });
        return sp;
      },
      updateSpecialty: (id, patch) =>
        set({ specialties: get().specialties.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),

      reset: () => set(initialState()),
    }),
    { name: "medios-store" },
  ),
);

// helpers
export const getPatientBalance = (patientId: string, invoices: Invoice[]) =>
  invoices.filter((i) => i.patientId === patientId && i.status === "pending").reduce((s, i) => s + i.amount, 0);
