import { useState } from "react";
import { toast } from "sonner";
import { Building2, Check, Loader2, PartyPopper, Plus, Stethoscope, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClinic, useUpdateClinic } from "@/lib/api/clinic";
import { useServices, useCreateService, useDeleteService } from "@/lib/api/services";
import { useDoctors, useCreateDoctor } from "@/lib/api/doctors";

const PASOS = ["Tu clinica", "Primer doctor", "Servicios", "Listo"];

const DIAS = [
  { n: 1, label: "Lun" }, { n: 2, label: "Mar" }, { n: 3, label: "Mie" },
  { n: 4, label: "Jue" }, { n: 5, label: "Vie" }, { n: 6, label: "Sab" }, { n: 7, label: "Dom" },
];

/** Punto de partida razonable para una clinica que empieza de cero. */
const SERVICIOS_SUGERIDOS = [
  { name: "Medicina General", duration: 30, price: 800, icon: "Stethoscope" },
  { name: "Odontologia", duration: 45, price: 1200, icon: "SmilePlus" },
  { name: "Pediatria", duration: 30, price: 900, icon: "Baby" },
];

/**
 * Asistente de puesta en marcha.
 *
 * Cada paso guarda en Supabase al avanzar, no al final: si alguien cierra
 * la ventana a mitad, lo hecho hasta ahi no se pierde.
 */
