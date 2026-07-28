import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Stethoscope, LogOut, Play, XCircle, Clock, User, Check, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { MiPerfilDoctor } from "@/components/auth/mi-perfil-dialog";
import { useDoctorByUserId } from "@/lib/api/doctors";
import { useServices } from "@/lib/api/services";
import { usePatients } from "@/lib/api/patients";
import { useAppointments, useTransitionAppointment } from "@/lib/api/appointments";
import { useAppointmentNote, useSaveAppointmentNote } from "@/lib/api/notes";
import { useCreateInvoice } from "@/lib/api/invoices";
import type { Appointment, Doctor, Patient, PaymentMethod, Service } from "@/lib/api/types";
import { statusBadgeClass, statusLabel, formatDate, todayISO, ageFromBirth } from "@/lib/medi-utils";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Panel Doctor - DoctorCita Clinica" }] }),
  component: DoctorRoute,
});

function DoctorRoute() {
  return (
    <ProtectedRoute allow="doctor">
      <DoctorPanel />
    </ProtectedRoute>
  );
}

const TABS = [
  { key: "day", label: "Mi Dia" },
  { key: "consult", label: "Consulta" },
  { key: "patients", label: "Mis Pacientes" },
] as const;
type Tab = typeof TABS[number]["key"];

/** La edad solo se muestra si hay fecha de nacimiento (en la base es opcional). */
const edadTexto = (p: Patient | undefined) =>
  p?.birthDate ? `${ageFromBirth(p.birthDate)} anos` : "";

function DoctorPanel() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("day");
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  // El registro `doctors` se resuelve por user_id: es lo que ata la cuenta
  // con la ficha profesional y permite filtrar SUS citas.
  const { data: doctor, isLoading } = useDoctorByUserId(user?.id);

  const logout = async () => { await signOut(); navigate({ to: "/auth" }); };

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Cuenta con rol doctor pero sin ficha vinculada: pasa si un admin borra
  // el registro o si la invitacion no llego a completarse.
  if (!doctor) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Stethoscope className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <h1 className="mt-4 text-lg font-bold">Tu cuenta no esta vinculada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            No encontramos tu ficha de doctor. Pide a la clinica que te envie una invitacion.
          </p>
          <Button variant="outline" className="mt-5 w-full" onClick={logout}>Salir</Button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPerfilAbierto(true)}
              title="Mi perfil"
              className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border bg-accent/40 transition hover:border-primary"
            >
              {doctor.photo
                ? <img src={doctor.photo} alt={doctor.name} className="h-full w-full object-cover" />
                : <User className="h-4 w-4 text-muted-foreground" />}
            </button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4" /></Button>
          </div>
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
        {tab === "day" && <MyDay doctor={doctor} onStart={() => setTab("consult")} />}
        {tab === "consult" && <Consultation doctor={doctor} />}
        {tab === "patients" && <MyPatients doctor={doctor} />}
      </main>

      {perfilAbierto && <MiPerfilDoctor doctor={doctor} onClose={() => setPerfilAbierto(false)} />}
    </div>
  );
}

