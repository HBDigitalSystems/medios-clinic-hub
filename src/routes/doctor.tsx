import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Stethoscope, LogOut, Play, XCircle, Clock, User, Check, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { statusBadgeClass, statusLabel, formatDate, formatMoney, todayISO, ageFromBirth } from "@/lib/medi-utils";
import type { PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Panel Doctor - MediOS" }] }),
  component: DoctorPanel,
});

const TABS = [
  { key: "day", label: "Mi Dia" },
  { key: "consult", label: "Consulta" },
  { key: "patients", label: "Mis Pacientes" },
] as const;
type Tab = typeof TABS[number]["key"];

function DoctorPanel() {
  const navigate = useNavigate();
  const { currentUser, doctors, setCurrentUser } = useStore();
  const [tab, setTab] = useState<Tab>("day");

  // pick a doctor: current user if doctor, else first
  const doctorId = currentUser?.role === "doctor" ? currentUser.id : doctors[0]?.id;
  const doctor = doctors.find((d) => d.id === doctorId);

  const logout = () => { setCurrentUser(null); navigate({ to: "/auth" }); };

  if (!doctor) return null;

  return (
    <div className="min-h-screen bg-accent/10">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Stethoscope className="h-4 w-4" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{doctor.name}</p>
              <p className="truncate text-xs text-muted-foreground">Panel del Doctor</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </div>
        <div className="mx-auto max-w-6xl px-2">
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
      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "day" && <MyDay doctorId={doctor.id} onStart={() => setTab("consult")} />}
        {tab === "consult" && <Consultation doctorId={doctor.id} />}
        {tab === "patients" && <MyPatients doctorId={doctor.id} />}
      </main>
    </div>
  );
}

