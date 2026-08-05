import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Calendar, UserCog, Users, CreditCard, BarChart3, Settings,
  Stethoscope, LogOut, Plus, CheckCircle, XCircle, UserPlus, DollarSign,
  Search, AlertCircle, Pencil, Trash2, Loader2, RotateCcw, Printer, Home, Download, Eye,
  PhoneCall, FileText, Wallet, Facebook, Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { ImageUpload } from "@/components/ui/image-upload";
import { ExpedienteArchivos } from "@/components/expediente-archivos";
import { RedesDoctor } from "@/components/redes-doctor";
import { useNotasDeCitas } from "@/lib/api/notes";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import {
  ReporteImprimible, Documento, useDatosDelReporte, reporteACsv, descargarTexto,
} from "@/components/reporte-imprimible";
import { useStore } from "@/lib/store";
import { useClinic, useUpdateClinic, useResetDemoData } from "@/lib/api/clinic";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/lib/api/services";
import { useDoctors, useCreateDoctor, useUpdateDoctor, useDeleteDoctor } from "@/lib/api/doctors";
import { usePatients, useCreatePatient, useUpdatePatient, useDeletePatient } from "@/lib/api/patients";
import { useAppointments, useCreateAppointment, useTransitionAppointment, transicionesValidas } from "@/lib/api/appointments";
import { useInvoices, useCreateInvoice, useMarkInvoicePaid, useCancelInvoice, saldoPendiente } from "@/lib/api/invoices";
import { useGastos, useCrearGasto, useBorrarGasto, totalGastos } from "@/lib/api/gastos";
import type { Appointment, Clinic, Doctor, Invoice, Patient, PaymentMethod, Service } from "@/lib/api/types";
import {
  statusBadgeClass, statusLabel, invoiceBadgeClass, doctorColor, formatMoney,
  todayISO, formatDate, formatSchedule, inicioDeMes, inicioDeSemana, sumarDias,
} from "@/lib/medi-utils";

export const Route = createFileRoute("/hub")({
  head: () => ({ meta: [{ title: "Panel Admin - DoctorCita Clinica" }] }),
  component: HubRoute,
});

function HubRoute() {
  return (
    <ProtectedRoute allow="admin">
      <Hub />
    </ProtectedRoute>
  );
}

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "doctores", label: "Doctores", icon: UserCog },
  { key: "pacientes", label: "Pacientes", icon: Users },
  { key: "cobros", label: "Cobros", icon: CreditCard },
  { key: "gastos", label: "Gastos", icon: Wallet },
  { key: "reportes", label: "Reportes", icon: BarChart3 },
  { key: "config", label: "Configuracion", icon: Settings },
] as const;

type TabKey = typeof TABS[number]["key"];

