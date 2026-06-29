import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Stethoscope, LogOut, Plus, AlertTriangle, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { statusBadgeClass, statusLabel, formatDate, formatMoney, invoiceBadgeClass, todayISO } from "@/lib/medi-utils";

export const Route = createFileRoute("/patient")({
  head: () => ({ meta: [{ title: "Mi Portal - MediOS" }] }),
  component: PatientPortal,
});

const TABS = [
  { key: "appts", label: "Mis Citas" },
  { key: "history", label: "Historial" },
  { key: "payments", label: "Pagos" },
] as const;
type Tab = typeof TABS[number]["key"];

function PatientPortal() {
  const navigate = useNavigate();
  const { currentUser, patients, setCurrentUser } = useStore();
  const [tab, setTab] = useState<Tab>("appts");

  const patientId = currentUser?.role === "patient" ? currentUser.id : patients[0]?.id;
  const patient = patients.find((p) => p.id === patientId);

  const logout = () => { setCurrentUser(null); navigate({ to: "/auth" }); };

  if (!patient) return null;

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
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
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
        {tab === "appts" && <Appts patientId={patient.id} />}
        {tab === "history" && <History patientId={patient.id} />}
        {tab === "payments" && <Payments patientId={patient.id} />}
      </main>
    </div>
  );
}

function Appts({ patientId }: { patientId: string }) {
  const { appointments, doctors, specialties, updateAppointmentStatus, rescheduleAppointment } = useStore();
  const upcoming = appointments
    .filter((a) => a.patientId === patientId && (a.status === "scheduled" || a.status === "confirmed"))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const [resched, setResched] = useState<string | null>(null);

  const cancel = (id: string) => {
    const r = updateAppointmentStatus(id, "cancelled");
    if (!r.ok) toast.error(r.error || "Error"); else toast.success("Cita cancelada");
  };

  return (
    <div className="space-y-4">
      <Button asChild className="w-full sm:w-auto"><Link to="/booking"><Plus className="mr-1 h-4 w-4" /> Agendar Nueva Cita</Link></Button>
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No tienes citas programadas.</p>
        </div>
      ) : upcoming.map((a) => {
        const doc = doctors.find((d) => d.id === a.doctorId);
        const sp = specialties.find((s) => s.id === a.specialtyId);
        return (
          <div key={a.id} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <img src={doc?.photo} alt={doc?.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{doc?.name}</h3>
                <p className="text-sm text-primary">{sp?.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{formatDate(a.date)} · {a.time}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setResched(a.id)}>Reagendar</Button>
              <Button size="sm" variant="destructive" onClick={() => cancel(a.id)}>Cancelar</Button>
            </div>
          </div>
        );
      })}

      {resched && (
        <RescheduleDialog id={resched} onClose={() => setResched(null)} onSave={(d, t) => {
          rescheduleAppointment(resched, d, t);
          toast.success("Cita reagendada");
          setResched(null);
        }} />
      )}
    </div>
  );
}

function RescheduleDialog({ id, onClose, onSave }: { id: string; onClose: () => void; onSave: (d: string, t: string) => void }) {
  const { appointments } = useStore();
  const apt = appointments.find((a) => a.id === id)!;
  const [date, setDate] = useState(apt.date);
  const [time, setTime] = useState(apt.time);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reagendar cita</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Fecha</Label><Input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(date, time)}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function History({ patientId }: { patientId: string }) {
  const { appointments, doctors, specialties } = useStore();
  const past = appointments
    .filter((a) => a.patientId === patientId && ["completed", "cancelled", "no_show"].includes(a.status))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (past.length === 0) {
    return <div className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">Aun no tienes consultas pasadas.</div>;
  }

  return (
    <div className="space-y-3">
      {past.map((a) => {
        const doc = doctors.find((d) => d.id === a.doctorId);
        const sp = specialties.find((s) => s.id === a.specialtyId);
        return (
          <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatDate(a.date)} · {a.time}</p>
                <p className="text-sm text-primary">{sp?.name}</p>
                <p className="text-sm text-muted-foreground">{doc?.name}</p>
                <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold">Motivo:</span> {a.reason}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Payments({ patientId }: { patientId: string }) {
  const { invoices, appointments, specialties } = useStore();
  const myInv = invoices.filter((i) => i.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const hasPending = myInv.some((i) => i.status === "pending");

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
        const sp = specialties.find((s) => s.id === apt?.specialtyId);
        return (
          <div key={i.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{formatMoney(i.amount)}</p>
                <p className="text-sm text-muted-foreground">{sp?.name || "Consulta"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Fecha: {i.createdAt}{i.method ? ` · ${i.method}` : ""}</p>
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