export function OnboardingWizard({ onFinish }: { onFinish: () => void }) {
  const [paso, setPaso] = useState(0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center">
            {PASOS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center last:flex-none">
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${
                    i <= paso ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < paso ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < PASOS.length - 1 && (
                  <div className={`h-1 flex-1 transition ${i < paso ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
          </p>
        </div>

        {paso === 0 && <PasoClinica onNext={() => setPaso(1)} />}
        {paso === 1 && <PasoDoctor onNext={() => setPaso(2)} onBack={() => setPaso(0)} />}
        {paso === 2 && <PasoServicios onNext={() => setPaso(3)} onBack={() => setPaso(1)} />}
        {paso === 3 && <PasoFinal onFinish={onFinish} />}
      </div>
    </div>
  );
}

/* ---------- Paso 1: datos de la clinica ---------- */
function PasoClinica({ onNext }: { onNext: () => void }) {
  const { data: clinic, isLoading } = useClinic();
  const actualizar = useUpdateClinic();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [tocado, setTocado] = useState(false);

  // Se rellena con lo que ya haya en la base la primera vez que carga
  if (clinic && !tocado) {
    if (name === "") setName(clinic.name);
    if (address === "") setAddress(clinic.address);
    if (phone === "") setPhone(clinic.phone);
  }

  const guardar = async () => {
    if (!clinic) return;
    if (!name.trim()) { toast.error("Ponle nombre a tu clinica"); return; }
    try {
      await actualizar.mutateAsync({ id: clinic.id, patch: { name, address, phone } });
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <Tarjeta
      icono={Building2}
      titulo="Empecemos por tu clinica"
      descripcion="Estos datos salen en la pagina publica y en los recibos."
    >
      <div className="grid gap-3">
        <div>
          <Label>Nombre de la clinica</Label>
          <Input value={name} onChange={(e) => { setName(e.target.value); setTocado(true); }} placeholder="Clinica San Rafael" />
        </div>
        <div>
          <Label>Direccion</Label>
          <Input value={address} onChange={(e) => { setAddress(e.target.value); setTocado(true); }} placeholder="Av. Reforma 500, CDMX" />
        </div>
        <div>
          <Label>Telefono</Label>
          <Input value={phone} onChange={(e) => { setPhone(e.target.value); setTocado(true); }} placeholder="+52 55 1234 5678" />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={guardar} disabled={actualizar.isPending}>
          {actualizar.isPending ? "Guardando..." : "Continuar"}
        </Button>
      </div>
    </Tarjeta>
  );
}

/* ---------- Paso 2: primer doctor ---------- */
function PasoDoctor({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: clinic } = useClinic();
  const { data: services = [] } = useServices();
  const { data: doctors = [], isLoading } = useDoctors();
  const crear = useCreateDoctor();

  const [name, setName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  const toggleDia = (n: number) =>
    setDays((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].sort((a, b) => a - b)));

  const guardar = async () => {
    if (!clinic) return;
    if (!name.trim()) { toast.error("Falta el nombre del doctor"); return; }
    if (days.length === 0) { toast.error("Elige al menos un dia"); return; }
    if (end <= start) { toast.error("La salida debe ser posterior a la entrada"); return; }
    try {
      await crear.mutateAsync({
        clinicId: clinic.id,
        serviceId: serviceId || null,
        name,
        schedule: { days, start, end },
      });
      toast.success("Doctor agregado");
      onNext();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (isLoading) return <Cargando />;

  return (
    <Tarjeta
      icono={UserCog}
      titulo="Agrega tu primer doctor"
      descripcion="Podras invitarlo despues para que acceda con su propia cuenta."
    >
      {doctors.length > 0 && (
        <div className="mb-4 rounded-xl border bg-accent/30 p-3 text-sm">
          <p className="font-medium">Ya tienes {doctors.length} doctor(es)</p>
          <p className="text-xs text-muted-foreground">
            {doctors.map((d) => d.name).join(", ")}
          </p>
        </div>
      )}

      <div className="grid gap-3">
        <div>
          <Label>Nombre completo</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dra. Sofia Martinez" />
        </div>
        <div>
          <Label>Especialidad</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger>
              <SelectValue placeholder={services.length ? "Elige una" : "Las defines en el paso siguiente"} />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Atras</Button>
        <div className="flex gap-2">
          {doctors.length > 0 && <Button variant="outline" onClick={onNext}>Saltar</Button>}
          <Button size="lg" onClick={guardar} disabled={crear.isPending}>
            {crear.isPending ? "Guardando..." : "Continuar"}
          </Button>
        </div>
      </div>
    </Tarjeta>
  );
}

/* ---------- Paso 3: servicios y precios ---------- */
function PasoServicios({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: clinic } = useClinic();
  const { data: services = [], isLoading } = useServices();
  const crear = useCreateService();
  const borrar = useDeleteService();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);

  const anadir = async (s?: { name: string; duration: number; price: number; icon: string }) => {
    if (!clinic) return;
    const datos = s ?? { name, duration, price, icon: "Stethoscope" };
    if (!datos.name.trim()) { toast.error("Falta el nombre del servicio"); return; }
    if (datos.duration <= 0) { toast.error("La duracion debe ser mayor que cero"); return; }
    try {
      await crear.mutateAsync({
        clinicId: clinic.id,
        name: datos.name,
        duration: datos.duration,
        price: datos.price,
        description: "",
        icon: datos.icon,
      });
      setName(""); setDuration(30); setPrice(0);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sugerenciasPendientes = SERVICIOS_SUGERIDOS.filter(
    (s) => !services.some((x) => x.name.toLowerCase() === s.name.toLowerCase()),
  );

  if (isLoading) return <Cargando />;

  return (
    <Tarjeta
      icono={Stethoscope}
      titulo="Define tus servicios"
      descripcion="La duracion determina el bloque que ocupa cada cita en la agenda."
    >
      <div className="space-y-2">
        {services.length === 0 && (
          <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            Todavia no hay servicios.
          </p>
        )}
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.duration} min · ${s.price.toLocaleString("es-MX")} MXN</p>
            </div>
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => borrar.mutate(s.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {sugerenciasPendientes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Anadir uno habitual:</p>
          <div className="flex flex-wrap gap-2">
            {sugerenciasPendientes.map((s) => (
              <Button key={s.name} size="sm" variant="outline" disabled={crear.isPending} onClick={() => anadir(s)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> {s.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 rounded-xl border bg-accent/20 p-4">
        <p className="text-xs font-medium text-muted-foreground">O crea uno a medida</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div><Label className="text-xs">Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Min</Label><Input type="number" className="w-20" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
          <div><Label className="text-xs">Precio</Label><Input type="number" className="w-28" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <Button variant="outline" disabled={crear.isPending} onClick={() => anadir()}>Anadir</Button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Atras</Button>
        <Button size="lg" onClick={onNext} disabled={services.length === 0}>
          Continuar
        </Button>
      </div>
      {services.length === 0 && (
        <p className="mt-2 text-right text-xs text-muted-foreground">
          Necesitas al menos un servicio para poder agendar.
        </p>
      )}
    </Tarjeta>
  );
}

/* ---------- Paso 4: listo ---------- */
function PasoFinal({ onFinish }: { onFinish: () => void }) {
  const { data: clinic } = useClinic();
  const { data: doctors = [] } = useDoctors();
  const { data: services = [] } = useServices();

  return (
    <Tarjeta
      icono={PartyPopper}
      titulo={`${clinic?.name ?? "Tu clinica"} esta lista`}
      descripcion="Ya puedes recibir reservas desde tu pagina publica."
    >
      <div className="grid grid-cols-2 gap-3">
        <Resumen valor={doctors.length} etiqueta={doctors.length === 1 ? "doctor" : "doctores"} />
        <Resumen valor={services.length} etiqueta={services.length === 1 ? "servicio" : "servicios"} />
      </div>
      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> Comparte tu enlace de reservas con tus pacientes.</li>
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> Invita a tus doctores desde el tab Doctores.</li>
        <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" /> Cobra las consultas desde el panel del doctor.</li>
      </ul>
      <Button size="lg" className="mt-6 w-full" onClick={onFinish}>Ir al Dashboard</Button>
    </Tarjeta>
  );
}

/* ---------- piezas compartidas ---------- */
function Tarjeta({
  icono: Icono, titulo, descripcion, children,
}: {
  icono: React.ComponentType<{ className?: string }>;
  titulo: string; descripcion: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm md:p-8">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icono className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Resumen({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-2xl border bg-accent/20 p-4 text-center">
      <p className="text-3xl font-bold text-primary">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
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
