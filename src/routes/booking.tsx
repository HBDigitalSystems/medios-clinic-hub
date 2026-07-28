import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Calendar as CalIcon, Check, Stethoscope, SmilePlus, Baby, Scan,
  Apple, ChevronLeft, ChevronRight, UserPlus, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClinic } from "@/lib/api/clinic";
import { useServices } from "@/lib/api/services";
import { useActiveDoctors } from "@/lib/api/doctors";
import {
  crearCita, useDoctorBusyBlocks, useDoctorNextSlots, type FreeSlot,
} from "@/lib/api/appointments";
import { crearMiFicha, usePatientByUserId } from "@/lib/api/patients";
import { useAuth } from "@/lib/auth";
import type { Doctor } from "@/lib/api/types";
import {
  generateTimeSlots, formatDate, formatDateLong, rangesOverlap, isoLocal, todayISO, horaActual,
} from "@/lib/medi-utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope, SmilePlus, Baby, Scan, Apple,
};

export const Route = createFileRoute("/booking")({
  head: () => ({
    meta: [
      { title: "Agendar Cita - DoctorCita Clinica" },
      { name: "description", content: "Reserva tu cita medica en linea en pocos pasos." },
    ],
  }),
  component: BookingFlow,
});

/** Los pasos se nombran, no se numeran: con sesion desaparece uno y los indices bailan. */
type PasoId = "especialidad" | "doctor" | "fecha" | "datos" | "confirmacion";

const ETIQUETAS: Record<PasoId, string> = {
  especialidad: "Especialidad",
  doctor: "Doctor",
  fecha: "Fecha y hora",
  datos: "Tus datos",
  confirmacion: "Confirmacion",
};

