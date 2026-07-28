import { supabase } from "@/integrations/supabase/client";

const BUCKET = "avatars";

/** Debe coincidir con allowed_mime_types del bucket (migracion 20260727120900). */
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

export type CarpetaAvatar = "doctors" | "patients" | "clinics";

/** Valida antes de subir, para dar un mensaje util en vez del error de Storage. */
export function validarImagen(file: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return "Formato no admitido. Usa JPG, PNG, WEBP o GIF.";
  }
  if (file.size > TAMANO_MAXIMO) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return `La imagen pesa ${mb} MB y el maximo son 5 MB.`;
  }
  return null;
}

/**
 * Sube una imagen y devuelve su URL publica.
 *
 * El nombre lleva un sufijo aleatorio para que cada subida sea un objeto
 * nuevo: si se reutilizara la ruta, los CDN y el navegador seguirian
 * sirviendo la foto vieja durante horas.
 */
export async function subirImagen(file: File, carpeta: CarpetaAvatar, id: string): Promise<string> {
  const error = validarImagen(file);
  if (error) throw new Error(error);

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ruta = `${carpeta}/${id}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, file, { cacheControl: "3600", upsert: true });

  if (uploadError) throw new Error(traducir(uploadError.message));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
  return data.publicUrl;
}

/** true si la URL apunta a nuestro bucket (y no a Unsplash o similar). */
export function esUrlDeStorage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Borra la imagen anterior al reemplazarla, para no dejar basura en el
 * bucket. Solo actua sobre URLs propias: las de Unsplash del seed se
 * ignoran. Si falla, no se propaga: perder el borrado es menos grave que
 * abortar el guardado del perfil.
 */
export async function borrarImagen(url: string | null | undefined): Promise<void> {
  if (!esUrlDeStorage(url)) return;

  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const ruta = url!.split(marcador)[1]?.split("?")[0];
  if (!ruta) return;

  const { error } = await supabase.storage.from(BUCKET).remove([decodeURIComponent(ruta)]);
  if (error) console.warn("[storage] no se pudo borrar la imagen anterior:", error.message);
}

function traducir(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("exceeded the maximum allowed size")) return "La imagen supera los 5 MB.";
  if (m.includes("mime type") || m.includes("invalid_mime_type")) return "Formato de imagen no admitido.";
  if (m.includes("row-level security") || m.includes("unauthorized")) {
    return "Necesitas iniciar sesion para subir imagenes.";
  }
  return mensaje;
}
