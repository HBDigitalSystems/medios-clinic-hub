import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Calendar as CalIcon, Check, Stethoscope, SmilePlus, Baby, Scan, Apple, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import { generateTimeSlots, formatDateLong } from "@/lib/medi-utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope, SmilePlus, Baby, Scan, Apple,
};

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Agendar Cita - MediOS" },
      { name: "description", content: "Reserva tu cita medica en linea en pocos pasos." },
    ],
  }),
  component: BookingFlow,
});

const STEPS = ["Especialidad", "Doctor", "Fecha y hora", "Tus datos", "Confirmacion"];

function BookingFlow() {
  const navigate = useNavigate();
  const { specialties, doctors, appointments, addAppointment, addPatient, patients } = useStore();
  const [step, setStep] = useState(0);
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", reason: "" });
  const [done, setDone] = useState(false);

  const specialty = specialties.find((s) => s.id === specialtyId);
  const doctor = doctors.find((d) => d.id === doctorId);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const confirm = () => {
    let patient = patients.find((p) => p.phone === form.phone);
    if (!patient) {
      patient = addPatient({ name: form.name, phone: form.phone, email: form.email, birthDate: "1990-01-01" });
    }
    const apt = addAppointment({
      patientId: patient.id,
      doctorId,
      specialtyId,
      date,
      time,
      duration: specialty?.duration || 30,
      reason: form.reason,
    });
    if (!apt) {
      toast.error("Ese horario ya esta ocupado. Elige otro.");
      setStep(2);
      return;
    }
    toast.success("Cita confirmada!");
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/20 p-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <Check className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold">Tu cita esta confirmada</h1>
          <p className="mt-2 text-sm text-muted-foreground">Te enviaremos un recordatorio 24h antes.</p>
          <div className="mt-6 space-y-2 rounded-2xl bg-accent/40 p-4 text-left text-sm">
            <p><span className="text-muted-foreground">Doctor:</span> <span className="font-medium">{doctor?.name}</span></p>
            <p><span className="text-muted-foreground">Servicio:</span> <span className="font-medium">{specialty?.name}</span></p>
            <p><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{formatDateLong(date)}</span></p>
            <p><span className="text-muted-foreground">Hora:</span> <span className="font-medium">{time}</span></p>
            <p><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{form.name}</span></p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild><Link to="/">Volver al inicio</Link></Button>
            <Button asChild variant="outline"><Link to="/patient">Ver mis citas</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-accent/20">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <span className="font-bold">MediOS</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && <div className={`h-1 flex-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-medium">{STEPS[step]}</p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm md:p-8">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {specialties.map((s) => {
                const Icon = iconMap[s.icon] || Stethoscope;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setSpecialtyId(s.id); next(); }}
                    className={`rounded-2xl border-2 p-5 text-left transition hover:border-primary hover:bg-accent/40 ${specialtyId === s.id ? "border-primary bg-accent/40" : "border-border"}`}
                  >
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 font-semibold">{s.name}</h3>
                    <p className="text-sm text-muted-foreground">{s.duration} min · ${s.price} MXN</p>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4">
              {doctors.filter((d) => d.specialtyId === specialtyId && d.active).map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setDoctorId(d.id); next(); }}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition hover:border-primary hover:bg-accent/40 ${doctorId === d.id ? "border-primary bg-accent/40" : "border-border"}`}
                >
                  <img src={d.photo} alt={d.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{d.name}</h3>
                    <p className="text-sm text-muted-foreground">{specialty?.name}</p>
                    <p className="mt-1 text-xs text-primary">Disponible {d.schedule.start} - {d.schedule.end}</p>
                  </div>
                </button>
              ))}
              {doctors.filter((d) => d.specialtyId === specialtyId && d.active).length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No hay doctores disponibles para esta especialidad.</p>
              )}
            </div>
          )}

          {step === 2 && doctor && (
            <DateTimeStep doctor={doctor} appointments={appointments} duration={specialty?.duration || 30} date={date} time={time} onPick={(d, t) => { setDate(d); setTime(t); }} />
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="reason">Motivo de consulta</Label>
                <Textarea id="reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Confirma tu cita</h3>
              <div className="space-y-3 rounded-2xl bg-accent/30 p-4 text-sm">
                <Row label="Especialidad" value={specialty?.name || ""} />
                <Row label="Doctor" value={doctor?.name || ""} />
                <Row label="Fecha" value={formatDateLong(date)} />
                <Row label="Hora" value={time} />
                <Row label="Duracion" value={`${specialty?.duration} min`} />
                <Row label="Paciente" value={form.name} />
                <Row label="Telefono" value={form.phone} />
                <Row label="Motivo" value={form.reason || "—"} />
                <Row label="Costo" value={`$${specialty?.price} MXN`} />
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}><ArrowLeft className="mr-1 h-4 w-4" /> Atras</Button>
            ) : <span />}
            {step === 4 ? (
              <Button onClick={confirm} size="lg" className="ml-auto"><Check className="mr-1 h-4 w-4" /> Confirmar Cita</Button>
            ) : step === 2 ? (
              <Button disabled={!date || !time} onClick={next} className="ml-auto">Continuar <ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : step === 3 ? (
              <Button disabled={!form.name || !form.phone || !form.email} onClick={next} className="ml-auto">Continuar <ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function DateTimeStep({
  doctor, appointments, duration, date, time, onPick,
}: {
  doctor: any; appointments: any[]; duration: number; date: string; time: string;
  onPick: (d: string, t: string) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthLabel = cursor.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7; // Mon=0

  const allSlots = generateTimeSlots(doctor.schedule.start, doctor.schedule.end, duration);

  const isDayAvailable = (d: Date) => {
    if (d < today) return false;
    const weekday = ((d.getDay() + 6) % 7) + 1; // Mon=1
    return doctor.schedule.days.includes(weekday);
  };

  const takenSlots = (iso: string) =>
    new Set(
      appointments
        .filter((a) => a.doctorId === doctor.id && a.date === iso && !["cancelled", "no_show"].includes(a.status))
        .map((a) => a.time),
    );

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonthOffset(monthOffset - 1)} className="rounded-md p-1 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-semibold capitalize">{monthLabel}</span>
          <button onClick={() => setMonthOffset(monthOffset + 1)} className="rounded-md p-1 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const iso = c.toISOString().slice(0, 10);
            const available = isDayAvailable(c);
            const selected = date === iso;
            return (
              <button
                key={i}
                disabled={!available}
                onClick={() => onPick(iso, "")}
                className={`aspect-square rounded-lg text-sm transition ${
                  selected ? "bg-primary text-primary-foreground font-bold" :
                  available ? "hover:bg-accent" : "text-muted-foreground/40 cursor-not-allowed"
                }`}
              >
                {c.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h4 className="mb-3 flex items-center gap-2 font-semibold"><CalIcon className="h-4 w-4" /> Horarios</h4>
        {!date ? (
          <p className="text-sm text-muted-foreground">Selecciona un dia primero.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {allSlots.map((s) => {
              const taken = takenSlots(date).has(s);
              if (taken) return null;
              return (
                <button
                  key={s}
                  onClick={() => onPick(date, s)}
                  className={`rounded-lg border py-2 text-sm transition ${
                    time === s ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:bg-accent"
                  }`}
                >{s}</button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