function BookingFlow() {
  const navigate = useNavigate();
  const { data: clinic } = useClinic();
  const { data: specialties = [] } = useServices();
  const { data: doctors = [] } = useActiveDoctors();

  const { user, session, loading: cargandoSesion } = useAuth();
  const { data: miFicha, isLoading: cargandoFicha } = usePatientByUserId(user?.id);

  const [step, setStep] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [specialtyId, setSpecialtyId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", reason: "" });
  const [done, setDone] = useState(false);

  const specialty = specialties.find((s) => s.id === specialtyId);
  const doctor = doctors.find((d) => d.id === doctorId);

  // Con ficha propia ya sabemos quien eres: el paso de datos sobra
  const saltarDatos = !!miFicha;

  const pasos: PasoId[] = saltarDatos
    ? ["especialidad", "doctor", "fecha", "confirmacion"]
    : ["especialidad", "doctor", "fecha", "datos", "confirmacion"];

  const pasoActual = pasos[step];

  const next = () => setStep((s) => Math.min(s + 1, pasos.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const volverAFecha = () => setStep(pasos.indexOf("fecha"));

  const datosCompletos = !!form.name && !!form.phone && !!form.email;

  const confirm = async () => {
    if (!clinic) {
      toast.error("No se pudo cargar la clinica. Reintenta.");
      return;
    }
    if (!user) return;
    setEnviando(true);
    try {
      // Si ya tiene ficha se reutiliza. Si no (cuenta creada por su cuenta,
      // sin invitacion), se crea ahora, ya vinculada a su user_id.
      const patientId = miFicha?.id ?? (await crearMiFicha({
        clinicId: clinic.id,
        userId: user.id,
        name: form.name,
        phone: form.phone,
        email: form.email,
      }));

      await crearCita({
        clinicId: clinic.id,
        patientId,
        doctorId,
        serviceId: specialtyId,
        date,
        time,
        duration: specialty?.duration || 30,
        reason: form.reason,
      });

      toast.success("Cita confirmada!");
      setDone(true);
    } catch (e) {
      // El mensaje ya viene traducido por mensajeDeError (p. ej. solapamiento)
      toast.error((e as Error).message);
      volverAFecha();
    } finally {
      setEnviando(false);
    }
  };

  // Agendar exige cuenta. La barrera real esta en RLS (`anon` no puede
  // insertar citas ni pacientes); esto es la version amable de lo mismo.
  if (!cargandoSesion && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent/20 p-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Entra para agendar</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Con tu cuenta puedes ver tus citas, reagendarlas o cancelarlas, y consultar
            tus recibos. Crearla lleva menos de un minuto.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg">
              <Link to="/auth" search={{ redirect: "/booking" }}>Entrar o crear cuenta</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (cargandoSesion) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Hasta saber si hay ficha no se sabe cuantos pasos tiene el flujo.
  if (cargandoFicha) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <p><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{miFicha?.name ?? form.name}</span></p>
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
          <span className="font-bold">DoctorCita Clinica</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {pasos.map((id, i) => (
              <div key={id} className="flex flex-1 items-center last:flex-none">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < pasos.length - 1 && <div className={`h-1 flex-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-medium">{ETIQUETAS[pasoActual]}</p>
          {saltarDatos && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Hola {miFicha?.name.split(" ")[0]}, usamos los datos de tu cuenta.
            </p>
          )}
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm md:p-8">
          {pasoActual === "especialidad" && (
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

          {pasoActual === "doctor" && (
            <div className="grid gap-4">
              {doctors.filter((d) => d.serviceId === specialtyId).map((d) => (
                <TarjetaDoctor
                  key={d.id}
                  doctor={d}
                  especialidad={specialty?.name ?? ""}
                  duracion={specialty?.duration ?? 30}
                  seleccionado={doctorId === d.id}
                  onElegir={(hueco) => {
                    setDoctorId(d.id);
                    // Con un horario concreto se salta SOLO el paso de fecha.
                    // Sin sesion, el siguiente sigue siendo "datos": saltar
                    // hasta confirmar dejaria la cita sin nombre ni telefono.
                    if (hueco) {
                      setDate(hueco.date);
                      setTime(hueco.time);
                      setStep(pasos.indexOf("fecha") + 1);
                    } else next();
                  }}
                />
              ))}
              {doctors.filter((d) => d.serviceId === specialtyId).length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No hay doctores disponibles para esta especialidad.</p>
              )}
            </div>
          )}

          {pasoActual === "fecha" && doctor && (
            <DateTimeStep doctor={doctor} duration={specialty?.duration || 30} date={date} time={time} onPick={(d, t) => { setDate(d); setTime(t); }} />
          )}

          {pasoActual === "datos" && (
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

              <p className="text-xs text-muted-foreground">
                Guardaremos estos datos en tu ficha para que no tengas que repetirlos.
              </p>
            </div>
          )}

          {pasoActual === "confirmacion" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Confirma tu cita</h3>
              <div className="space-y-3 rounded-2xl bg-accent/30 p-4 text-sm">
                <Row label="Especialidad" value={specialty?.name || ""} />
                <Row label="Doctor" value={doctor?.name || ""} />
                <Row label="Fecha" value={formatDateLong(date)} />
                <Row label="Hora" value={time} />
                <Row label="Duracion" value={`${specialty?.duration} min`} />
                <Row label="Paciente" value={miFicha?.name ?? form.name} />
                <Row label="Telefono" value={miFicha?.phone ?? form.phone} />
                {!saltarDatos && <Row label="Motivo" value={form.reason || "—"} />}
                <Row label="Costo" value={`$${specialty?.price} MXN`} />
              </div>

              {/* Con sesion no hay paso de datos, asi que el motivo se pide aqui */}
              {saltarDatos && (
                <div>
                  <Label htmlFor="reason">Motivo de consulta</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Cuentanos brevemente que te trae a consulta"
                  />
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}><ArrowLeft className="mr-1 h-4 w-4" /> Atras</Button>
            ) : <span />}
            {pasoActual === "confirmacion" ? (
              <Button onClick={confirm} size="lg" disabled={enviando} className="ml-auto">
                <Check className="mr-1 h-4 w-4" /> {enviando ? "Confirmando..." : "Confirmar Cita"}
              </Button>
            ) : pasoActual === "fecha" ? (
              <Button disabled={!date || !time} onClick={next} className="ml-auto">Continuar <ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : pasoActual === "datos" ? (
              <Button disabled={!datosCompletos} onClick={next} className="ml-auto">Continuar <ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de doctor con sus proximos huecos, como pide el PRD.
 *
 * Antes ponia "Disponible 10:00 - 18:00", que es su jornada, no si le
 * queda sitio. Los chips son atajos: al pulsar uno se salta el paso de
 * fecha y se va directo a confirmar.
 */
function TarjetaDoctor({
  doctor, especialidad, duracion, seleccionado, onElegir,
}: {
  doctor: Doctor;
  especialidad: string;
  duracion: number;
  seleccionado: boolean;
  onElegir: (hueco?: FreeSlot) => void;
}) {
  const { data: huecos = [], isLoading } = useDoctorNextSlots(doctor.id, duracion);

  return (
    <div
      className={`rounded-2xl border-2 p-4 transition ${
        seleccionado ? "border-primary bg-accent/40" : "border-border hover:border-primary"
      }`}
    >
      <button onClick={() => onElegir()} className="flex w-full items-center gap-4 text-left">
        {doctor.photo
          ? <img src={doctor.photo} alt={doctor.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Stethoscope className="h-7 w-7" />
            </div>}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{doctor.name}</h3>
          <p className="text-sm text-muted-foreground">{especialidad}</p>
        </div>
      </button>

      <div className="mt-3 border-t pt-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Buscando horarios...</p>
        ) : huecos.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin huecos proximos. Elige otro doctor.</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Proximos horarios</p>
            <div className="flex flex-wrap gap-2">
              {huecos.map((h) => (
                <button
                  key={`${h.date}-${h.time}`}
                  onClick={() => onElegir(h)}
                  className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:bg-accent"
                >
                  {formatDate(h.date)} · {h.time}
                </button>
              ))}
              <button
                onClick={() => onElegir()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:underline"
              >
                Ver mas
              </button>
            </div>
          </>
        )}
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
  doctor, duration, date, time, onPick,
}: {
  doctor: Doctor; duration: number; date: string; time: string;
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

  // Los huecos ocupados llegan por RPC: `anon` no puede leer `appointments`.
  // Una cita bloquea todo su bloque, no solo su hora de inicio.
  const { data: ocupados = [], isLoading: cargandoHuecos } = useDoctorBusyBlocks(doctor.id, date || undefined);

  const hoy = todayISO();
  const ahora = horaActual();

  /** El PRD lo pide explicitamente: no se puede agendar en el pasado. */
  const yaPaso = (slot: string) => date === hoy && slot <= ahora;

  const isSlotFree = (slot: string) =>
    !yaPaso(slot) && !ocupados.some((b) => rangesOverlap(slot, duration, b.time, b.duration));

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
            // isoLocal, no toISOString: en zonas al este de UTC el
            // calendario marcaria el dia anterior
            const iso = isoLocal(c);
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
        ) : cargandoHuecos ? (
          <p className="text-sm text-muted-foreground">Cargando horarios...</p>
        ) : (() => {
          const freeSlots = allSlots.filter(isSlotFree);
          if (freeSlots.length === 0) {
            return <p className="text-sm text-muted-foreground">No quedan horarios disponibles ese dia. Elige otra fecha.</p>;
          }
          return (
            <div className="grid grid-cols-3 gap-2">
              {freeSlots.map((s) => (
                <button
                  key={s}
                  onClick={() => onPick(date, s)}
                  className={`rounded-lg border py-2 text-sm transition ${
                    time === s ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary hover:bg-accent"
                  }`}
                >{s}</button>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