/* ================= MI DIA ================= */
function MyDay({ doctor, onStart }: { doctor: Doctor; onStart: () => void }) {
  // RLS ya limita las citas a las del doctor logueado; el filtro por id
  // es explicito para que el componente no dependa de eso.
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();
  const transition = useTransitionAppointment();

  const today = todayISO();
  const dayApts = appointments
    .filter((a) => a.doctorId === doctor.id && a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));

  const next = dayApts.find((a) => a.status === "confirmed" || a.status === "scheduled");

  const start = async (apt: Appointment) => {
    try {
      // scheduled no salta directo a in_progress: hay que pasar por confirmed
      if (apt.status === "scheduled") {
        await transition.mutateAsync({ id: apt.id, desde: "scheduled", hasta: "confirmed" });
      }
      await transition.mutateAsync({ id: apt.id, desde: "confirmed", hasta: "in_progress" });
      toast.success("Consulta iniciada");
      onStart();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const noShow = async (apt: Appointment) => {
    try {
      await transition.mutateAsync({ id: apt.id, desde: apt.status, hasta: "no_show" });
      toast.success("Marcada como no-show");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-6">
      {next && (() => {
        const pat = patients.find((p) => p.id === next.patientId);
        const prior = appointments.filter((a) => a.patientId === pat?.id && a.status === "completed").length;
        return (
          <div className="rounded-3xl border-2 border-primary bg-card p-6 shadow-md">
            <p className="text-xs font-semibold uppercase text-primary">Proximo paciente</p>
            <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-2xl font-bold">{pat?.name ?? "Paciente"}</h2>
                <p className="text-sm text-muted-foreground">{edadTexto(pat)} {pat?.phone ? `· ${pat.phone}` : ""}</p>
                <p className="mt-3 text-sm"><span className="text-muted-foreground">Motivo:</span> {next.reason || "—"}</p>
                <p className="text-sm"><span className="text-muted-foreground">Hora:</span> {next.time}</p>
                <p className="mt-2 text-xs text-muted-foreground">{prior} consultas previas</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="lg" disabled={transition.isPending} onClick={() => start(next)}>
                  <Play className="mr-2 h-4 w-4" /> Iniciar Consulta
                </Button>
                <Button variant="outline" size="sm" disabled={transition.isPending} onClick={() => noShow(next)}>
                  <XCircle className="mr-1 h-4 w-4" /> No asistio
                </Button>
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
                  <p className="font-semibold">{a.time} · {pat?.name ?? "Paciente"}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.reason || "—"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                {(a.status === "scheduled" || a.status === "confirmed") && (
                  <Button size="sm" disabled={transition.isPending} onClick={() => start(a)}>Iniciar</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= CONSULTA ================= */
function Consultation({ doctor }: { doctor: Doctor }) {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();
  const { data: services = [] } = useServices();
  const transition = useTransitionAppointment();
  const [chargeOpen, setChargeOpen] = useState(false);

  const active = appointments.find((a) => a.doctorId === doctor.id && a.status === "in_progress");

  if (isLoading) return <Cargando />;

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
  const sp = services.find((s) => s.id === active.serviceId);
  const priorVisits = appointments.filter(
    (a) => a.patientId === pat?.id && a.status === "completed",
  );

  const complete = async () => {
    try {
      await transition.mutateAsync({ id: active.id, desde: "in_progress", hasta: "completed" });
      toast.success("Consulta completada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10"><User className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold">{pat?.name ?? "Paciente"}</h3>
            <p className="text-xs text-muted-foreground">{edadTexto(pat)} {pat?.phone ? `· ${pat.phone}` : ""}</p>
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
                  <span className="text-muted-foreground">{services.find((s) => s.id === a.serviceId)?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-primary">Consulta activa</p>
            <h3 className="font-semibold">{sp?.name ?? "Consulta"}</h3>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs ${statusBadgeClass[active.status]}`}>{statusLabel[active.status]}</span>
        </div>
        <p className="text-sm"><span className="text-muted-foreground">Motivo:</span> {active.reason || "—"}</p>

        <NotasClinicas appointmentId={active.id} />

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={complete} disabled={transition.isPending}><Check className="mr-1 h-4 w-4" /> Completar Consulta</Button>
          <Button variant="outline" onClick={() => setChargeOpen(true)}><DollarSign className="mr-1 h-4 w-4" /> Cobrar</Button>
        </div>
      </div>

      {chargeOpen && (
        <ChargeDialog
          appointment={active}
          service={sp}
          doctor={doctor}
          onClose={() => setChargeOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Notas clinicas con autoguardado.
 *
 * Se escribe en estado local y se persiste con debounce: guardar en cada
 * pulsacion seria una peticion por tecla.
 *
 * Las notas viven en `appointment_notes`, no en la cita, para que el
 * paciente no pueda leerlas (ver migracion 20260727120400).
 */
function NotasClinicas({ appointmentId }: { appointmentId: string }) {
  const { data: guardadas = "", isLoading } = useAppointmentNote(appointmentId);
  const save = useSaveAppointmentNote();

  const [texto, setTexto] = useState("");
  const [tocado, setTocado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al cargar (o al cambiar de cita) se sincroniza con lo que hay en la base
  useEffect(() => {
    setTexto(guardadas);
    setTocado(false);
  }, [guardadas, appointmentId]);

  useEffect(() => {
    if (!tocado) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save.mutate({ appointmentId, content: texto });
    }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // `save` cambia de identidad en cada render; incluirlo reiniciaria el timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, tocado, appointmentId]);

  return (
    <div className="mt-4">
      <Label>Notas de la consulta</Label>
      <Textarea
        rows={8}
        value={texto}
        disabled={isLoading}
        placeholder="Diagnostico, indicaciones, medicamentos..."
        onChange={(e) => { setTexto(e.target.value); setTocado(true); }}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {save.isPending ? "Guardando..." : tocado ? "Autoguardado" : "Solo tu y la clinica veis estas notas"}
      </p>
    </div>
  );
}

function ChargeDialog({
  appointment, service, doctor, onClose,
}: {
  appointment: Appointment; service: Service | undefined; doctor: Doctor; onClose: () => void;
}) {
  const crear = useCreateInvoice();
  const [amt, setAmt] = useState(service?.price ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [notes, setNotes] = useState("");

  const confirmar = async () => {
    try {
      await crear.mutateAsync({
        clinicId: doctor.clinicId,
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        amount: amt,
        method,
        notes,
      });
      toast.success("Cobro registrado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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
          <Button onClick={confirmar} disabled={crear.isPending}>
            {crear.isPending ? "Guardando..." : "Confirmar Cobro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= MIS PACIENTES ================= */
function MyPatients({ doctor }: { doctor: Doctor }) {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: patients = [] } = usePatients();
  const { data: services = [] } = useServices();

  const misCitas = useMemo(
    () => appointments.filter((a) => a.doctorId === doctor.id),
    [appointments, doctor.id],
  );

  const myPatients = useMemo(() => {
    const ids = new Set(misCitas.map((a) => a.patientId));
    return patients.filter((p) => ids.has(p.id));
  }, [misCitas, patients]);

  const [selected, setSelected] = useState<string | null>(null);
  const sel = patients.find((p) => p.id === selected);
  const selectedHistory = misCitas.filter((a) => a.patientId === selected);

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-3">
      {myPatients.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Aun no has atendido pacientes.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {myPatients.map((p) => {
          const visits = misCitas.filter((a) => a.patientId === p.id);
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {services.find((s) => s.id === a.serviceId)?.name} · {a.reason || "—"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
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
