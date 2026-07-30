import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AvisoInactividad } from "@/components/auth/aviso-inactividad";
import type { Database } from "@/integrations/supabase/types";

/**
 * Inactividad antes de avisar. La sesion vive en localStorage y no caduca
 * sola, asi que en un equipo compartido el siguiente en sentarse heredaria
 * la del anterior.
 */
const MINUTOS_HASTA_EL_AVISO = 25;

/** Margen para responder al aviso antes de cerrar. */
const SEGUNDOS_PARA_RESPONDER = 60;

/** Gestos que cuentan como "sigo aqui". */
const EVENTOS_DE_ACTIVIDAD = ["mousedown", "keydown", "touchstart", "scroll"] as const;

export type AppRole = Database["public"]["Enums"]["app_role"];

export interface Profile {
  id: string;
  role: AppRole;
  fullName: string;
  clinicId: string | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  /** Invitacion opcional: vincula la cuenta nueva a un doctor/paciente ya existente. */
  invite?: { type: "doctor" | "patient"; id: string };
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** true mientras se resuelve la sesion inicial. Evita parpadeos en las rutas protegidas. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (input: SignUpInput) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Ruta a la que corresponde cada rol. */
export const homeForRole: Record<AppRole, string> = {
  admin: "/hub",
  doctor: "/doctor",
  patient: "/patient",
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, clinic_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    role: data.role,
    fullName: data.full_name,
    clinicId: data.clinic_id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // onAuthStateChange dispara tambien con la sesion inicial rehidratada
    // desde localStorage, y en cada refresh de token.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // El callback de Supabase no debe hacer awaits sobre el propio cliente:
      // se difiere para no bloquear el flujo interno de auth.
      setTimeout(async () => {
        const p = await fetchProfile(nextSession.user.id);
        if (!active) return;
        setProfile(p);
        setLoading(false);
      }, 0);
    });

    // Por si no hay sesion guardada: onAuthStateChange igual emite, pero
    // esto cierra el caso de arranque sin evento.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------------------
  // Inactividad: aviso con cuenta atras y cierre si nadie responde
  //
  // Se trabaja con MARCAS DE TIEMPO y un intervalo de un segundo, no con un
  // setTimeout largo que haya que reiniciar en cada gesto. Asi no existe una
  // cadena de reinicios que pueda romperse, y el calculo se rehace desde
  // cero en cada vuelta: si el navegador ralentiza los temporizadores de una
  // pestana en segundo plano, la cuenta sigue siendo correcta.
  // ---------------------------------------------------------------------
  const ultimaActividad = useRef(Date.now());
  const avisoDesde = useRef<number | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const seguirTrabajando = () => {
    ultimaActividad.current = Date.now();
    avisoDesde.current = null;
    setSegundosRestantes(null);
  };

  useEffect(() => {
    if (!session) {
      avisoDesde.current = null;
      setSegundosRestantes(null);
      return;
    }

    ultimaActividad.current = Date.now();

    const marcarActividad = () => {
      // Con el aviso en pantalla la actividad NO cuenta: hay que confirmar.
      // Un scroll accidental no deberia mantener viva una sesion en un
      // equipo del que alguien se acaba de levantar.
      if (avisoDesde.current !== null) return;
      ultimaActividad.current = Date.now();
    };

    EVENTOS_DE_ACTIVIDAD.forEach((ev) =>
      window.addEventListener(ev, marcarActividad, { passive: true }),
    );

    const tic = setInterval(() => {
      if (avisoDesde.current === null) {
        if (Date.now() - ultimaActividad.current >= MINUTOS_HASTA_EL_AVISO * 60_000) {
          avisoDesde.current = Date.now();
          setSegundosRestantes(SEGUNDOS_PARA_RESPONDER);
        }
        return;
      }

      const quedan = SEGUNDOS_PARA_RESPONDER - Math.floor((Date.now() - avisoDesde.current) / 1000);
      if (quedan > 0) {
        setSegundosRestantes(quedan);
        return;
      }

      avisoDesde.current = null;
      setSegundosRestantes(null);
      void supabase.auth.signOut().then(() => {
        setProfile(null);
        toast.info("Cerramos tu sesion por inactividad.");
      });
    }, 1000);

    return () => {
      clearInterval(tic);
      EVENTOS_DE_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, marcarActividad));
    };
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: traducirError(error.message) };
        return {};
      },

      async signUp({ email, password, fullName, invite }) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              ...(invite ? { invite_type: invite.type, invite_id: invite.id } : {}),
            },
          },
        });
        if (error) return { error: traducirError(error.message) };
        return {};
      },

      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [session, profile, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {segundosRestantes !== null && (
        <AvisoInactividad
          segundosRestantes={segundosRestantes}
          onContinuar={seguirTrabajando}
          onCerrar={() => {
            seguirTrabajando();
            void value.signOut();
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

function traducirError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contrasena incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu email antes de entrar.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con ese email.";
  if (m.includes("password should be at least")) return "La contrasena debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email")) return "El email no es valido.";
  return message;
}
