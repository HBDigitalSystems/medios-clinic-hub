import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

/**
 * Aviso de inactividad con cuenta atras.
 *
 * Sin la cuenta atras el aviso no protegeria nada: en un puesto abandonado
 * se quedaria esperando respuesta con la sesion abierta. Con ella, quien
 * esta trabajando nunca se ve expulsado —basta con confirmar— y un equipo
 * dejado solo se cierra por su cuenta.
 */
export function AvisoInactividad({
  segundosRestantes, onContinuar, onCerrar,
}: {
  segundosRestantes: number;
  onContinuar: () => void;
  onCerrar: () => void;
}) {
  return (
    // No se cierra pulsando fuera ni con Escape: hay que elegir. Un clic
    // accidental no deberia mantener abierta una sesion en un equipo ajeno.
    <Dialog open>
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Sigues ahi?</DialogTitle>
          <DialogDescription className="text-center">
            Llevas un rato sin actividad. Por seguridad cerraremos tu sesion.
          </DialogDescription>
        </DialogHeader>

        <p className="text-center text-4xl font-bold tabular-nums text-primary" aria-live="polite">
          {segundosRestantes}
        </p>
        <p className="text-center text-xs text-muted-foreground">
          segundo{segundosRestantes === 1 ? "" : "s"} para cerrar
        </p>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full" onClick={onContinuar}>
            Seguir trabajando
          </Button>
          <Button variant="outline" className="w-full" onClick={onCerrar}>
            Cerrar sesion ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
