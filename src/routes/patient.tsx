import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope, LogOut, Plus, AlertTriangle, Calendar, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MiPerfilPaciente } from "@/components/auth/mi-perfil-dialog";
import { usePatientByUserId } from "@/lib/api/patients";
import { useDoctors } from "@/lib/api/doctors";
import { useServices } from "@/lib/api/services";
import { useAppointments, useTransitionAppointment, useRescheduleAppointment } from "@/lib/api/appointments";
import { useInvoices } from "@/lib/api/invoices";
import type { Appointment, Patient } from "@/lib/api/types";
import { statusBadgeClass, statusLabel, formatDate, formatMoney, invoiceBadgeClass, todayISO } from "@/lib/medi-utils";

export const Route = createFileRoute("/patient")({
  head: () => ({ meta: [{ title: "Mi Portal - DoctorCita Clinica" }] }),
  component: PatientRoute,
});

function PatientRoute() {
  return (
    <ProtectedRoute allow="patient">
      <PatientPortal />
    </ProtectedRoute>
  );
}

const TABS = [
  { key: "appts", label: "Mis Citas" },
  { key: "history", label: "Historial" },
  { key: "payments", label: "Pagos" },
] as const;
type Tab = typeof TABS[number]["key"];

/**
 * Regla del PRD: se puede cancelar hasta 2 horas antes de la cita.
 * Se comprueba en el cliente; el servidor no la impone todavia.
 */
const HORAS_MINIMAS_PARA_CANCELAR = 2;

function horasHastaLaCita(a: Appointment): number {
  const cuando = new Date(`${a.date}T${a.time}:00`);
  return (cuando.getTime() - Date.now()) / 3_600_000;
}

const sePuedeCancelar = (a: Appointment) => horasHastaLaCita(a) >= HORAS_MINIMAS_PARA_CANCELAR;

function PatientPortal() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("appts");
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  const { data: patient, isLoading } = usePatientByUserId(user?.id);

  const logout = async () => { await signOut(); navigate({ to: "/auth" }); };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Cuenta de paciente sin ficha: pasa cuando alguien se registra por su
  // cuenta en vez de por invitacion. Puede agendar, y el booking le creara
  // la ficha.
  if (!patient) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h1 className="mt-4 text-lg font-bold">Aun no tienes historial</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agenda tu primera cita y aqui apareceran tus citas, historial y recibos.
          </p>
          <Button asChild className="mt-5 w-full"><Link to="/booking">Agendar Cita</Link></Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={logout}>Salir</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent/10">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Stethoscope className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Hola, {patient.name.split(" ")[0]}</p>
              <p className="truncate text-xs text-muted-foreground">Portal del Paciente</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPerfilAbierto(true)}
              title="Mi perfil"
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border bg-accent/40 transition hover:border-primary"
            >
              {patient.photo
                ? <img src={patient.photo} alt={patient.name} className="h-full w-full object-cover" />
                : <span className="text-sm font-semibold text-muted-foreground">{patient.name[0]?.toUpperCase()}</span>}
            </button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-2">
          <div className="flex overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >{t.label}</button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        {tab === "appts" && <Appts patient={patient} />}
        {tab === "history" && <History patient={patient} />}
        {tab === "payments" && <Payments patient={patient} />}
      </main>

      {perfilAbierto && <MiPerfilPaciente patient={patient} onClose={() => setPerfilAbierto(false)} />}
    </div>
  );
}

