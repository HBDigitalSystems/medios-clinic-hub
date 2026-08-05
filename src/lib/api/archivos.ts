import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lanzarSiError } from "./shared";
import { toPatientFile, type FileKind, type PatientFile } from "./types";

const BUCKET = "clinical-files";

/** Coincide con allowed_mime_types del bucket (migracion 20260804120000). */
const TIPOS_PERMITIDOS = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const TAMANO_MAXIMO = 20 * 1024 * 1024;

/** Minutos que dura un enlace de descarga antes de caducar. */
const MINUTOS_DE_VALIDEZ = 5;

export const qkArchivos = (patientId: string) => ["patient-files", patientId] as const;

export function useArchivosDePaciente(patientId: string | undefined) {
  return useQuery({
    queryKey: qkArchivos(patientId ?? ""),
    enabled: !!patientId,
    queryFn: async (): Promise<PatientFile[]> => {
      const { data, error } = await supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      lanzarSiError(error);
      return (data ?? []).map(toPatientFile);
    },
  });
}

export function validarArchivoClinico(file: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return "Formato no admitido. Usa PDF, Word o una imagen (JPG, PNG, WEBP).";
  }
  if (file.size > TAMANO_MAXIMO) {
    return `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el maximo son 20 MB.`;
  }
  return null;
}

export interface NuevoArchivo {
  file: File;
  clinicId: string;
  patientId: string;
  kind: FileKind;
  notes?: string;
}

/**
 * Sube un archivo al expediente.
 *
 * La ruta empieza por el id del paciente: de esa primera carpeta cuelga
 * todo el control de acceso del bucket (ver `puede_ver_archivos_de`).
 *
 * Si falla el registro en la tabla se borra el objeto subido: un archivo
 * en Storage sin fila que lo describa no lo veria nadie y ocuparia espacio
 * para siempre.
 */
export function useSubirArchivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, clinicId, patientId, kind, notes }: NuevoArchivo) => {
      const error = validarArchivoClinico(file);
      if (error) throw new Error(error);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Necesitas iniciar sesion.");

      // Nombre saneado: los acentos y espacios complican las rutas firmadas
      const limpio = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
      const ruta = `${patientId}/${Date.now()}-${limpio}`;

      const { error: subida } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, file, { cacheControl: "0", upsert: false });
      if (subida) throw new Error(traducir(subida.message));

      const { error: registro } = await supabase.from("patient_files").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        uploaded_by: userId,
        storage_path: ruta,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        kind,
        notes: notes ?? "",
      });

      if (registro) {
        await supabase.storage.from(BUCKET).remove([ruta]);
        lanzarSiError(registro);
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qkArchivos(vars.patientId) });
    },
  });
}

export function useBorrarArchivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (archivo: PatientFile) => {
      const { error } = await supabase.from("patient_files").delete().eq("id", archivo.id);
      lanzarSiError(error);
      // Si el objeto no se borra queda huerfano, pero ya es invisible:
      // sin fila, nadie lo lista. No se aborta por eso.
      const { error: borrado } = await supabase.storage.from(BUCKET).remove([archivo.storagePath]);
      if (borrado) console.warn("[archivos] no se pudo borrar el objeto:", borrado.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qkArchivos(vars.patientId) });
    },
  });
}

/**
 * Enlace temporal de descarga.
 *
 * El bucket es privado, asi que no hay URL publica: se pide una firmada
 * que caduca. Se genera en el momento de pulsar y no al listar, para que
 * no queden enlaces validos flotando en el HTML de la pagina.
 */
export async function urlDeDescarga(archivo: PatientFile): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(archivo.storagePath, MINUTOS_DE_VALIDEZ * 60, {
      download: archivo.fileName,
    });
  if (error) throw new Error(traducir(error.message));
  return data.signedUrl;
}

function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("exceeded the maximum allowed size")) return "El archivo supera los 20 MB.";
  if (m.includes("mime type") || m.includes("invalid_mime_type")) return "Formato de archivo no admitido.";
  if (m.includes("already exists")) return "Ya existe un archivo con ese nombre.";
  if (m.includes("row-level security") || m.includes("unauthorized") || m.includes("not found")) {
    return "No tienes permiso sobre el expediente de este paciente.";
  }
  return mensaje;
}
