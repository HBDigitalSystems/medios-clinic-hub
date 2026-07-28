import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, homeForRole, type AppRole } from "@/lib/auth";

/**
 * Guard de ruta por rol.
 *
 * La sesion vive en localStorage, asi que en SSR no existe: durante la
 * primera pintada `loading` es true y se muestra el spinner. Por eso no se
 * redirige hasta que la sesion queda resuelta.
 */
export function ProtectedRoute({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();

  const sinSesion = !loading && !session;

  useEffect(() => {
    if (sinSesion) navigate({ to: "/auth", replace: true });
  }, [sinSesion, navigate]);

  if (loading || (session && !profile)) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  if (profile && profile.role !== allow) {
    return (
      <div className="grid min-h-screen place-items-center bg-accent/10 p-4">
        <div className="max-w-sm rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold">Esta seccion no es para tu rol</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu cuenta tiene el rol <span className="font-medium">{profile.role}</span>.
          </p>
          <Button
            className="mt-5 w-full"
            onClick={() => navigate({ to: homeForRole[profile.role], replace: true })}
          >
            Ir a mi panel
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
