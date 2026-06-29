import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, Stethoscope, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar - MediOS" }] }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { doctors, patients, setCurrentUser } = useStore();
  const [role, setRole] = useState<Role>("admin");

  const enter = () => {
    if (role === "admin") {
      setCurrentUser({ role: "admin", id: "admin", name: "Admin Demo" });
      navigate({ to: "/hub" });
    } else if (role === "doctor") {
      const d = doctors[0];
      setCurrentUser({ role: "doctor", id: d.id, name: d.name });
      navigate({ to: "/doctor" });
    } else {
      const p = patients[0];
      setCurrentUser({ role: "patient", id: p.id, name: p.name });
      navigate({ to: "/patient" });
    }
  };

  const roles = [
    { key: "admin" as const, icon: Shield, title: "Admin", desc: "Gestiona la clinica" },
    { key: "doctor" as const, icon: Stethoscope, title: "Doctor", desc: "Atiende pacientes" },
    { key: "patient" as const, icon: User, title: "Paciente", desc: "Agenda y consulta" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/20 p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-card p-6 shadow-lg md:p-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <h1 className="text-2xl font-bold">Entrar a MediOS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Demo: elige un rol para explorar la app.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => setRole(r.key)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                role === r.key ? "border-primary bg-accent/40" : "border-border hover:bg-accent/30"
              }`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <r.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{r.title}</h3>
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </button>
          ))}
        </div>

        <Button onClick={enter} size="lg" className="mt-6 w-full">Entrar como {roles.find(r => r.key === role)?.title}</Button>
      </div>
    </div>
  );
}
