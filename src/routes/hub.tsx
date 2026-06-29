import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard, Calendar, UserCog, Users, CreditCard, BarChart3, Settings,
  Stethoscope, LogOut, RotateCcw, Plus, CheckCircle, XCircle, UserPlus, DollarSign,
  Search, AlertCircle, X, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, PieChart, Pie, Cell } from "recharts";
import { useStore, getPatientBalance } from "@/lib/store";
import { statusBadgeClass, statusLabel, invoiceBadgeClass, doctorColor, formatMoney, todayISO, formatDate } from "@/lib/medi-utils";
import type { AppointmentStatus } from "@/lib/types";

export const Route = createFileRoute("/hub")({
  head: () => ({ meta: [{ title: "Panel Admin - MediOS" }] }),
  component: Hub,
});

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "agenda", label: "Agenda", icon: Calendar },
  { key: "doctores", label: "Doctores", icon: UserCog },
  { key: "pacientes", label: "Pacientes", icon: Users },
  { key: "cobros", label: "Cobros", icon: CreditCard },
  { key: "reportes", label: "Reportes", icon: BarChart3 },
  { key: "config", label: "Configuracion", icon: Settings },
] as const;

type TabKey = typeof TABS[number]["key"];

function Hub() {
  const navigate = useNavigate();
  const { reset, setCurrentUser, clinic } = useStore();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  const logout = () => { setCurrentUser(null); navigate({ to: "/auth" }); };
  const handleReset = () => { reset(); toast.success("Datos demo restablecidos"); };

  return (
    <div className="flex min-h-screen bg-accent/10">
      {/* Sidebar desktop */}
      <aside className={`hidden border-r bg-sidebar md:flex md:flex-col ${collapsed ? "w-16" : "w-60"} transition-all`}>
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-4 w-4" />
            </div>
            {!collapsed && <span className="truncate font-bold">MediOS</span>}
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
          <button onClick={handleReset} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <RotateCcw className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Reset demo</span>}
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{TABS.find((t) => t.key === tab)?.label}</h1>
            <p className="truncate text-xs text-muted-foreground">{clinic.name}</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="md:hidden">
            <Link to="/"><Stethoscope className="h-4 w-4" /></Link>
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "agenda" && <AgendaTab />}
          {tab === "doctores" && <DoctorsTab />}
          {tab === "pacientes" && <PatientsTab />}
          {tab === "cobros" && <InvoicesTab />}
          {tab === "reportes" && <ReportsTab />}
          {tab === "config" && <ConfigTab />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-7 border-t bg-background md:hidden">
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

/* ============== DASHBOARD ============== */
function DashboardTab() {
  const { appointments, invoices, patients } = useStore();
  const today = todayISO();
  const todayApts = appointments.filter((a) => a.date === today);
  const completed = appointments.filter((a) => a.status === "completed").length;
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const todayIncome = invoices.filter((i) => i.paidAt === today && i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const monthIncome = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  const last7: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    last7.push({ day: d.toLocaleDateString("es-MX", { weekday: "short" }), count: appointments.filter((a) => a.date === iso).length });
  }

  const alerts = [
    ...appointments.filter((a) => a.status === "scheduled").slice(0, 3).map((a) => ({ type: "Cita sin confirmar", text: `${a.date} ${a.time}` })),
    ...invoices.filter((i) => i.status === "pending").map((i) => ({ type: "Cobro pendiente", text: formatMoney(i.amount) })),
  ];

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
                <YAxis tickLine={false} axisLine={false} className="text-xs" />
                <RTooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" fill="oklch(0.55 0.20 258)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4 text-amber-500" /> Alertas</h3>
          <ul className="space-y-2 text-sm">
            {alerts.length === 0 && <li className="text-muted-foreground">Todo en orden ✅</li>}
            {alerts.map((a, i) => (
              <li key={i} className="rounded-lg bg-accent/40 px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">{a.type}</p>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border bg-accent/20 p-3 text-xs text-muted-foreground">
            Ingresos del mes: <span className="font-semibold text-foreground">{formatMoney(monthIncome)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
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
  const { appointments, doctors, patients } = useStore();
  const [view, setView] = useState<"day" | "week">("day");
  const [dateOffset, setDateOffset] = useState(0);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const base = new Date(); base.setDate(base.getDate() + dateOffset);

  const days = view === "day" ? [base] : [...Array(7)].map((_, i) => {
    const d = new Date(base); d.setDate(base.getDate() - base.getDay() + i + 1); return d;
  });

  const apt = appointments.find((a) => a.id === selectedApt);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDateOffset(dateOffset - (view === "day" ? 1 : 7))}>‹</Button>
          <span className="font-semibold capitalize">{days[0].toLocaleDateString("es-MX", { day: "numeric", month: "long" })}{view === "week" ? ` - ${days[6].toLocaleDateString("es-MX", { day: "numeric", month: "long" })}` : ""}</span>
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
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
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

      {apt && <AppointmentDialog id={apt.id} onClose={() => setSelectedApt(null)} />}
      {newOpen && <NewAppointmentDialog onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function AppointmentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { appointments, doctors, patients, specialties, updateAppointmentStatus } = useStore();
  const a = appointments.find((x) => x.id === id)!;
  const doc = doctors.find((d) => d.id === a.doctorId);
  const pat = patients.find((p) => p.id === a.patientId);
  const sp = specialties.find((s) => s.id === a.specialtyId);

  const change = (next: AppointmentStatus) => {
    const r = updateAppointmentStatus(a.id, next);
    if (!r.ok) toast.error(r.error || "Error");
    else toast.success("Estado actualizado");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de cita</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="Paciente" value={pat?.name || ""} />
          <Row label="Doctor" value={doc?.name || ""} />
          <Row label="Servicio" value={sp?.name || ""} />
          <Row label="Fecha" value={formatDate(a.date)} />
          <Row label="Hora" value={a.time} />
          <Row label="Motivo" value={a.reason} />
          <div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span></div>
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          {a.status === "scheduled" && <Button size="sm" onClick={() => change("confirmed")}>Confirmar</Button>}
          {(a.status === "scheduled" || a.status === "confirmed") && <Button size="sm" variant="outline" onClick={() => change("cancelled")}>Cancelar</Button>}
          {(a.status === "scheduled" || a.status === "confirmed") && <Button size="sm" variant="outline" onClick={() => change("no_show")}>No-show</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAppointmentDialog({ onClose }: { onClose: () => void }) {
  const { patients, doctors, specialties, addAppointment } = useStore();
  const [patientId, setPatientId] = useState(patients[0]?.id || "");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || "");
  const [specialtyId, setSpecialtyId] = useState(specialties[0]?.id || "");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");

  const submit = () => {
    const sp = specialties.find((s) => s.id === specialtyId);
    const apt = addAppointment({ patientId, doctorId, specialtyId, date, time, duration: sp?.duration || 30, reason });
    if (!apt) { toast.error("Horario ocupado"); return; }
    toast.success("Cita creada");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nueva cita</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Paciente</Label>
            <Select value={patientId} onValueChange={setPatientId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Doctor</Label>
            <Select value={doctorId} onValueChange={setDoctorId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Servicio</Label>
            <Select value={specialtyId} onValueChange={setSpecialtyId}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{specialties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
          <Button onClick={submit}>Crear cita</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

/* ============== DOCTORS ============== */
function DoctorsTab() {
  const { doctors, specialties, appointments, toggleDoctorActive, addDoctor } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", specialtyId: specialties[0]?.id || "", photo: "", start: "09:00", end: "17:00", bio: "" });

  const submit = () => {
    if (!form.name) { toast.error("Falta el nombre"); return; }
    addDoctor({
      name: form.name, specialtyId: form.specialtyId,
      photo: form.photo || "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop",
      schedule: { days: [1, 2, 3, 4, 5], start: form.start, end: form.end }, active: true, bio: form.bio,
    });
    toast.success("Doctor agregado");
    setOpen(false);
    setForm({ name: "", specialtyId: specialties[0]?.id || "", photo: "", start: "09:00", end: "17:00", bio: "" });
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Agregar Doctor</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.map((d) => {
          const sp = specialties.find((s) => s.id === d.specialtyId);
          const weekApts = appointments.filter((a) => a.doctorId === d.id).length;
          const noShows = appointments.filter((a) => a.doctorId === d.id && a.status === "no_show").length;
          return (
            <div key={d.id} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <img src={d.photo} alt={d.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{d.name}</h3>
                  <p className="truncate text-sm text-primary">{sp?.name}</p>
                </div>
                <Switch checked={d.active} onCheckedChange={() => toggleDoctorActive(d.id)} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Horario: L-V {d.schedule.start} - {d.schedule.end}</p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-accent px-2 py-1">{weekApts} citas</span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">{noShows} no-shows</span>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar Doctor</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Especialidad</Label>
              <Select value={form.specialtyId} onValueChange={(v) => setForm({ ...form, specialtyId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{specialties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Foto URL (opcional)</Label><Input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Inicio</Label><Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></div>
              <div><Label>Fin</Label><Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></div>
            </div>
            <div><Label>Bio</Label><Textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit}>Agregar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============== PATIENTS ============== */
function PatientsTab() {
  const { patients, appointments, invoices, doctors } = useStore();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone.includes(q));
  const sel = patients.find((p) => p.id === selected);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nombre o telefono..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nombre</th><th className="p-3">Telefono</th><th className="p-3">Ultima visita</th><th className="p-3">Balance</th></tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const last = [...appointments].filter((a) => a.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              const bal = getPatientBalance(p.id, invoices);
              return (
                <tr key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer border-t transition hover:bg-accent/30">
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

      <Dialog open={!!sel} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{sel?.name}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p><span className="text-muted-foreground">Telefono:</span> {sel.phone}</p>
                <p><span className="text-muted-foreground">Email:</span> {sel.email}</p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Historial de citas</h4>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {appointments.filter((a) => a.patientId === sel.id).map((a) => {
                    const doc = doctors.find((d) => d.id === a.doctorId);
                    return (
                      <div key={a.id} className="flex items-center justify-between rounded-lg bg-accent/30 p-2 text-xs">
                        <div>
                          <p className="font-medium">{formatDate(a.date)} {a.time}</p>
                          <p className="text-muted-foreground">{doc?.name}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 ${statusBadgeClass[a.status]}`}>{statusLabel[a.status]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============== INVOICES ============== */
function InvoicesTab() {
  const { invoices, appointments, patients, doctors, specialties } = useStore();
  const [status, setStatus] = useState<string>("all");
  const [doctorId, setDoctorId] = useState<string>("all");

  const filtered = invoices.filter((i) => {
    if (status !== "all" && i.status !== status) return false;
    const apt = appointments.find((a) => a.id === i.appointmentId);
    if (doctorId !== "all" && apt?.doctorId !== doctorId) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorId} onValueChange={setDoctorId}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los doctores</SelectItem>
            {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-accent/30 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Fecha</th><th className="p-3">Paciente</th><th className="p-3">Doctor</th>
              <th className="p-3">Servicio</th><th className="p-3">Monto</th><th className="p-3">Estado</th><th className="p-3">Metodo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const apt = appointments.find((a) => a.id === i.appointmentId);
              const pat = patients.find((p) => p.id === i.patientId);
              const doc = doctors.find((d) => d.id === apt?.doctorId);
              const sp = specialties.find((s) => s.id === apt?.specialtyId);
              return (
                <tr key={i.id} className="border-t">
                  <td className="p-3">{i.createdAt}</td>
                  <td className="p-3 font-medium">{pat?.name}</td>
                  <td className="p-3 text-muted-foreground">{doc?.name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{sp?.name || "—"}</td>
                  <td className="p-3 font-semibold">{formatMoney(i.amount)}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${invoiceBadgeClass[i.status]}`}>{i.status}</span></td>
                  <td className="p-3 capitalize text-muted-foreground">{i.method || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============== REPORTS ============== */
function ReportsTab() {
  const { invoices, appointments, doctors } = useStore();
  const monthIncome = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
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

  const weeks: { week: string; amount: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(); start.setDate(start.getDate() - i * 7 - 6);
    const end = new Date(); end.setDate(end.getDate() - i * 7);
    const sIso = start.toISOString().slice(0, 10);
    const eIso = end.toISOString().slice(0, 10);
    const amt = invoices.filter((iv) => iv.status === "paid" && iv.paidAt && iv.paidAt >= sIso && iv.paidAt <= eIso).reduce((s, x) => s + x.amount, 0);
    weeks.push({ week: `Sem ${4 - i}`, amount: amt });
  }

  const pieData = [
    { name: "Completadas", value: appointments.filter((a) => a.status === "completed").length, color: "oklch(0.70 0.17 150)" },
    { name: "No-shows", value: noShows, color: "oklch(0.62 0.22 25)" },
    { name: "Canceladas", value: appointments.filter((a) => a.status === "cancelled").length, color: "oklch(0.65 0.03 250)" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
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
              <span key={d.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}: {d.value}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== CONFIG ============== */
function ConfigTab() {
  const { clinic, updateClinic } = useStore();
  const [form, setForm] = useState(clinic);
  const save = () => { updateClinic(form); toast.success("Configuracion guardada"); };
  return (
    <div className="p-4 md:p-6">
      <div className="max-w-2xl rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Datos de la clinica</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Direccion</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Telefono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Apertura</Label><Input type="time" value={form.openTime} onChange={(e) => setForm({ ...form, openTime: e.target.value })} /></div>
          <div><Label>Cierre</Label><Input type="time" value={form.closeTime} onChange={(e) => setForm({ ...form, closeTime: e.target.value })} /></div>
        </div>
        <Button onClick={save} className="mt-4">Guardar</Button>
      </div>
    </div>
  );
}
