import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Image as ImageIcon, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useArchivosDePaciente, useSubirArchivo, useBorrarArchivo, urlDeDescarga,
} from "@/lib/api/archivos";
import { ETIQUETAS_TIPO_ARCHIVO, formatearTamano, type FileKind, type PatientFile } from "@/lib/api/types";
import { formatDate } from "@/lib/medi-utils";

/**
 * Estudios, analisis y demas documentos del paciente.
 *
 * Los archivos viven en un bucket PRIVADO: no hay URL publica, cada
 * descarga pide un enlace firmado que caduca a los pocos minutos.
 *
 * `soloLectura` para el portal del paciente: puede ver y descargar lo
 * suyo, pero no subir ni borrar. Un expediente que el propio paciente
 * puede alterar no sirve como registro clinico.
 */
export function ExpedienteArchivos({
  patientId, clinicId, soloLectura = false,
}: {
  patientId: string;
  clinicId: string;
  soloLectura?: boolean;
}) {
  const { data: archivos = [], isLoading } = useArchivosDePaciente(patientId);
  const subir = useSubirArchivo();
  const borrar = useBorrarArchivo();

  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FileKind>("estudio");
  const [notes, setNotes] = useState("");
  const [descargando, setDescargando] = useState<string | null>(null);

  const elegirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      await subir.mutateAsync({ file, clinicId, patientId, kind, notes });
      setNotes("");
      toast.success("Archivo agregado al expediente");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const descargar = async (a: PatientFile) => {
    setDescargando(a.id);
    try {
      const url = await urlDeDescarga(a);
      window.open(url, "_blank", "noopener");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDescargando(null);
    }
  };

  const eliminar = async (a: PatientFile) => {
    try {
      await borrar.mutateAsync(a);
      toast.success("Archivo eliminado");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Paperclip className="h-4 w-4" /> Archivos clinicos
      </h4>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando...</p>
      ) : archivos.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          Sin estudios ni analisis todavia.
        </p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto">
          {archivos.map((a) => {
            const esImagen = a.mimeType.startsWith("image/");
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-lg border p-2 text-xs">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
                  {esImagen ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.fileName}</p>
                  <p className="text-muted-foreground">
                    {ETIQUETAS_TIPO_ARCHIVO[a.kind]} · {formatearTamano(a.sizeBytes)} · {formatDate(a.createdAt.slice(0, 10))}
                  </p>
                  {a.notes && <p className="mt-0.5 truncate text-muted-foreground">{a.notes}</p>}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Descargar"
                  disabled={descargando === a.id}
                  onClick={() => descargar(a)}
                >
                  {descargando === a.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Download className="h-3.5 w-3.5" />}
                </Button>
                {!soloLectura && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-rose-600"
                    title="Eliminar"
                    disabled={borrar.isPending}
                    onClick={() => eliminar(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!soloLectura && (
        <div className="mt-3 grid gap-2 rounded-xl border bg-accent/20 p-3">
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as FileKind)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETAS_TIPO_ARCHIVO) as FileKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{ETIQUETAS_TIPO_ARCHIVO[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descripcion (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Radiografia de torax" />
            </div>
          </div>

          <input
            ref={input}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,.doc,.docx"
            onChange={elegirArchivo}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={subir.isPending}
            onClick={() => input.current?.click()}
          >
            {subir.isPending
              ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Subiendo...</>
              : <><Paperclip className="mr-1 h-4 w-4" /> Subir archivo</>}
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF, Word o imagen. Maximo 20 MB. Solo lo ven la clinica y el paciente.
          </p>
        </div>
      )}
    </div>
  );
}
