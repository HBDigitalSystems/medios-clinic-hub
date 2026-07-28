import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { subirImagen, borrarImagen, type CarpetaAvatar } from "@/lib/api/storage";

interface Props {
  /** URL actual, o null si no hay foto. */
  value: string | null;
  /** Se llama con la URL nueva (o null al quitarla). No guarda en la base: eso lo hace el formulario. */
  onChange: (url: string | null) => void;
  carpeta: CarpetaAvatar;
  /** Id de la entidad; entra en el nombre del archivo. */
  entidadId: string;
  /** Iniciales de respaldo cuando no hay imagen. */
  nombre?: string;
  forma?: "circulo" | "cuadrado";
  etiqueta?: string;
}

/**
 * Selector de imagen con vista previa.
 *
 * `accept="image/*"` sin `capture`: en movil el sistema deja elegir entre
 * camara y galeria. Poniendo `capture` se forzaria la camara, que es peor
 * cuando la foto ya esta en el carrete.
 */
export function ImageUpload({
  value, onChange, carpeta, entidadId, nombre, forma = "circulo", etiqueta = "Foto",
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const inicial = nombre?.trim()?.split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase();
  const redondez = forma === "circulo" ? "rounded-full" : "rounded-2xl";

  const seleccionar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite volver a elegir el mismo archivo si la subida fallo
    e.target.value = "";
    if (!file) return;

    setSubiendo(true);
    const anterior = value;
    try {
      const url = await subirImagen(file, carpeta, entidadId);
      onChange(url);
      // La anterior se borra despues, para no dejar huerfanos en el bucket
      await borrarImagen(anterior);
      toast.success("Imagen actualizada");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    const anterior = value;
    onChange(null);
    await borrarImagen(anterior);
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{etiqueta}</p>
      <div className="flex items-center gap-4">
        <div className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden border bg-accent/40 ${redondez}`}>
          {value ? (
            <img src={value} alt={nombre ?? "Imagen"} className="h-full w-full object-cover" />
          ) : inicial ? (
            <span className="text-2xl font-bold text-muted-foreground">{inicial}</span>
          ) : (
            <User className="h-8 w-8 text-muted-foreground/50" />
          )}

          {subiendo && (
            <div className="absolute inset-0 grid place-items-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={seleccionar}
          />
          <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => input.current?.click()}>
            <Camera className="mr-1 h-4 w-4" />
            {subiendo ? "Subiendo..." : value ? "Cambiar" : "Subir foto"}
          </Button>

          {value && !subiendo && (
            <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={quitar}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Quitar
            </Button>
          )}

          <p className="text-xs text-muted-foreground">JPG, PNG o WEBP. Maximo 5 MB.</p>
        </div>
      </div>
    </div>
  );
}
