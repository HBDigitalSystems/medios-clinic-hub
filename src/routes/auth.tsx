import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Stethoscope, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, homeForRole } from "@/lib/auth";

type InviteSearch = {
  invite?: "doctor" | "patient";
  id?: string;
};

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar - DoctorCita Clinica" }] }),
  validateSearch: (search: Record<string, unknown>): InviteSearch => ({
    invite: search.invite === "doctor" || search.invite === "patient" ? search.invite : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { invite, id: inviteId } = Route.useSearch();
  const { signIn, signUp, signOut, session, profile, loading } = useAuth();

  // Con una invitacion en la URL se abre directamente en modo registro
  const [mode, setMode] = useState<"login" | "signup">(invite ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  // Supabase abre sesion al registrarse. Sin esta marca, la sesion recien
  // creada se confundiria con "hay otra cuenta abierta".
  const [recienRegistrado, setRecienRegistrado] = useState(false);

  // Si ya hay sesion, no tiene sentido quedarse aqui.
  //
  // Excepcion: quien llega con una invitacion. Si se le redirige, nunca ve
  // el formulario de registro. Pasa cuando el enlace se abre en un equipo
  // donde ya hay otra cuenta abierta (el ordenador de recepcion, por ejemplo).
  useEffect(() => {
    if (loading || !session || !profile) return;
    // Con invitacion solo se redirige si la sesion es la que se acaba de
    // crear aqui. Si es de otra persona, se deja ver el formulario.
    if (invite && !recienRegistrado) return;
    navigate({ to: homeForRole[profile.role], replace: true });
  }, [invite, recienRegistrado, loading, session, profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    if (mode === "login") {
      const { error } = await signIn(email.trim(), password);
      setBusy(false);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Bienvenido");
      // El efecto de arriba redirige en cuanto llega el perfil
      return;
    }

    const { error } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      invite: invite && inviteId ? { type: invite, id: inviteId } : undefined,
    });
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    setRecienRegistrado(true);
    toast.success("Cuenta creada");
    // Si Supabase no abrio sesion (por ejemplo si se exige confirmar el
    // email), al menos se deja el formulario listo para entrar.
    setMode("login");
  };

  if (loading || (session && !profile)) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/20 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-lg md:p-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>

        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="font-bold">DoctorCita Clinica</span>
        </div>

        <h1 className="mt-5 text-2xl font-bold">
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invite === "doctor" && "Completa tu registro como doctor de la clinica."}
          {invite === "patient" && "Completa tu registro como paciente."}
          {!invite &&
            (mode === "login"
              ? "Accede con tu email y contrasena."
              : "Registrate para agendar y ver tus citas.")}
        </p>

        {invite && session && !recienRegistrado && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              Hay otra sesion abierta{profile ? ` (${profile.fullName || profile.role})` : ""}.
              Cierrala antes de completar tu registro.
            </p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => signOut()}>
              Cerrar sesion
            </Button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="mt-1 w-full">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              <LogIn className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        {!invite && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Registrate" : "Entrar"}
            </button>
          </p>
        )}

        <div className="mt-6 rounded-2xl border bg-accent/30 p-4 text-xs">
          <p className="font-semibold text-foreground">Cuentas demo</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Admin: admin@doctorcita.demo</li>
            <li>Doctor: sofia@doctorcita.demo</li>
            <li>Paciente: maria@doctorcita.demo</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Contrasena: <span className="font-mono">demo1234</span>
          </p>
        </div>
      </div>
    </div>
  );
}
