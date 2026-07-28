import { useState } from "react";
import { toast } from "sonner";
import { Loader2, LogIn, Stethoscope, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

/**
 * Acceso sin salir de donde estas.
 *
 * Lo usa el booking: se puede explorar especialidades y medicos sin
 * cuenta, y solo al elegir medico se pide identificarse. Mandarlo a
 * /auth aqui haria perder la seleccion.
 *
 * `onSuccess` se dispara cuando ya hay sesion, para continuar el flujo
 * exactamente donde estaba.
 */
export function AuthDialog({
  onSuccess, onClose, titulo = "Entra para continuar", descripcion,
}: {
  onSuccess: () => void;
  onClose: () => void;
  titulo?: string;
  descripcion?: string;
}) {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado(true);

    const { error } = modo === "login"
      ? await signIn(email.trim(), password)
      : await signUp({ email: email.trim(), password, fullName: fullName.trim() });

    setOcupado(false);
    if (error) {
      toast.error(error);
      return;
    }

    toast.success(modo === "login" ? "Bienvenido" : "Cuenta creada");
    // Supabase deja sesion abierta tambien al registrarse, asi que en los
    // dos casos se puede seguir sin pasar por la pantalla de login
    onSuccess();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Stethoscope className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">{titulo}</DialogTitle>
          <DialogDescription className="text-center">
            {descripcion ?? "Asi podras ver tus citas, reagendarlas o cancelarlas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="grid gap-4">
          {modo === "signup" && (
            <div>
              <Label htmlFor="ad-name">Nombre completo</Label>
              <Input
                id="ad-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="ad-email">Email</Label>
            <Input
              id="ad-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <Label htmlFor="ad-password">Contrasena</Label>
            <Input
              id="ad-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={modo === "login" ? "current-password" : "new-password"}
              placeholder={modo === "signup" ? "Minimo 6 caracteres" : undefined}
            />
          </div>

          <Button type="submit" size="lg" disabled={ocupado} className="w-full">
            {ocupado ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : modo === "login" ? (
              <LogIn className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {modo === "login" ? "Entrar y continuar" : "Crear cuenta y continuar"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {modo === "login" ? "No tienes cuenta?" : "Ya tienes cuenta?"}{" "}
          <button
            type="button"
            onClick={() => setModo(modo === "login" ? "signup" : "login")}
            className="font-medium text-primary hover:underline"
          >
            {modo === "login" ? "Registrate" : "Entrar"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
