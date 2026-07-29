import { useMemo } from "react";
import { createPortal } from "react-dom";
import type { Appointment, Clinic, Doctor, Invoice, Service } from "@/lib/api/types";
import { formatMoney, formatDate, formatDateLong } from "@/lib/medi-utils";

export interface FilaDoctor {
  doctorId: string;
  nombre: string;
  especialidad: string;
  total: number;
  completadas: number;
  noShows: number;
  canceladas: number;
  ingresos: number;
  tasaNoShow: number;
}

/**
 * Agrega las cifras por medico dentro de un rango de fechas.
 *
 * Los ingresos se cuentan sobre cobros PAGADOS y se atribuyen al medico
 * de la cita asociada. Un cobro suelto, sin cita, no se puede imputar a
 * nadie: entra en el total de la clinica pero no en ninguna fila.
 */
export interface EntradaReporte {
  appointments: Appointment[];
  invoices: Invoice[];
  doctors: Doctor[];
  services: Service[];
  desde: string;
  hasta: string;
}

/** Envuelve `calcularReporte` para no recalcular en cada render. */
export function useDatosDelReporte(entrada: EntradaReporte) {
  const { appointments, invoices, doctors, services, desde, hasta } = entrada;
  return useMemo(
    () => calcularReporte({ appointments, invoices, doctors, services, desde, hasta }),
    [appointments, invoices, doctors, services, desde, hasta],
  );
}

/**
 * Version pura, sin React: asi se puede comprobar la aritmetica del
 * reporte sin montar componentes ni depender de la red.
 */
export function calcularReporte({
  appointments, invoices, doctors, services, desde, hasta,
}: EntradaReporte) {
  {
    const enRango = (f: string) => f >= desde && f <= hasta;

    const citas = appointments.filter((a) => enRango(a.date));
    const cobrosPagados = invoices.filter(
      (i) => i.status === "paid" && i.paidAt && enRango(i.paidAt),
    );

    const ingresoPorCita = new Map<string, number>();
    cobrosPagados.forEach((i) => {
      if (!i.appointmentId) return;
      ingresoPorCita.set(i.appointmentId, (ingresoPorCita.get(i.appointmentId) ?? 0) + i.amount);
    });

    const filas: FilaDoctor[] = doctors.map((d) => {
      const suyas = citas.filter((a) => a.doctorId === d.id);
      const completadas = suyas.filter((a) => a.status === "completed").length;
      const noShows = suyas.filter((a) => a.status === "no_show").length;
      const canceladas = suyas.filter((a) => a.status === "cancelled").length;
      const ingresos = suyas.reduce((s, a) => s + (ingresoPorCita.get(a.id) ?? 0), 0);
      return {
        doctorId: d.id,
        nombre: d.name,
        especialidad: services.find((s) => s.id === d.serviceId)?.name ?? "—",
        total: suyas.length,
        completadas,
        noShows,
        canceladas,
        ingresos,
        tasaNoShow: suyas.length ? Math.round((noShows / suyas.length) * 100) : 0,
      };
    })
      // Sin actividad en el periodo no aporta nada al reporte
      .filter((f) => f.total > 0 || f.ingresos > 0)
      .sort((a, b) => b.ingresos - a.ingresos || b.total - a.total);

    const totalIngresos = cobrosPagados.reduce((s, i) => s + i.amount, 0);
    const ingresosAtribuidos = filas.reduce((s, f) => s + f.ingresos, 0);

    return {
      filas,
      totales: {
        citas: citas.length,
        completadas: citas.filter((a) => a.status === "completed").length,
        noShows: citas.filter((a) => a.status === "no_show").length,
        canceladas: citas.filter((a) => a.status === "cancelled").length,
        pendientes: citas.filter((a) => ["scheduled", "confirmed", "in_progress"].includes(a.status)).length,
        ingresos: totalIngresos,
        // Diferencia = cobros pagados sin cita asociada
        sinAtribuir: totalIngresos - ingresosAtribuidos,
        tasaNoShow: citas.length
          ? Math.round((citas.filter((a) => a.status === "no_show").length / citas.length) * 100)
          : 0,
        cobrosPendientes: invoices
          .filter((i) => i.status === "pending")
          .reduce((s, i) => s + i.amount, 0),
      },
    };
  }
}

/**
 * Documento para imprimir. Oculto en pantalla; `@media print` lo revela y
 * esconde el resto de la interfaz (ver styles.css).
 *
 * Va por portal a `body` a proposito: se invoca desde dentro del hub, y el
 * hub entero lleva `no-impresion`. Si el reporte colgase de ese arbol, el
 * `display:none` del padre lo ocultaria tambien al imprimir.
 */
