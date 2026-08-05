import { Facebook, Instagram } from "lucide-react";

/**
 * Acepta tanto "usuario" como "https://instagram.com/usuario".
 *
 * Quien rellena el formulario no tiene por que saber que formato espera la
 * aplicacion: se normaliza aqui en vez de exigir una URL perfecta.
 */
function enlaceDeRed(valor: string, base: string): string {
  const v = valor.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  // Tolera que peguen "@usuario" o "instagram.com/usuario"
  const usuario = v.replace(/^@/, "").replace(/^(www\.)?(facebook|instagram)\.com\//i, "");
  return `${base}${usuario}`;
}

export function RedesDoctor({
  facebook, instagram, tamano = "md",
}: {
  facebook: string | null | undefined;
  instagram: string | null | undefined;
  tamano?: "sm" | "md";
}) {
  const fb = enlaceDeRed(facebook ?? "", "https://facebook.com/");
  const ig = enlaceDeRed(instagram ?? "", "https://instagram.com/");

  if (!fb && !ig) return null;

  const medida = tamano === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icono = tamano === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-2">
      {fb && (
        <a
          href={fb}
          target="_blank"
          // noreferrer ademas de noopener: no se filtra de donde viene el clic
          rel="noopener noreferrer"
          title="Facebook"
          className={`grid ${medida} place-items-center rounded-full bg-[#1877F2] text-white transition hover:opacity-85`}
        >
          <Facebook className={icono} />
          <span className="sr-only">Facebook</span>
        </a>
      )}
      {ig && (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          className={`grid ${medida} place-items-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white transition hover:opacity-85`}
        >
          <Instagram className={icono} />
          <span className="sr-only">Instagram</span>
        </a>
      )}
    </div>
  );
}
