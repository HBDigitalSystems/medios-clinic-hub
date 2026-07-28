import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
