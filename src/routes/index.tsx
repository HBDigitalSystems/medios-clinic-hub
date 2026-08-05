import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Stethoscope, SmilePlus, Baby, Scan, Apple, ShieldCheck, Zap, Database, Calendar, Phone, Mail, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoClinica } from "@/components/logo-clinica";
import { RedesDoctor } from "@/components/redes-doctor";
import { useClinic } from "@/lib/api/clinic";
import { useServices } from "@/lib/api/services";
import { useActiveDoctors } from "@/lib/api/doctors";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Stethoscope, SmilePlus, Baby, Scan, Apple,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DoctorCita Clinica - Tu clinica. Tus datos. Tu sistema." },
      { name: "description", content: "Agenda tu cita con doctores de medicina general, odontologia, pediatria, dermatologia y nutricion en DoctorCita Clinica." },
      { property: "og:title", content: "DoctorCita Clinica - Clinica medica moderna" },
      { property: "og:description", content: "Agenda tu cita en linea con los mejores especialistas." },
    ],
  }),
  component: Landing,
});

function Landing() {
  // Consultas publicas: RLS deja leer clinics, services y doctors sin sesion
  const { data: clinic } = useClinic();
  const { data: services = [] } = useServices();
  const { data: doctors = [] } = useActiveDoctors();

  const testimonials = [
    { name: "Lucia M.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop", text: "Agendar fue rapidisimo y la atencion fue excelente. Me recordo la cita un dia antes." },
    { name: "Andres R.", photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop", text: "Me encanta poder ver mi historial y recibos desde mi telefono. Muy bien hecho." },
    { name: "Sofia G.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop", text: "La clinica es moderna y limpia. Los doctores muy profesionales y puntuales." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <LogoClinica logo={clinic?.logo} nombre={clinic?.name} />
            <span className="truncate text-lg font-bold">{clinic?.name ?? "Clinica"}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/auth" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline">Entrar</Link>
            <Button asChild>
              <Link to="/booking">Agendar Cita</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/40 to-background" />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> {clinic?.name ?? "DoctorCita Clinica"}
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Tu clinica.<br />Tus datos. <span className="text-primary">Tu sistema.</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Agenda en linea con nuestros especialistas. Recibe recordatorios, accede a tu historial y tus recibos desde donde estes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link to="/booking"><Calendar className="mr-2 h-5 w-5" /> Agendar Cita</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link to="/auth">Soy paciente / staff</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&h=900&fit=crop"
              alt="Doctora atendiendo paciente en clinica moderna"
              className="aspect-square w-full rounded-3xl object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">Nuestras especialidades</h2>
          <p className="mt-2 text-muted-foreground">Atencion integral con especialistas certificados.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const Icon = iconMap[s.icon] || Stethoscope;
            return (
              // Lleva al booking con la especialidad ya elegida: se abre
              // directamente en la lista de medicos que la atienden
              <Link
                key={s.id}
                to="/booking"
                search={{ especialidad: s.id }}
                className="group rounded-2xl border bg-card p-6 text-left shadow-sm transition hover:border-primary hover:shadow-md"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-3 text-sm font-medium text-primary">Desde ${s.price.toLocaleString("es-MX")} MXN</p>
                <p className="mt-2 text-xs font-medium text-muted-foreground transition group-hover:text-primary">
                  Ver medicos disponibles →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Doctores */}
      <section className="bg-accent/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Nuestros doctores</h2>
            <p className="mt-2 text-muted-foreground">Profesionales con experiencia y trato humano.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((d) => {
              const sp = services.find((s) => s.id === d.serviceId);
              return (
                // Las redes van FUERA del Link: un <a> dentro de otro <a> es
                // HTML invalido y el navegador rompe la anidacion
                <div key={d.id} className="group overflow-hidden rounded-2xl bg-card shadow-sm transition hover:shadow-md">
                  <Link
                    to="/booking"
                    search={d.serviceId ? { especialidad: d.serviceId } : {}}
                    className="block"
                  >
                    {d.photo
                      ? <img src={d.photo} alt={d.name} className="aspect-square w-full object-cover" />
                      : <div className="grid aspect-square w-full place-items-center bg-primary/10 text-primary">
                          <Stethoscope className="h-12 w-12" />
                        </div>}
                    <div className="p-4 pb-2">
                      <h3 className="font-semibold">{d.name}</h3>
                      <p className="text-sm text-primary">{sp?.name}</p>
                      <p className="mt-2 text-xs text-muted-foreground transition group-hover:text-primary">
                        Ver disponibilidad →
                      </p>
                    </div>
                  </Link>
                  {(d.facebook || d.instagram) && (
                    <div className="px-4 pb-4">
                      <RedesDoctor facebook={d.facebook} instagram={d.instagram} tamano="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Por que DoctorCita Clinica */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">Por que DoctorCita Clinica</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Database, title: "Tus datos son tuyos", text: "Sin secuestros de datos. Exporta lo que quieras cuando quieras, gratis." },
            { icon: Zap, title: "Simple y rapido", text: "Diseno moderno pensado para que tu doctor pase tiempo contigo, no con la computadora." },
            { icon: ShieldCheck, title: "Sin contratos", text: "Sin pagos anuales obligatorios. Cancela cuando quieras." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonios */}
      <section className="bg-accent/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-bold">Lo que dicen nuestros pacientes</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl bg-card p-6 shadow-sm">
                <p className="text-sm text-muted-foreground">"{t.text}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <img src={t.photo} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  <span className="text-sm font-semibold">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <div className="flex min-w-0 items-center gap-2">
              <LogoClinica logo={clinic?.logo} nombre={clinic?.name} />
              <span className="truncate text-lg font-bold">{clinic?.name ?? "Clinica"}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Tu clinica. Tus datos. Tu sistema.</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Contacto</p>
            <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {clinic?.address}</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {clinic?.phone}</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {clinic?.email}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Horario</p>
            <p className="text-muted-foreground">Lunes a Viernes</p>
            <p className="text-muted-foreground">{clinic?.openTime} - {clinic?.closeTime}</p>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          (c) {new Date().getFullYear()} DoctorCita Clinica. Demo construido para mostrar el producto.
        </div>
      </footer>
    </div>
  );
}