function MyDay({ doctorId, onStart }: { doctorId: string; onStart: () => void }) {
  const { appointments, patients, specialties, updateAppointmentStatus } = useStore();
  const today = todayISO();
  const dayApts = appointments.filter((a) => a.doctorId === doctorId && a.date === today).sort((a, b) => a.time.localeCompare(b.time));

  const next = dayApts.find((a) => a.status === "confirmed" || a.status === "scheduled");

  const start = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt?.status === "scheduled") {
      updateAppointmentStatus(id, "confirmed");
    }
    const r = updateAppointmentStatus(id, "in_progress");
    if (!r.ok) { toast.error(r.error || "Error"); return; }
    toast.success("Consulta iniciada");
    onStart();
  };

  const noShow = (id: string) => {
    const r = updateAppointmentStatus(id, "no_show");
    if (!r.ok) toast.error(r.error || "Error"); else toast.success("Marcada como no-show");
  };

  return (
    <div className="space-y-6">
      {next && (() => {
        const pat = patients.find((p) => p.id === next.patientId);
        const sp = specialties.find((s) => s.id === next.specialtyId);
        const prior = appointments.filter((a) => a.patientId === pat?.id && a.status === "completed").length;
        return (
          <div className="rounded-3xl border-2 border-primary bg-card p-6 shadow-md">
            <p className="text-xs font-semibold uppercase text-primary">Proximo paciente</p>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-2xl font-bold">{pat?.name}</h2>
                <p className="text-sm text-muted-foreground">{pat ? `${ageFromBirth(pat.birthDate)} anos` : ""} · {pat?.phone}</p>
                <p className="mt-3 text-sm"><span className="text-muted-foreground">Motivo:</span> {next.reason}</p>
                <p className="text-sm"><span className="text-muted-foreground">Servicio:</span> {sp?.name}</p>
                <p className="text-sm"><span className="text-muted-foreground">Hora:</span> {next.time}</p>
                <p className="mt-2 text-xs text-muted-foreground">{prior} consultas previas</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="lg" onClick={() => start(next.id)}><Play className="mr-2 h-4 w-4" /> Iniciar Consulta</Button>
                <Button variant="outline" size="sm" onClick={() => noShow(next.id)}><XCircle className="mr-1 h-4 w-4" /> No asistio</Button>
              </div>
            </div>
          </div>
        );
      })()}

      <div>
        <h3 className="mb-3 font-semibold">Agenda del dia</h3>
        <div className="space-y-2">
          {dayApts.length === 0 && (
            <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              No tienes citas para hoy.
            </div>
          )}
          {dayApts.map((a) => {
            const pat = patients.find((p) => p.id === a.patientId);
            return (
              <div key={a.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.time} · {pat?.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.reason}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                {(a.status === "scheduled" || a.status === "confirmed") && (
                  <Button size="sm" onClick={() => start(a.id)}>Iniciar</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Consultation({ doctorId }: { doctorId: string }) {
  const { appointments, patients, specialties, updateAppointmentNotes, updateAppointmentStatus, addInvoice, invoices } = useStore();
  const active = appointments.find((a) => a.doctorId === doctorId && a.status === "in_progress");
  const [chargeOpen, setChargeOpen] = useState(false);

  if (!active) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center">
        <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-3 font-semibold">No hay consulta en curso</h3>
        <p className="text-sm text-muted-foreground">Inicia una consulta desde "Mi Dia".</p>
      </div>
    );
  }

  const pat = patients.find((p) => p.id === active.patientId);
  const sp = specialties.find((s) => s.id === active.specialtyId);
  const priorVisits = appointments.filter((a) => a.patientId === pat?.id && a.status === "completed");

  const complete = () => {
    const r = updateAppointmentStatus(active.id, "completed");
    if (!r.ok) toast.error(r.error || "Error"); else toast.success("Consulta completada");
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      {/* Left: patient */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{pat?.name}</h3>
            <p className="text-xs text-muted-foreground">{pat ? `${ageFromBirth(pat.birthDate)} anos` : ""} · {pat?.phone}</p>
            <p className="truncate text-xs text-muted-foreground">{pat?.email}</p>
          </div>
        </div>
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold">Historial</h4>
          {priorVisits.length === 0 && <p className="text-xs text-muted-foreground">Sin consultas previas.</p>}
          <div className="space-y-2">
            {priorVisits.map((a) => (
              <div key={a.id} className="rounded-lg bg-accent/30 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{formatDate(a.date)}</span>
                  <span className="text-muted-foreground">{specialties.find((s) => s.id === a.specialtyId)?.name}</span>
                </div>
                {a.clinicalNotes && <p className="mt-1 text-muted-foreground">{a.clinicalNotes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: consultation */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-primary">Consulta activa</p>
            <h3 className="font-semibold">{sp?.name}</h3>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs ${statusBadgeClass[active.status]}`}>{statusLabel[active.status]}</span>
        </div>
        <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {active.reason}</p>

        <div className="mt-4">
          <Label>Notas de la consulta</Label>
          <Textarea
            rows={8}
            value={active.clinicalNotes}
            placeholder="Diagnostico, indicaciones, medicamentos..."
            onChange={(e) => updateAppointmentNotes(active.id, e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Autoguardado</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={complete}><Check className="mr-1 h-4 w-4" /> Completar Consulta</Button>
          <Button variant="outline" onClick={() => setChargeOpen(true)}><DollarSign className="mr-1 h-4 w-4" /> Cobrar</Button>
        </div>
      </div>

      {chargeOpen && <ChargeDialog amount={sp?.price || 0} onClose={() => setChargeOpen(false)} onConfirm={(amt, method, notes) => {
        addInvoice(active.id, amt, method, notes);
        toast.success("Cobro registrado");
        setChargeOpen(false);
      }} />}
    </div>
  );
}

function ChargeDialog({ amount, onClose, onConfirm }: { amount: number; onClose: () => void; onConfirm: (a: number, m: PaymentMethod, n: string) => void }) {
  const [amt, setAmt] = useState(amount);
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [notes, setNotes] = useState("");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cobrar consulta</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Monto (MXN)</Label><Input type="number" value={amt} onChange={(e) => setAmt(Number(e.target.value))} /></div>
          <div><Label>Metodo</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas (opcional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(amt, method, notes)}>Confirmar Cobro</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MyPatients({ doctorId }: { doctorId: string }) {
  const { appointments, patients, specialties } = useStore();
  const myPatients = useMemo(() => {
    const ids = new Set(appointments.filter((a) => a.doctorId === doctorId).map((a) => a.patientId));
    return patients.filter((p) => ids.has(p.id));
  }, [appointments, patients, doctorId]);

  const [selected, setSelected] = useState<string | null>(null);
  const sel = patients.find((p) => p.id === selected);
  const selectedHistory = appointments.filter((a) => a.doctorId === doctorId && a.patientId === selected);

  return (
    <div className="space-y-3">
      {myPatients.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Aun no has atendido pacientes.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {myPatients.map((p) => {
          const visits = appointments.filter((a) => a.doctorId === doctorId && a.patientId === p.id);
          const last = [...visits].sort((a, b) => b.date.localeCompare(a.date))[0];
          return (
            <button key={p.id} onClick={() => setSelected(p.id)} className="rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="text-xs text-muted-foreground">Ultima visita: {last ? formatDate(last.date) : "—"}</p>
              <p className="mt-2 text-xs text-primary">{visits.length} consultas</p>
            </button>
          );
        })}
      </div>

      <Dialog open={!!sel} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {selectedHistory.map((a) => (
              <div key={a.id} className="rounded-lg bg-accent/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{formatDate(a.date)} {a.time}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{specialties.find((s) => s.id === a.specialtyId)?.name} · {a.reason}</p>
                {a.clinicalNotes && <p className="mt-2 text-xs">{a.clinicalNotes}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