/* ================= MIS CITAS ================= */
function Appts({ patient }: { patient: Patient }) {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();
  const transition = useTransitionAppointment();
  const reschedule = useRescheduleAppointment();

  const [resched, setResched] = useState<Appointment | null>(null);
  const [confirmarCancel, setConfirmarCancel] = useState<Appointment | null>(null);

  const upcoming = appointments
    .filter((a) => a.patientId === patient.id && (a.status === "scheduled" || a.status === "confirmed"))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const cancelar = async (a: Appointment) => {
    try {
      await transition.mutateAsync({ id: a.id, desde: a.status, hasta: "cancelled" });
      toast.success("Cita cancelada");
      setConfirmarCancel(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4">
      <Button asChild className="w-full sm:w-auto">
        <Link to="/booking"><Plus className="mr-1 h-4 w-4" /> Agendar Nueva Cita</Link>
      </Button>

      {upcoming.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No tienes citas programadas.</p>
        </div>
      ) : upcoming.map((a) => {
        const doc = doctors.find((d) => d.id === a.doctorId);
        const sp = services.find((s) => s.id === a.serviceId);
        const cancelable = sePuedeCancelar(a);
        return (
          <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-4">
              {doc?.photo
                ? <img src={doc.photo} alt={doc.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope className="h-6 w-6" />
                  </div>}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{doc?.name ?? "Doctor"}</h3>
                <p className="text-sm text-primary">{sp?.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(a.date)} · {a.time}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setResched(a)}>Reagendar</Button>
              <Button size="sm" variant="destructive" disabled={!cancelable} onClick={() => setConfirmarCancel(a)}>
                Cancelar
              </Button>
              {!cancelable && (
                <span className="text-xs text-muted-foreground">
                  Faltan menos de {HORAS_MINIMAS_PARA_CANCELAR}h: llama a la clinica para cancelar.
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Confirmacion antes de cancelar, como pide el PRD */}
      <Dialog open={!!confirmarCancel} onOpenChange={() => setConfirmarCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar esta cita?</DialogTitle>
            <DialogDescription>
              {confirmarCancel && (() => {
                const doc = doctors.find((d) => d.id === confirmarCancel.doctorId);
                return `${formatDate(confirmarCancel.date)} a las ${confirmarCancel.time} con ${doc?.name ?? "tu doctor"}. Esta accion no se puede deshacer.`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarCancel(null)}>Volver</Button>
            <Button
              variant="destructive"
              disabled={transition.isPending}
              onClick={() => confirmarCancel && cancelar(confirmarCancel)}
            >
              {transition.isPending ? "Cancelando..." : "Si, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {resched && (
        <RescheduleDialog
          appointment={resched}
          onClose={() => setResched(null)}
          onSave={async (d, t) => {
            try {
              await reschedule.mutateAsync({ id: resched.id, date: d, time: t });
              toast.success("Cita reagendada");
              setResched(null);
            } catch (e) {
              // Si el hueco esta pillado salta appointments_no_overlap
              toast.error((e as Error).message);
            }
          }}
          guardando={reschedule.isPending}
        />
      )}
    </div>
  );
}

function RescheduleDialog({
  appointment, onClose, onSave, guardando,
}: {
  appointment: Appointment;
  onClose: () => void;
  onSave: (d: string, t: string) => void;
  guardando: boolean;
}) {
  const [date, setDate] = useState(appointment.date);
  const [time, setTime] = useState(appointment.time);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar cita</DialogTitle>
          <DialogDescription>
            Si el horario ya esta ocupado te avisaremos al guardar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha</Label><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(date, time)} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= HISTORIAL ================= */
function History({ patient }: { patient: Patient }) {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();

  const past = appointments
    .filter((a) => a.patientId === patient.id && ["completed", "cancelled", "no_show"].includes(a.status))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (isLoading) return <Cargando />;

  if (past.length === 0) {
    return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Aun no tienes consultas pasadas.</div>;
  }

  return (
    <div className="space-y-3">
      {past.map((a) => {
        const doc = doctors.find((d) => d.id === a.doctorId);
        const sp = services.find((s) => s.id === a.serviceId);
        return (
          <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatDate(a.date)} · {a.time}</p>
                <p className="text-sm text-primary">{sp?.name}</p>
                <p className="text-sm text-muted-foreground">{doc?.name}</p>
                {/* Solo el motivo que puso el paciente. Las notas clinicas
                    del doctor viven en otra tabla y RLS no se las sirve. */}
                <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold">Motivo:</span> {a.reason || "—"}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= PAGOS ================= */
function Payments({ patient }: { patient: Patient }) {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: appointments = [] } = useAppointments();
  const { data: services = [] } = useServices();

  const myInv = invoices.filter((i) => i.patientId === patient.id);
  const hasPending = myInv.some((i) => i.status === "pending");

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-3">
      {hasPending && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">Tienes pagos pendientes. Por favor regulariza tu cuenta en tu proxima visita.</p>
        </div>
      )}
      {myInv.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No tienes recibos.</p>
        </div>
      )}
      {myInv.map((i) => {
        const apt = appointments.find((a) => a.id === i.appointmentId);
        const sp = services.find((s) => s.id === apt?.serviceId);
        return (
          <div key={i.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatMoney(i.amount)}</p>
                <p className="text-sm text-muted-foreground">{sp?.name || "Consulta"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fecha: {i.createdAt.slice(0, 10)}{i.method ? ` · ${i.method}` : ""}
                </p>
                {i.notes && <p className="mt-1 text-xs text-muted-foreground">{i.notes}</p>}
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${invoiceBadgeClass[i.status]}`}>{i.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Cargando() {
  return (
    <div className="grid place-items-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
