import { Stethoscope } from "lucide-react";

/**
 * Logo de la clinica, con respaldo.
 *
 * Si en Configuracion no se ha subido ninguno, cae al icono del
 * estetoscopio: la landing nunca debe quedarse con un hueco roto.
 */
export function LogoClinica({
  logo, nombre, tamano = "md", className = "",
}: {
  logo: string | null | undefined;
  nombre: string | undefined;
  tamano?: "sm" | "md" | "lg";
  className?: string;
}) {
  const medidas = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-9 w-9 rounded-xl",
    lg: "h-12 w-12 rounded-xl",
  }[tamano];

  const icono = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" }[tamano];

  if (logo) {
    return (
      <img
        src={logo}
        alt={nombre ?? "Logo de la clinica"}
        // `object-contain` y no `cover`: un logo recortado se ve mal, y no
        // sabemos que proporcion tendra el que suban
        className={`${medidas} shrink-0 border bg-white object-contain ${className}`}
      />
    );
  }

  return (
    <div className={`grid ${medidas} shrink-0 place-items-center bg-primary text-primary-foreground ${className}`}>
      <Stethoscope className={icono} />
    </div>
  );
}