export function ReporteImprimible(props: {
  clinic: Clinic | null | undefined;
  datos: ReturnType<typeof useDatosDelReporte>;
  desde: string;
  hasta: string;
}) {
  // En SSR no hay document; el reporte solo tiene sentido en el navegador
  if (typeof document === "undefined") return null;
  return createPortal(<Documento {...props} />, document.body);
}

function Documento({
  clinic, datos, desde, hasta,
}: {
  clinic: Clinic | null | undefined;
  datos: ReturnType<typeof useDatosDelReporte>;
  desde: string;
  hasta: string;
}) {
  const { filas, totales } = datos;

  return (
    <div className="solo-impresion p-6 text-black">
      <header className="mb-6 flex items-start gap-4 border-b-2 border-black pb-4">
        {clinic?.logo && (
          // El span de medida de Recharts se oculta al imprimir, pero este
          // logo si debe salir: es identidad del documento
          <img
            src={clinic.logo}
            alt={clinic.name}
            className="h-20 w-20 shrink-0 border object-contain"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{clinic?.name ?? "Clinica"}</h1>
          <p className="mt-1 text-sm">Reporte de actividad y cobros</p>
          <p className="mt-2 text-sm">
            Periodo: <strong>{formatDateLong(desde)}</strong> a <strong>{formatDateLong(hasta)}</strong>
          </p>
          <p className="text-xs">Generado el {formatDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-bold">Totales de la clinica</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <Fila etiqueta="Ingresos cobrados" valor={formatMoney(totales.ingresos)} destacado />
            <Fila etiqueta="Cobros pendientes" valor={formatMoney(totales.cobrosPendientes)} />
            <Fila etiqueta="Citas en el periodo" valor={String(totales.citas)} />
            <Fila etiqueta="Completadas" valor={String(totales.completadas)} />
            <Fila etiqueta="Por atender" valor={String(totales.pendientes)} />
            <Fila etiqueta="No-shows" valor={`${totales.noShows} (${totales.tasaNoShow}%)`} />
            <Fila etiqueta="Canceladas" valor={String(totales.canceladas)} />
          </tbody>
        </table>
        {totales.sinAtribuir > 0 && (
          <p className="mt-2 text-xs italic">
            {formatMoney(totales.sinAtribuir)} corresponden a cobros sin cita asociada,
            por lo que no se reparten entre los medicos.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Desglose por medico</h2>
        {filas.length === 0 ? (
          <p className="text-sm italic">Sin actividad en el periodo seleccionado.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 text-left">
                <th className="p-2">Medico</th>
                <th className="p-2">Especialidad</th>
                <th className="p-2 text-right">Citas</th>
                <th className="p-2 text-right">Compl.</th>
                <th className="p-2 text-right">No-show</th>
                <th className="p-2 text-right">Canc.</th>
                <th className="p-2 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.doctorId} className="border-b border-neutral-300">
                  <td className="p-2 font-medium">{f.nombre}</td>
                  <td className="p-2">{f.especialidad}</td>
                  <td className="p-2 text-right">{f.total}</td>
                  <td className="p-2 text-right">{f.completadas}</td>
                  <td className="p-2 text-right">{f.noShows} ({f.tasaNoShow}%)</td>
                  <td className="p-2 text-right">{f.canceladas}</td>
                  <td className="p-2 text-right font-semibold">{formatMoney(f.ingresos)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td className="p-2" colSpan={2}>Total</td>
                <td className="p-2 text-right">{filas.reduce((s, f) => s + f.total, 0)}</td>
                <td className="p-2 text-right">{filas.reduce((s, f) => s + f.completadas, 0)}</td>
                <td className="p-2 text-right">{filas.reduce((s, f) => s + f.noShows, 0)}</td>
                <td className="p-2 text-right">{filas.reduce((s, f) => s + f.canceladas, 0)}</td>
                <td className="p-2 text-right">{formatMoney(filas.reduce((s, f) => s + f.ingresos, 0))}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <footer className="mt-8 border-t pt-3 text-xs">
        {clinic?.address} · {clinic?.phone} · {clinic?.email}
      </footer>
    </div>
  );
}

function Fila({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: boolean }) {
  return (
    <tr className="border-b border-neutral-300">
      <td className="p-2">{etiqueta}</td>
      <td className={`p-2 text-right ${destacado ? "text-base font-bold" : "font-medium"}`}>{valor}</td>
    </tr>
  );
}