function Hub() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { data: clinic } = useClinic();
  const { data: doctors = [], isLoading: cargandoDoctores } = useDoctors();
  const { data: services = [], isLoading: cargandoServicios } = useServices();
  const { onboardingCompleted, setOnboardingCompleted } = useStore();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [forzarWizard, setForzarWizard] = useState(false);

  const logout = async () => { await signOut(); navigate({ to: "/auth" }); };

  // El flag de localStorage por si solo no basta: si el admin cambia de
  // navegador volveria a salir el asistente con la clinica ya montada.
  // Se cruza con el estado real de la base.
  const cargando = cargandoDoctores || cargandoServicios;
  const clinicaConfigurada = doctors.length > 0 && services.length > 0;
  const mostrarWizard = forzarWizard || (!cargando && !onboardingCompleted && !clinicaConfigurada);

  // Clinica ya montada y flag sin marcar (otro navegador, otro admin):
  // se da por hecho en silencio, sin molestar con el asistente.
  useEffect(() => {
    if (!cargando && !onboardingCompleted && clinicaConfigurada) {
      setOnboardingCompleted(true);
    }
  }, [cargando, onboardingCompleted, clinicaConfigurada, setOnboardingCompleted]);

  if (mostrarWizard) {
    return (
      <OnboardingWizard
        onFinish={() => {
          setOnboardingCompleted(true);
          setForzarWizard(false);
          // El boton promete "Ir al Dashboard", no volver al tab de antes
          setTab("dashboard");
          toast.success("Todo listo");
        }}
      />
    );
  }

  return (
    <div className="no-impresion flex min-h-screen bg-accent/10">
      <aside className={`hidden border-r bg-sidebar md:flex md:flex-col ${collapsed ? "w-16" : "w-60"} transition-all`}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-4 w-4" />
            </div>
            {!collapsed && <span className="truncate font-bold">DoctorCita</span>}
          </Link>
          <button onClick={() => setCollapsed(!collapsed)} className="rounded p-1 hover:bg-accent">
            <ChevronIcon collapsed={collapsed} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              title={t.label}
            >
              <t.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{t.label}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t p-2">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{TABS.find((t) => t.key === tab)?.label}</h1>
            <p className="truncate text-xs text-muted-foreground">{clinic?.name ?? ""}</p>
          </div>
          {/* En movil la barra lateral no existe, asi que sin esto no
              habria forma de cerrar sesion */}
          <div className="flex shrink-0 items-center gap-2">
            {profile && (
              <span className="hidden text-right text-xs leading-tight text-muted-foreground sm:block">
                <span className="block font-medium text-foreground">{profile.fullName || "Administrador"}</span>
                <span>{profile.role}</span>
              </span>
            )}
            {/* Volver a la web publica sin cerrar sesion */}
            <Button asChild variant="ghost" size="sm" title="Ver el sitio publico">
              <Link to="/">
                <Home className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Inicio</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "agenda" && <AgendaTab />}
          {tab === "doctores" && <DoctorsTab />}
          {tab === "pacientes" && <PatientsTab />}
          {tab === "cobros" && <InvoicesTab />}
          {tab === "gastos" && <ExpensesTab />}
          {tab === "reportes" && <ReportsTab />}
          {tab === "config" && <ConfigTab onRelanzarWizard={() => setForzarWizard(true)} />}
        </main>

        {/* `grid-cols-8` y no un numero suelto: si se anade otra pestana hay
            que tocar aqui tambien, asi que se deriva de TABS */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 grid border-t bg-background md:hidden"
          style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${
                tab === t.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span className="truncate">{t.label.split(" ")[0]}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeWidth={2} strokeLinecap="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function Cargando() {
  return (
    <div className="grid place-items-center py-24">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/* ============== DASHBOARD ============== */
function DashboardTab() {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: invoices = [] } = useInvoices();
  const { data: patients = [] } = usePatients();
  const { data: gastos = [] } = useGastos();

  const today = todayISO();
  const desdeMes = inicioDeMes();

  const todayApts = appointments.filter((a) => a.date === today);
  const completed = appointments.filter((a) => a.status === "completed").length;
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const todayIncome = invoices
    .filter((i) => i.status === "paid" && i.paidAt === today)
    .reduce((s, i) => s + i.amount, 0);

  // Bug B6 de ESTADO.md: la KPI decia "Pacientes nuevos" pero pintaba el
  // total. La capa API no expone `created_at` de patients, asi que se
  // etiqueta por lo que realmente es: el total de pacientes.
  const last7 = useMemo(() => {
    const out: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const iso = sumarDias(today, -i);
      const d = new Date(iso + "T00:00:00");
      out.push({
        day: d.toLocaleDateString("es-MX", { weekday: "short" }),
        count: appointments.filter((a) => a.date === iso).length,
      });
    }
    return out;
  }, [appointments, today]);

  const monthIncome = invoices
    .filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= desdeMes)
    .reduce((s, i) => s + i.amount, 0);

  // Gastos del mes y resultado. Sin esto, "ingresos" solo cuenta media
  // historia: una clinica puede facturar mucho y perder dinero.
  const gastosDelMes = totalGastos(gastos, { desde: desdeMes, hasta: today });
  const neto = monthIncome - gastosDelMes;

  const alerts = [
    ...appointments.filter((a) => a.status === "scheduled").slice(0, 3)
      .map((a) => ({ type: "Cita sin confirmar", text: `${formatDate(a.date)} ${a.time}` })),
    ...invoices.filter((i) => i.status === "pending")
      .map((i) => ({ type: "Cobro pendiente", text: formatMoney(i.amount) })),
  ];

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Calendar} label="Citas hoy" value={todayApts.length} color="bg-blue-500" />
        <Kpi icon={CheckCircle} label="Completadas" value={completed} color="bg-emerald-500" />
        <Kpi icon={XCircle} label="No-shows" value={noShows} color="bg-rose-500" />
        <Kpi icon={DollarSign} label="Ingresos hoy" value={formatMoney(todayIncome)} color="bg-amber-500" />
        <Kpi icon={UserPlus} label="Pacientes" value={patients.length} color="bg-violet-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 font-semibold">Citas - ultimos 7 dias</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={last7}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} className="text-xs" />
                <RTooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" fill="oklch(0.55 0.20 258)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4 text-amber-500" /> Alertas
          </h3>
          <ul className="space-y-2 text-sm">
            {alerts.length === 0 && <li className="text-muted-foreground">Todo en orden</li>}
            {alerts.map((a, i) => (
              <li key={i} className="rounded-lg bg-accent/40 px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">{a.type}</p>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 rounded-xl border bg-accent/20 p-3 text-xs">
            <p className="flex justify-between text-muted-foreground">
              <span>Ingresos del mes</span>
              <span className="font-semibold text-emerald-600">{formatMoney(monthIncome)}</span>
            </p>
            <p className="flex justify-between text-muted-foreground">
              <span>Gastos del mes</span>
              <span className="font-semibold text-rose-600">{formatMoney(-gastosDelMes)}</span>
            </p>
            <p className="flex justify-between border-t pt-1.5 font-semibold">
              <span>Resultado</span>
              <span className={neto >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatMoney(neto)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number | string; color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold">{value}</p>
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/* ============== AGENDA ============== */
function AgendaTab() {
  const { data: appointments = [], isLoading } = useAppointments();
  const { data: doctors = [] } = useDoctors();
  const { data: patients = [] } = usePatients();
  const [view, setView] = useState<"day" | "week">("day");
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const baseIso = sumarDias(todayISO(), dateOffset);
  const base = new Date(baseIso + "T00:00:00");

  const days = view === "day"
    ? [baseIso]
    : [...Array(7)].map((_, i) => sumarDias(baseIso, -((base.getDay() + 6) % 7) + i));

  const apt = appointments.find((a) => a.id === selectedApt);

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDateOffset(dateOffset - (view === "day" ? 1 : 7))}>‹</Button>
          <span className="font-semibold capitalize">
            {new Date(days[0] + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
            {view === "week" ? ` - ${new Date(days[6] + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}` : ""}
          </span>
          <Button variant="outline" size="sm" onClick={() => setDateOffset(dateOffset + (view === "day" ? 1 : 7))}>›</Button>
          <Button variant="ghost" size="sm" onClick={() => setDateOffset(0)}>Hoy</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5">
            <button onClick={() => setView("day")} className={`rounded-md px-3 py-1 text-xs font-medium ${view === "day" ? "bg-primary text-primary-foreground" : ""}`}>Dia</button>
            <button onClick={() => setView("week")} className={`rounded-md px-3 py-1 text-xs font-medium ${view === "week" ? "bg-primary text-primary-foreground" : ""}`}>Semana</button>
          </div>
          <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nueva Cita</Button>
        </div>
      </div>

      <div className={`grid gap-3 ${view === "week" ? "md:grid-cols-7" : "grid-cols-1"}`}>
        {days.map((iso) => {
          const d = new Date(iso + "T00:00:00");
          const dayApts = appointments.filter((a) => a.date === iso).sort((a, b) => a.time.localeCompare(b.time));
          return (
            <div key={iso} className="rounded-2xl border bg-card p-3 shadow-sm">
              <div className="mb-3 border-b pb-2">
                <p className="text-xs uppercase text-muted-foreground">{d.toLocaleDateString("es-MX", { weekday: "short" })}</p>
                <p className="text-lg font-bold">{d.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayApts.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Sin citas</p>}
                {dayApts.map((a) => {
                  const doc = doctors.find((x) => x.id === a.doctorId);
                  const pat = patients.find((x) => x.id === a.patientId);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedApt(a.id)}
                      className="block w-full rounded-lg border bg-background p-2 text-left text-xs transition hover:border-primary"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${doctorColor(a.doctorId)}`} />
                        <span className="font-semibold">{a.time}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                      </div>
                      <p className="mt-1 truncate font-medium">{pat?.name}</p>
                      <p className="truncate text-muted-foreground">{doc?.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {apt && <AppointmentDialog appointment={apt} onClose={() => setSelectedApt(null)} />}
      {newOpen && <NewAppointmentDialog onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function AppointmentDialog({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { data: doctors = [] } = useDoctors();
  const { data: patients = [] } = usePatients();
  const { data: services = [] } = useServices();
  const transition = useTransitionAppointment();

  const doc = doctors.find((d) => d.id === appointment.doctorId);
  const pat = patients.find((p) => p.id === appointment.patientId);
  const sp = services.find((s) => s.id === appointment.serviceId);

  // La UI solo ofrece transiciones legales; el resto ni se pinta
  const posibles = transicionesValidas[appointment.status];

  const etiquetaAccion: Record<string, string> = {
    confirmed: "Confirmar",
    cancelled: "Cancelar cita",
    no_show: "Marcar no-show",
    in_progress: "Iniciar consulta",
    completed: "Completar",
  };

  const cambiar = async (hasta: typeof posibles[number]) => {
    try {
      await transition.mutateAsync({ id: appointment.id, desde: appointment.status, hasta });
      toast.success("Estado actualizado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Detalle de cita</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="Paciente" value={pat?.name || ""} />
          <Row label="Doctor" value={doc?.name || ""} />
          <Row label="Servicio" value={sp?.name || ""} />
          <Row label="Fecha" value={formatDate(appointment.date)} />
          <Row label="Hora" value={`${appointment.time} (${appointment.duration} min)`} />
          <Row label="Motivo" value={appointment.reason || "—"} />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estado</span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass[appointment.status]}`}>{statusLabel[appointment.status]}</span>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          {posibles.length === 0 && <p className="text-xs text-muted-foreground">Esta cita ya esta cerrada.</p>}
          {posibles.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === "cancelled" || p === "no_show" ? "outline" : "default"}
              disabled={transition.isPending}
              onClick={() => cambiar(p)}
            >
              {etiquetaAccion[p] ?? p}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentDialog({ onClose, pacienteFijo }: { onClose: () => void; pacienteFijo?: Patient }) {
  const { data: clinic } = useClinic();
  const { data: patients = [] } = usePatients();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();
  const crear = useCreateAppointment();

  const [patientId, setPatientId] = useState(pacienteFijo?.id ?? "");
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");

  const servicio = services.find((s) => s.id === serviceId);

  const submit = async () => {
    if (!clinic) return;
    if (!patientId || !doctorId || !serviceId) {
      toast.error("Faltan paciente, doctor o servicio");
      return;
    }
    try {
      await crear.mutateAsync({
        clinicId: clinic.id,
        patientId,
        doctorId,
        serviceId,
        date,
        time,
        duration: servicio?.duration ?? 30,
        reason,
      });
      toast.success("Cita creada");
      onClose();
    } catch (e) {
      // Si choca con otra cita, el mensaje viene de appointments_no_overlap
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          {pacienteFijo && <DialogDescription>Para {pacienteFijo.name}</DialogDescription>}
        </DialogHeader>
        <div className="grid gap-3">
          {!pacienteFijo && (
            <div><Label>Paciente</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger><SelectValue placeholder="Elige un paciente" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue placeholder="Elige un doctor" /></SelectTrigger>
              <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
              <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration} min)</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Hora</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div><Label>Motivo</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={crear.isPending}>
            {crear.isPending ? "Creando..." : "Crear cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

/* ============== DOCTORES ============== */
const DIAS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mie" },
  { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sab" }, { n: 7, label: "Dom" },
];

function DoctorsTab() {
  const { data: doctors = [], isLoading } = useDoctors();
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();
  const actualizar = useUpdateDoctor();
  const borrar = useDeleteDoctor();

  const [editando, setEditando] = useState<Doctor | null>(null);
  const [creando, setCreando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState<Doctor | null>(null);

  const desdeSemana = inicioDeSemana();

  const toggleActivo = async (d: Doctor) => {
    try {
      await actualizar.mutateAsync({ id: d.id, patch: { active: !d.active } });
      toast.success(d.active ? "Doctor desactivado" : "Doctor activado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async (d: Doctor) => {
    try {
      await borrar.mutateAsync(d.id);
      toast.success("Doctor eliminado");
      setConfirmarBorrado(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreando(true)}><Plus className="mr-1 h-4 w-4" /> Agregar Doctor</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => {
          const sp = services.find((s) => s.id === d.serviceId);
          // Bug B5: antes contaba el historico entero bajo la etiqueta "esta semana"
          const citasSemana = appointments.filter(
            (a) => a.doctorId === d.id && a.date >= desdeSemana && a.date <= sumarDias(desdeSemana, 6),
          ).length;
          const noShows = appointments.filter((a) => a.doctorId === d.id && a.status === "no_show").length;
          return (
            <div key={d.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {d.photo
                  ? <img src={d.photo} alt={d.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                  : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Stethoscope className="h-6 w-6" /></div>}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{d.name}</h3>
                  <p className="truncate text-sm text-primary">{sp?.name ?? "Sin especialidad"}</p>
                </div>
                <Switch checked={d.active} onCheckedChange={() => toggleActivo(d)} />
              </div>
              {/* Bug B2: antes ponia "L-V" fijo aunque el doctor trabajase L,M,J */}
              <p className="mt-3 text-xs text-muted-foreground">
                {formatSchedule(d.schedule.days, d.schedule.start, d.schedule.end)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-accent px-2 py-1">{citasSemana} citas esta semana</span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{noShows} no-shows</span>
                {d.userId
                  ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">cuenta vinculada</span>
                  : <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">sin cuenta</span>}
              </div>
              <div className="mt-3">
                <RedesDoctor facebook={d.facebook} instagram={d.instagram} tamano="sm" />
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditando(d)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setConfirmarBorrado(d)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {(creando || editando) && (
        <DoctorDialog
          doctor={editando}
          onClose={() => { setCreando(false); setEditando(null); }}
        />
      )}

      <Dialog open={!!confirmarBorrado} onOpenChange={() => setConfirmarBorrado(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar a {confirmarBorrado?.name}?</DialogTitle>
            <DialogDescription>
              Se borraran tambien sus citas. Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarBorrado(null)}>Volver</Button>
            <Button variant="destructive" disabled={borrar.isPending} onClick={() => confirmarBorrado && eliminar(confirmarBorrado)}>
              {borrar.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Alta y edicion comparten formulario: los campos son los mismos. */
function DoctorDialog({ doctor, onClose }: { doctor: Doctor | null; onClose: () => void }) {
  const { data: clinic } = useClinic();
  const { data: services = [] } = useServices();
  const crear = useCreateDoctor();
  const actualizar = useUpdateDoctor();

  const [name, setName] = useState(doctor?.name ?? "");
  const [serviceId, setServiceId] = useState(doctor?.serviceId ?? "");
  const [photo, setPhoto] = useState(doctor?.photo ?? "");
  const [bio, setBio] = useState(doctor?.bio ?? "");
  const [days, setDays] = useState<number[]>(doctor?.schedule.days ?? [1, 2, 3, 4, 5]);
  const [start, setStart] = useState(doctor?.schedule.start ?? "09:00");
  const [end, setEnd] = useState(doctor?.schedule.end ?? "17:00");
  const [facebook, setFacebook] = useState(doctor?.facebook ?? "");
  const [instagram, setInstagram] = useState(doctor?.instagram ?? "");

  const toggleDia = (n: number) =>
    setDays((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b)));

  const guardar = async () => {
    if (!name.trim()) { toast.error("Falta el nombre"); return; }
    if (days.length === 0) { toast.error("Elige al menos un dia de trabajo"); return; }
    if (end <= start) { toast.error("La hora de fin debe ser posterior a la de inicio"); return; }

    const schedule = { days, start, end };
    try {
      const redes = {
        facebook: facebook.trim() || null,
        instagram: instagram.trim() || null,
      };
      if (doctor) {
        await actualizar.mutateAsync({
          id: doctor.id,
          patch: { name, serviceId: serviceId || null, photo, bio, schedule, ...redes },
        });
        toast.success("Doctor actualizado");
      } else {
        if (!clinic) return;
        await crear.mutateAsync({
          clinicId: clinic.id,
          serviceId: serviceId || null,
          name, photo, bio, schedule, ...redes,
        });
        toast.success("Doctor agregado");
      }
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const guardando = crear.isPending || actualizar.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{doctor ? "Editar doctor" : "Agregar doctor"}</DialogTitle></DialogHeader>

        <div className="grid gap-4">
          <section className="grid gap-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Perfil</p>
            <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Especialidad</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger><SelectValue placeholder="Sin especialidad" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ImageUpload
              value={photo || null}
              onChange={(url) => setPhoto(url ?? "")}
              carpeta="doctors"
              entidadId={doctor?.id ?? "nuevo"}
              nombre={name}
              etiqueta="Foto del doctor"
            />
            <div><Label>Bio</Label><Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
                <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="usuario o enlace completo" />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
                <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="usuario o enlace completo" />
              </div>
            </div>
          </section>

          <section className="grid gap-3 border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Horario</p>
            <div>
              <Label>Dias de trabajo</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIAS.map((d) => (
                  <button
                    key={d.n}
                    type="button"
                    onClick={() => toggleDia(d.n)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      days.includes(d.n) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >{d.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entrada</Label><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
              <div><Label>Salida</Label><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            </div>
          </section>

          {doctor && (
            <section className="grid gap-2 border-t pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Acceso al sistema</p>
              {doctor.userId ? (
                <p className="text-sm text-emerald-700">Ya tiene cuenta vinculada.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Comparte este enlace para que cree su cuenta y quede vinculada:
                  </p>
                  <EnlaceInvitacion tipo="doctor" id={doctor.id} />
                </>
              )}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** El enlace lleva el id del registro; el trigger handle_new_user lo vincula. */
function EnlaceInvitacion({ tipo, id }: { tipo: "doctor" | "patient"; id: string }) {
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/auth?invite=${tipo}&id=${id}`
    : "";
  return (
    <div className="flex gap-2">
      <Input readOnly value={url} className="font-mono text-xs" />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          navigator.clipboard.writeText(url);
          toast.success("Enlace copiado");
        }}
      >Copiar</Button>
    </div>
  );
}

/* ============== PACIENTES ============== */
function PatientsTab() {
  const { data: patients = [], isLoading } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const { data: invoices = [] } = useInvoices();
  const { data: doctors = [] } = useDoctors();

  const [q, setQ] = useState("");
  // Se guarda el ID, no el objeto: con una copia, tras editar el dialogo
  // seguiria mostrando los datos viejos aunque ya se hubieran guardado
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  const seleccionado = patients.find((p) => p.id === seleccionadoId) ?? null;

  const filtered = patients.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q),
  );

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre o telefono..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setCreando(true)}><Plus className="mr-1 h-4 w-4" /> Nuevo paciente</Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th className="p-3">Telefono</th><th className="p-3">Ultima visita</th><th className="p-3">Balance</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Ningun paciente coincide.</td></tr>
            )}
            {filtered.map((p) => {
              const last = [...appointments].filter((a) => a.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              const bal = saldoPendiente(p.id, invoices);
              return (
                <tr key={p.id} onClick={() => setSeleccionadoId(p.id)} className="cursor-pointer border-t transition hover:bg-accent/30">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-muted-foreground">{p.phone}</td>
                  <td className="p-3 text-muted-foreground">{last ? formatDate(last.date) : "—"}</td>
                  <td className="p-3"><span className={bal > 0 ? "font-semibold text-rose-600" : "text-muted-foreground"}>{formatMoney(bal)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <PatientDialog
          // `key`: al cambiar de paciente se reinicia el estado del formulario,
          // que si no arrastraria los valores del anterior
          key={seleccionado.id}
          patient={seleccionado}
          appointments={appointments.filter((a) => a.patientId === seleccionado.id)}
          invoices={invoices.filter((i) => i.patientId === seleccionado.id)}
          doctors={doctors}
          onClose={() => setSeleccionadoId(null)}
        />
      )}
      {creando && <NewPatientDialog onClose={() => setCreando(false)} />}
    </div>
  );
}

function PatientDialog({
  patient, appointments, invoices, doctors, onClose,
}: {
  patient: Patient; appointments: Appointment[]; invoices: Invoice[];
  doctors: Doctor[]; onClose: () => void;
}) {
  const actualizar = useUpdatePatient();
  const borrar = useDeletePatient();
  const [editando, setEditando] = useState(false);
  const [nuevaCita, setNuevaCita] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const [name, setName] = useState(patient.name);
  const [phone, setPhone] = useState(patient.phone);
  const [email, setEmail] = useState(patient.email);
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [photo, setPhoto] = useState<string | null>(patient.photo);
  const [emergencyName, setEmergencyName] = useState(patient.emergencyName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(patient.emergencyPhone ?? "");
  const [emergencyRelation, setEmergencyRelation] = useState(patient.emergencyRelation ?? "");

  // Historial con notas clinicas. RLS ya filtra: el admin las ve todas.
  const idsDeCitas = useMemo(() => appointments.map((a) => a.id), [appointments]);
  const { data: notas = {} } = useNotasDeCitas(idsDeCitas);

  const balance = saldoPendiente(patient.id, invoices);
  const completadas = appointments.filter((a) => a.status === "completed").length;
  const noShows = appointments.filter((a) => a.status === "no_show").length;

  const guardar = async () => {
    try {
      await actualizar.mutateAsync({
        id: patient.id,
        patch: {
          name, phone, email, birthDate: birthDate || null, photo,
          emergencyName: emergencyName.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
          emergencyRelation: emergencyRelation.trim() || null,
        },
      });
      toast.success("Paciente actualizado");
      setEditando(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    try {
      await borrar.mutateAsync(patient.id);
      toast.success("Paciente eliminado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{patient.name}</DialogTitle></DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <Metrica label="Consultas" value={completadas} />
            <Metrica label="No-shows" value={noShows} />
            <Metrica label="Balance" value={formatMoney(balance)} destacado={balance > 0} />
          </div>

          {editando ? (
            <div className="grid gap-3 rounded-xl border p-4">
              <ImageUpload
                value={photo}
                onChange={setPhoto}
                carpeta="patients"
                entidadId={patient.id}
                nombre={name}
                etiqueta="Foto del paciente"
              />
              <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>Nacimiento</Label><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>

              <div className="grid gap-3 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                  <PhoneCall className="h-3.5 w-3.5" /> Contacto de emergencia
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Nombre</Label><Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Maria Perez" /></div>
                  <div><Label>Parentesco</Label><Input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} placeholder="Madre, esposo..." /></div>
                </div>
                <div><Label>Telefono</Label><Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="5512345678" /></div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={guardar} disabled={actualizar.isPending}>Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-accent/20 p-4 text-sm">
                <p><span className="text-muted-foreground">Telefono:</span> {patient.phone}</p>
                <p><span className="text-muted-foreground">Email:</span> {patient.email || "—"}</p>
                <p><span className="text-muted-foreground">Nacimiento:</span> {patient.birthDate ?? "—"}</p>
                <p><span className="text-muted-foreground">Cuenta:</span> {patient.userId ? "vinculada" : "sin cuenta"}</p>
              </div>

              <ContactoDeEmergencia patient={patient} />
            </>
          )}

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Historial clinico
            </h4>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {appointments.length === 0 && <p className="text-xs text-muted-foreground">Sin citas.</p>}
              {[...appointments].sort((a, b) => b.date.localeCompare(a.date)).map((a) => {
                const doc = doctors.find((d) => d.id === a.doctorId);
                const nota = notas[a.id];
                return (
                  <div key={a.id} className="rounded-lg bg-accent/30 p-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{formatDate(a.date)} {a.time}</p>
                        <p className="text-muted-foreground">{doc?.name}</p>
                        {a.reason && <p className="mt-0.5 text-muted-foreground">Motivo: {a.reason}</p>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                    </div>
                    {nota && (
                      <p className="mt-2 whitespace-pre-wrap border-l-2 border-primary/40 bg-background/60 p-2 text-muted-foreground">
                        {nota}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <ExpedienteArchivos patientId={patient.id} clinicId={patient.clinicId} />

          <div>
            <h4 className="mb-2 text-sm font-semibold">Cobros</h4>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {invoices.length === 0 && <p className="text-xs text-muted-foreground">Sin cobros.</p>}
              {invoices.map((i) => (
                <div key={i.id} className="flex items-center justify-between rounded-lg bg-accent/30 p-2 text-xs">
                  <span className="font-medium">{formatMoney(i.amount)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${invoiceBadgeClass[i.status]}`}>{i.status}</span>
                </div>
              ))}
            </div>
          </div>

          {!patient.userId && (
            <div className="grid gap-2 border-t pt-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Acceso al portal</p>
              <EnlaceInvitacion tipo="patient" id={patient.id} />
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2 sm:justify-between">
            <Button variant="ghost" className="text-rose-600" onClick={() => setConfirmarBorrado(true)}>
              <Trash2 className="mr-1 h-4 w-4" /> Eliminar
            </Button>
            <div className="flex gap-2">
              {!editando && <Button variant="outline" onClick={() => setEditando(true)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>}
              <Button onClick={() => setNuevaCita(true)}><Plus className="mr-1 h-4 w-4" /> Crear Cita</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {nuevaCita && <NewAppointmentDialog pacienteFijo={patient} onClose={() => setNuevaCita(false)} />}

      <Dialog open={confirmarBorrado} onOpenChange={() => setConfirmarBorrado(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar a {patient.name}?</DialogTitle>
            <DialogDescription>Se borraran sus citas y cobros. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarBorrado(false)}>Volver</Button>
            <Button variant="destructive" disabled={borrar.isPending} onClick={eliminar}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * A quien llamar si le pasa algo al paciente.
 *
 * Se pinta aparte y en rojo: en una urgencia se busca de un vistazo, no
 * leyendo una lista de datos de contacto.
 */
function ContactoDeEmergencia({ patient }: { patient: Patient }) {
  if (!patient.emergencyPhone && !patient.emergencyName) {
    return (
      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
        Sin contacto de emergencia. Conviene pedirlo en la proxima visita.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
        <PhoneCall className="h-3.5 w-3.5" /> Contacto de emergencia
      </p>
      <p className="mt-1 text-sm font-medium">
        {patient.emergencyName || "—"}
        {patient.emergencyRelation && (
          <span className="font-normal text-muted-foreground"> · {patient.emergencyRelation}</span>
        )}
      </p>
      {patient.emergencyPhone && (
        // `tel:` para poder llamar desde el movil sin copiar el numero
        <a href={`tel:${patient.emergencyPhone}`} className="text-lg font-bold text-rose-700 hover:underline">
          {patient.emergencyPhone}
        </a>
      )}
    </div>
  );
}

function Metrica({ label, value, destacado }: { label: string; value: number | string; destacado?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${destacado ? "text-rose-600" : ""}`}>{value}</p>
    </div>
  );
}

function NewPatientDialog({ onClose }: { onClose: () => void }) {
  const { data: clinic } = useClinic();
  const crear = useCreatePatient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const guardar = async () => {
    if (!clinic) return;
    if (!name.trim() || !phone.trim()) { toast.error("Nombre y telefono son obligatorios"); return; }
    try {
      await crear.mutateAsync({ clinicId: clinic.id, name, phone, email, birthDate: birthDate || null });
      toast.success("Paciente creado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo paciente</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Nacimiento</Label><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={crear.isPending}>Crear</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== COBROS ============== */
function InvoicesTab() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: appointments = [] } = useAppointments();
  const { data: patients = [] } = usePatients();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();
  const marcarPagado = useMarkInvoicePaid();
  const cancelar = useCancelInvoice();

  const [status, setStatus] = useState("all");
  const [doctorId, setDoctorId] = useState("all");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cobrando, setCobrando] = useState<string | null>(null);
  const [nuevoCobro, setNuevoCobro] = useState(false);

  const filtered = invoices.filter((i) => {
    if (status !== "all" && i.status !== status) return false;
    const apt = appointments.find((a) => a.id === i.appointmentId);
    if (doctorId !== "all" && apt?.doctorId !== doctorId) return false;
    const fecha = i.createdAt.slice(0, 10);
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });

  const total = filtered.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  const pagar = async (id: string, method: PaymentMethod) => {
    try {
      await marcarPagado.mutateAsync({ id, method });
      toast.success("Cobro marcado como pagado");
      setCobrando(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">Estado</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Doctor</Label>
          <Select value={doctorId} onValueChange={setDoctorId}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los doctores</SelectItem>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {/* Hueco 4 de ESTADO.md: el filtro por rango de fechas faltaba */}
        <div><Label className="text-xs">Desde</Label><Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><Label className="text-xs">Hasta</Label><Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        {(desde || hasta || status !== "all" || doctorId !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setDesde(""); setHasta(""); setStatus("all"); setDoctorId("all"); }}>
            Limpiar
          </Button>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setNuevoCobro(true)}><Plus className="mr-1 h-4 w-4" /> Nuevo cobro</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} cobros · cobrado <span className="font-semibold text-foreground">{formatMoney(total)}</span>
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Paciente</th><th className="p-3">Doctor</th>
              <th className="p-3">Servicio</th><th className="p-3">Monto</th><th className="p-3">Estado</th>
              <th className="p-3">Metodo</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Ningun cobro con esos filtros.</td></tr>
            )}
            {filtered.map((i) => {
              const apt = appointments.find((a) => a.id === i.appointmentId);
              const pat = patients.find((p) => p.id === i.patientId);
              const doc = doctors.find((d) => d.id === apt?.doctorId);
              const sp = services.find((s) => s.id === apt?.serviceId);
              return (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{i.createdAt.slice(0, 10)}</td>
                  <td className="p-3 font-medium">{pat?.name}</td>
                  <td className="p-3 text-muted-foreground">{doc?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{sp?.name || "—"}</td>
                  <td className="p-3 font-semibold">{formatMoney(i.amount)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${invoiceBadgeClass[i.status]}`}>{i.status}</span></td>
                  <td className="p-3 capitalize text-muted-foreground">{i.method || "—"}</td>
                  <td className="p-3">
                    {i.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setCobrando(i.id)}>Cobrar</Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => cancelar.mutate(i.id)}>Anular</Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!cobrando} onOpenChange={() => setCobrando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar pago</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Como pago el paciente?</p>
          <div className="grid gap-2">
            {(["efectivo", "tarjeta", "transferencia"] as PaymentMethod[]).map((m) => (
              <Button key={m} variant="outline" className="justify-start capitalize"
                disabled={marcarPagado.isPending}
                onClick={() => cobrando && pagar(cobrando, m)}>
                {m}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {nuevoCobro && <NewInvoiceDialog onClose={() => setNuevoCobro(false)} />}
    </div>
  );
}

function NewInvoiceDialog({ onClose }: { onClose: () => void }) {
  const { data: clinic } = useClinic();
  const { data: patients = [] } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const crear = useCreateInvoice();

  const [patientId, setPatientId] = useState("");
  const [appointmentId, setAppointmentId] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | "pendiente">("efectivo");
  const [notes, setNotes] = useState("");

  const citasDelPaciente = appointments.filter((a) => a.patientId === patientId);

  const guardar = async () => {
    if (!clinic) return;
    if (!patientId || amount <= 0) { toast.error("Elige paciente y monto"); return; }
    try {
      await crear.mutateAsync({
        clinicId: clinic.id,
        patientId,
        appointmentId: appointmentId || null,
        amount,
        method: method === "pendiente" ? null : method,
        notes,
      });
      toast.success(method === "pendiente" ? "Cobro pendiente creado" : "Cobro registrado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cobro</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Paciente</Label>
            <Select value={patientId} onValueChange={(v) => { setPatientId(v); setAppointmentId(""); }}>
              <SelectTrigger><SelectValue placeholder="Elige un paciente" /></SelectTrigger>
              <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {patientId && citasDelPaciente.length > 0 && (
            <div><Label>Cita asociada (opcional)</Label>
              <Select value={appointmentId} onValueChange={setAppointmentId}>
                <SelectTrigger><SelectValue placeholder="Sin cita" /></SelectTrigger>
                <SelectContent>
                  {citasDelPaciente.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{formatDate(a.date)} {a.time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Monto (MXN)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
          <div><Label>Metodo</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod | "pendiente")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="pendiente">Dejar pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={crear.isPending}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== GASTOS ============== */
function ExpensesTab() {
  const { data: gastos = [], isLoading } = useGastos();
  const { data: doctors = [] } = useDoctors();
  const { data: clinic } = useClinic();
  const borrar = useBorrarGasto();

  const [creando, setCreando] = useState(false);
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(todayISO());
  const [filtroDoctor, setFiltroDoctor] = useState("all");

  const enRango = gastos.filter((g) => g.date >= desde && g.date <= hasta);
  const filtrados = enRango.filter((g) => {
    if (filtroDoctor === "all") return true;
    if (filtroDoctor === "clinica") return g.doctorId === null;
    return g.doctorId === filtroDoctor;
  });

  const total = filtrados.reduce((s, g) => s + g.amount, 0);
  const generales = enRango.filter((g) => g.doctorId === null).reduce((s, g) => s + g.amount, 0);

  // Solo los medicos con gasto en el periodo; el resto no aporta nada
  const porMedico = doctors
    .map((d) => ({ doctor: d, total: enRango.filter((g) => g.doctorId === d.id).reduce((s, g) => s + g.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label className="text-xs">Desde</Label><Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} /></div>
        <div><Label className="text-xs">Hasta</Label><Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} /></div>
        <div>
          <Label className="text-xs">Imputado a</Label>
          <Select value={filtroDoctor} onValueChange={setFiltroDoctor}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="clinica">Solo generales de la clinica</SelectItem>
              {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button className="ml-auto" onClick={() => setCreando(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo gasto
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={Wallet} label="Gastos del periodo" value={formatMoney(total)} color="bg-rose-500" />
        <Kpi icon={Settings} label="Generales de la clinica" value={formatMoney(generales)} color="bg-slate-500" />
        <Kpi icon={UserCog} label="Imputados a medicos" value={formatMoney(enRango.reduce((s, g) => s + (g.doctorId ? g.amount : 0), 0))} color="bg-amber-500" />
      </div>

      {porMedico.length > 0 && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 font-semibold">Gasto por medico</h3>
          <div className="space-y-2">
            {porMedico.map(({ doctor, total: t }) => (
              <div key={doctor.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{doctor.name}</span>
                {/* Barra proporcional al mayor, para comparar de un vistazo */}
                <div className="h-2 w-32 overflow-hidden rounded-full bg-accent">
                  <div className="h-full bg-rose-400" style={{ width: `${(t / porMedico[0].total) * 100}%` }} />
                </div>
                <span className="w-28 text-right font-semibold">{formatMoney(t)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Concepto</th>
              <th className="p-3">Imputado a</th><th className="p-3 text-right">Importe</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Ningun gasto con esos filtros.</td></tr>
            )}
            {filtrados.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-3">{formatDate(g.date)}</td>
                <td className="p-3 font-medium">
                  {g.concept}
                  {g.notes && <span className="block text-xs text-muted-foreground">{g.notes}</span>}
                </td>
                <td className="p-3 text-muted-foreground">
                  {g.doctorId
                    ? doctors.find((d) => d.id === g.doctorId)?.name ?? "Medico dado de baja"
                    : "Clinica"}
                </td>
                <td className="p-3 text-right font-semibold">{formatMoney(g.amount)}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => borrar.mutate(g.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && clinic && (
        <NuevoGastoDialog clinicId={clinic.id} doctors={doctors} onClose={() => setCreando(false)} />
      )}
    </div>
  );
}

/** Conceptos habituales, para no escribirlos a mano cada vez. */
const CONCEPTOS_SUGERIDOS = [
  "Material clinico", "Alquiler", "Servicios (luz, agua, internet)",
  "Nomina", "Comision del medico", "Limpieza", "Publicidad", "Equipamiento",
];

function NuevoGastoDialog({
  clinicId, doctors, onClose,
}: {
  clinicId: string; doctors: Doctor[]; onClose: () => void;
}) {
  const crear = useCrearGasto();
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [doctorId, setDoctorId] = useState("clinica");
  const [notes, setNotes] = useState("");

  const guardar = async () => {
    if (!concept.trim()) { toast.error("Falta el concepto"); return; }
    if (amount <= 0) { toast.error("El importe debe ser mayor que cero"); return; }
    try {
      await crear.mutateAsync({
        clinicId,
        doctorId: doctorId === "clinica" ? null : doctorId,
        concept,
        amount,
        date,
        notes,
      });
      toast.success("Gasto registrado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo gasto</DialogTitle>
          <DialogDescription>
            Imputalo a un medico para saber cuanto cuesta cada consulta, o dejalo
            como gasto general de la clinica.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Concepto</Label>
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Material clinico" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONCEPTOS_SUGERIDOS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcept(c)}
                  className="rounded-full border px-2.5 py-1 text-xs transition hover:border-primary hover:bg-accent"
                >{c}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Importe (MXN)</Label><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></div>
            <div><Label>Fecha</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div>
            <Label>Imputado a</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clinica">Clinica (gasto general)</SelectItem>
                {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas (opcional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={crear.isPending}>
            {crear.isPending ? "Guardando..." : "Registrar gasto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== REPORTES ============== */
function ReportsTab() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: appointments = [] } = useAppointments();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();
  const { data: clinic } = useClinic();

  const desdeMes = inicioDeMes();

  // Periodo del reporte imprimible: por defecto, el mes en curso
  const [desde, setDesde] = useState(desdeMes);
  const [hasta, setHasta] = useState(todayISO());
  const [previaAbierta, setPreviaAbierta] = useState(false);

  const datosReporte = useDatosDelReporte({ appointments, invoices, doctors, services, desde, hasta });

  // Bug B4: antes sumaba TODO el historico bajo la etiqueta "del mes"
  const monthIncome = invoices
    .filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= desdeMes)
    .reduce((s, i) => s + i.amount, 0);

  const total = appointments.length;
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const rate = total ? Math.round((noShows / total) * 100) : 0;

  const docCount: Record<string, number> = {};
  appointments.forEach((a) => { docCount[a.doctorId] = (docCount[a.doctorId] || 0) + 1; });
  const topDocId = Object.entries(docCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topDoc = doctors.find((d) => d.id === topDocId);

  const hourCount: Record<string, number> = {};
  appointments.forEach((a) => { const h = a.time.slice(0, 2); hourCount[h] = (hourCount[h] || 0) + 1; });
  const topHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const weeks = useMemo(() => {
    const out: { week: string; amount: number }[] = [];
    const hoy = todayISO();
    for (let i = 3; i >= 0; i--) {
      const fin = sumarDias(hoy, -i * 7);
      const ini = sumarDias(fin, -6);
      const amt = invoices
        .filter((iv) => iv.status === "paid" && iv.paidAt && iv.paidAt >= ini && iv.paidAt <= fin)
        .reduce((s, x) => s + x.amount, 0);
      out.push({ week: `Sem ${4 - i}`, amount: amt });
    }
    return out;
  }, [invoices]);

  const pieData = [
    { name: "Completadas", value: appointments.filter((a) => a.status === "completed").length, color: "oklch(0.70 0.17 150)" },
    { name: "No-shows", value: noShows, color: "oklch(0.62 0.22 25)" },
    { name: "Canceladas", value: appointments.filter((a) => a.status === "cancelled").length, color: "oklch(0.65 0.03 250)" },
  ];

  if (isLoading) return <Cargando />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Reporte para imprimir: oculto en pantalla, visible al imprimir */}
      <ReporteImprimible clinic={clinic} datos={datosReporte} desde={desde} hasta={hasta} />

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div>
          <Label className="text-xs">Desde</Label>
          <Input type="date" className="w-40" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Hasta</Label>
          <Input type="date" className="w-40" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Button disabled={desde > hasta} onClick={() => setPreviaAbierta(true)}>
          <Eye className="mr-1 h-4 w-4" /> Ver reporte
        </Button>
        <p className="text-xs text-muted-foreground">
          {desde > hasta
            ? "La fecha inicial no puede ser posterior a la final."
            : `${datosReporte.filas.length} medico(s) con actividad · ${formatMoney(datosReporte.totales.ingresos)} cobrados`}
        </p>
      </div>

      {previaAbierta && (
        <VistaPreviaReporte
          clinic={clinic}
          datos={datosReporte}
          desde={desde}
          hasta={hasta}
          onClose={() => setPreviaAbierta(false)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="Ingresos del mes" value={formatMoney(monthIncome)} color="bg-emerald-500" />
        <Kpi icon={XCircle} label="Tasa no-show" value={`${rate}%`} color="bg-rose-500" />
        <Kpi icon={UserCog} label="Doctor mas activo" value={topDoc?.name.split(" ").slice(0, 2).join(" ") || "—"} color="bg-blue-500" />
        <Kpi icon={Calendar} label="Hora pico" value={topHour ? `${topHour}:00` : "—"} color="bg-amber-500" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Ingresos por semana</h3>
          <div className="h-64">
            <ResponsiveContainer><BarChart data={weeks}>
              <XAxis dataKey="week" tickLine={false} axisLine={false} className="text-xs" />
              <YAxis tickLine={false} axisLine={false} className="text-xs" />
              <RTooltip />
              <Bar dataKey="amount" fill="oklch(0.70 0.17 150)" radius={[8, 8, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Distribucion de citas</h3>
          <div className="h-64">
            <ResponsiveContainer><PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <RTooltip />
            </PieChart></ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {pieData.map((d) => (
              <span key={d.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== CONFIGURACION ============== */
function ConfigTab({ onRelanzarWizard }: { onRelanzarWizard: () => void }) {
  const { data: clinic, isLoading } = useClinic();
  const actualizar = useUpdateClinic();
  const [form, setForm] = useState<Clinic | null>(null);

  const valores = form ?? clinic ?? null;

  const guardar = async () => {
    if (!clinic || !valores) return;
    try {
      await actualizar.mutateAsync({ id: clinic.id, patch: valores });
      toast.success("Configuracion guardada");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading || !valores) return <Cargando />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Datos de la clinica</h3>
        <div className="mb-4">
          <ImageUpload
            value={valores.logo}
            onChange={(url) => setForm({ ...valores, logo: url })}
            carpeta="clinics"
            entidadId={valores.id}
            nombre={valores.name}
            forma="cuadrado"
            etiqueta="Logo de la clinica"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nombre</Label><Input value={valores.name} onChange={(e) => setForm({ ...valores, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Direccion</Label><Input value={valores.address} onChange={(e) => setForm({ ...valores, address: e.target.value })} /></div>
          <div><Label>Telefono</Label><Input value={valores.phone} onChange={(e) => setForm({ ...valores, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={valores.email} onChange={(e) => setForm({ ...valores, email: e.target.value })} /></div>
          <div><Label>Apertura</Label><Input type="time" value={valores.openTime} onChange={(e) => setForm({ ...valores, openTime: e.target.value })} /></div>
          <div><Label>Cierre</Label><Input type="time" value={valores.closeTime} onChange={(e) => setForm({ ...valores, closeTime: e.target.value })} /></div>
        </div>
        <Button onClick={guardar} className="mt-4" disabled={actualizar.isPending}>
          {actualizar.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <ServiciosEditables />

      <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold">Asistente de puesta en marcha</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Repasa los datos de la clinica, doctores y servicios paso a paso.
        </p>
        <Button variant="outline" className="mt-3" onClick={onRelanzarWizard}>
          Volver a ejecutarlo
        </Button>
      </div>

      <ResetDemo />
    </div>
  );
}

/**
 * Vista previa antes de imprimir o descargar.
 *
 * Muestra el MISMO componente `Documento` que se imprime, asi que lo que se
 * ve es literalmente lo que sale: no hay dos maquetas que puedan
 * desincronizarse.
 *
 * El dialogo lleva `no-impresion` porque Radix lo monta en `body` por
 * portal: sin eso, al imprimir saldrian tambien los botones y el marco.
 */
function VistaPreviaReporte({
  clinic, datos, desde, hasta, onClose,
}: {
  clinic: Clinic | null | undefined;
  datos: ReturnType<typeof useDatosDelReporte>;
  desde: string;
  hasta: string;
  onClose: () => void;
}) {
  const descargarCsv = () => {
    const nombre = `reporte-${(clinic?.name ?? "clinica").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${desde}_a_${hasta}.csv`;
    descargarTexto(nombre, reporteACsv({ clinic, datos, desde, hasta }));
    toast.success("Reporte descargado");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="no-impresion max-h-[92vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Vista previa del reporte</DialogTitle>
          <DialogDescription>
            Esto es exactamente lo que se imprime o se guarda como PDF.
          </DialogDescription>
        </DialogHeader>

        {/* El documento va sobre gris para que se lea como una hoja */}
        <div className="max-h-[62vh] overflow-y-auto bg-neutral-200 p-4">
          <div className="mx-auto max-w-3xl bg-white shadow-md">
            <Documento clinic={clinic} datos={datos} desde={desde} hasta={hasta} className="" />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 border-t px-6 py-4">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={descargarCsv}>
            <Download className="mr-1 h-4 w-4" /> Descargar CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Imprimir o guardar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reset de la demo, que pide el PRD.
 *
 * No borra nada: recoloca las citas y cobros del seed sobre el dia de hoy.
 * Las reservas hechas durante la demo se quedan, y se avisa de ello.
 */
function ResetDemo() {
  const reset = useResetDemoData();
  const [confirmar, setConfirmar] = useState(false);

  const ejecutar = async () => {
    try {
      const mensaje = await reset.mutateAsync();
      toast.success(mensaje);
      setConfirmar(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="font-semibold">Datos de demostracion</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Devuelve las citas y cobros de ejemplo al dia de hoy. Util cuando la demo lleva
        dias sin usarse y la agenda aparece vacia.
      </p>
      <Button variant="outline" className="mt-3" onClick={() => setConfirmar(true)}>
        <RotateCcw className="mr-1 h-4 w-4" /> Restablecer demo
      </Button>

      <Dialog open={confirmar} onOpenChange={() => setConfirmar(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restablecer los datos de demostracion?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Las 10 citas y 3 cobros de ejemplo vuelven a su estado inicial,
                  recolocados sobre hoy.</p>
                <p className="text-muted-foreground">
                  Las citas y pacientes creados despues <strong>no se tocan</strong>.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={ejecutar} disabled={reset.isPending}>
              {reset.isPending ? "Restableciendo..." : "Restablecer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Hueco 5 de ESTADO.md: los servicios y sus precios no eran editables. */
function ServiciosEditables() {
  const { data: clinic } = useClinic();
  const { data: services = [] } = useServices();
  const crear = useCreateService();
  const actualizar = useUpdateService();
  const borrar = useDeleteService();

  const [editando, setEditando] = useState<Service | null>(null);
  const [creando, setCreando] = useState(false);

  const vacio: Omit<Service, "id" | "active"> = {
    clinicId: clinic?.id ?? "",
    name: "",
    duration: 30,
    price: 0,
    description: "",
    icon: "Stethoscope",
  };
  const [form, setForm] = useState(vacio);

  const abrirCrear = () => { setForm({ ...vacio, clinicId: clinic?.id ?? "" }); setCreando(true); };
  const abrirEditar = (s: Service) => {
    setForm({ clinicId: s.clinicId, name: s.name, duration: s.duration, price: s.price, description: s.description, icon: s.icon });
    setEditando(s);
  };

  const guardar = async () => {
    if (!form.name.trim()) { toast.error("Falta el nombre"); return; }
    if (form.duration <= 0) { toast.error("La duracion debe ser mayor que cero"); return; }
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, patch: form });
        toast.success("Servicio actualizado");
      } else {
        await crear.mutateAsync(form);
        toast.success("Servicio creado");
      }
      setEditando(null); setCreando(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async (s: Service) => {
    try {
      await borrar.mutateAsync(s.id);
      toast.success("Servicio eliminado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Servicios y precios</h3>
          <p className="text-xs text-muted-foreground">La duracion define el bloque que ocupa en agenda.</p>
        </div>
        <Button size="sm" onClick={abrirCrear}><Plus className="mr-1 h-4 w-4" /> Añadir</Button>
      </div>

      <div className="space-y-2">
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.duration} min · {formatMoney(s.price)}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => abrirEditar(s)}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => eliminar(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={creando || !!editando} onOpenChange={() => { setCreando(false); setEditando(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editando ? "Editar servicio" : "Nuevo servicio"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duracion (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} /></div>
              <div><Label>Precio (MXN)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Descripcion</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Icono (Lucide)</Label><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Stethoscope" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreando(false); setEditando(null); }}>Cancelar</Button>
            <Button onClick={guardar} disabled={crear.isPending || actualizar.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
