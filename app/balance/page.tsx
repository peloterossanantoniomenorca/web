import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarDays,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SearchParams = {
  desde?: string;
  hasta?: string;
};

const ZONA_HORARIA = 'America/Lima';
const CONCEPTO_CUOTA = 'Pago cuota por partido';

function inicioDelDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-05:00`);
}

function inicioDiaSiguiente(fecha: string): Date {
  const fechaBase = inicioDelDia(fecha);
  fechaBase.setUTCDate(fechaBase.getUTCDate() + 1);
  return fechaBase;
}

function fechaLima(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);

  const obtener = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function formatoFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

function formatoMoneda(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(monto);
}

function fechaValida(fecha?: string): boolean {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const date = new Date(`${fecha}T12:00:00-05:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    fechaLima(date) === fecha
  );
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parametros = await searchParams;

  const desde = fechaValida(parametros.desde)
    ? parametros.desde!
    : '';

  const hasta = fechaValida(parametros.hasta)
    ? parametros.hasta!
    : '';

  const rangoValido = !desde || !hasta || desde <= hasta;

  const inicio = desde ? inicioDelDia(desde) : undefined;
  const finExclusivo = hasta
    ? inicioDiaSiguiente(hasta)
    : undefined;

  const filtroPagos: {
    status: 'APPROVED';
    paymentDate?: {
      gte?: Date;
      lt?: Date;
    };
  } = {
    status: 'APPROVED',
  };

  const filtroEgresos: {
    fecha?: {
      gte?: Date;
      lt?: Date;
    };
  } = {};

  if (inicio) {
    filtroPagos.paymentDate = {
      ...filtroPagos.paymentDate,
      gte: inicio,
    };

    filtroEgresos.fecha = {
      ...filtroEgresos.fecha,
      gte: inicio,
    };
  }

  if (finExclusivo) {
    filtroPagos.paymentDate = {
      ...filtroPagos.paymentDate,
      lt: finExclusivo,
    };

    filtroEgresos.fecha = {
      ...filtroEgresos.fecha,
      lt: finExclusivo,
    };
  }

  const [pagos, egresos] = rangoValido
    ? await Promise.all([
        prisma.payment.findMany({
          where: filtroPagos,
          include: {
            player: {
              select: {
                fullName: true,
              },
            },
            paymentType: {
              select: {
                description: true,
              },
            },
          },
          orderBy: {
            paymentDate: 'desc',
          },
        }),

        prisma.egreso.findMany({
          where: filtroEgresos,
          include: {
            tipoEgreso: {
              select: {
                descripcion: true,
              },
            },
          },
          orderBy: {
            fecha: 'desc',
          },
        }),
      ])
    : [[], []];

  type Ingreso = {
    fecha: Date;
    jugador: string;
    concepto: string;
    importe: number;
    clave: string;
  };

  const ingresosAgrupados = new Map<string, Ingreso>();
  const ingresosIndividuales: Ingreso[] = [];

  for (const pago of pagos) {
    const importe = Number(pago.amount ?? 0);
    const concepto =
      pago.paymentType?.description ?? 'Sin concepto';

    if (concepto.trim().toLowerCase() === CONCEPTO_CUOTA.toLowerCase()) {
      const dia = fechaLima(pago.paymentDate);
      const clave = `${dia}|${CONCEPTO_CUOTA}`;
      const existente = ingresosAgrupados.get(clave);

      if (existente) {
        existente.importe += importe;
      } else {
        ingresosAgrupados.set(clave, {
          fecha: pago.paymentDate,
          jugador: 'VARIOS',
          concepto: CONCEPTO_CUOTA,
          importe,
          clave,
        });
      }
    } else {
      ingresosIndividuales.push({
        fecha: pago.paymentDate,
        jugador: pago.player.fullName,
        concepto,
        importe,
        clave: pago.id,
      });
    }
  }

  const ingresos: Ingreso[] = [
    ...ingresosIndividuales,
    ...Array.from(ingresosAgrupados.values()),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  const totalIngresos = ingresos.reduce(
    (total, ingreso) => total + ingreso.importe,
    0,
  );

  const totalEgresos = egresos.reduce(
    (total, egreso) => total + Number(egreso.monto),
    0,
  );

  const balanceNeto = totalIngresos - totalEgresos;

  const tituloRango =
    desde && hasta
      ? `Del ${formatoFecha(inicioDelDia(desde))} al ${formatoFecha(inicioDelDia(hasta))}`
      : desde
        ? `Desde el ${formatoFecha(inicioDelDia(desde))}`
        : hasta
          ? `Hasta el ${formatoFecha(inicioDelDia(hasta))}`
          : 'Todos los movimientos registrados';

  return (
    <main className="min-h-screen bg-[#f3faf7] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl bg-[#064332] p-6 text-white md:p-8">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-2 text-sm text-emerald-100 hover:text-white"
          >
            <ArrowLeft size={18} />
            Volver al inicio
          </Link>

          <div className="flex items-center gap-3">
            <Scale size={30} />
            <h1 className="text-3xl font-bold">
              Balance del club
            </h1>
          </div>

          <p className="mt-2 text-emerald-50">
            Resumen de ingresos y egresos del periodo seleccionado.
          </p>

          <p className="mt-3 text-sm text-emerald-100">
            {tituloRango}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <CalendarDays size={20} />
            <h2 className="text-lg font-semibold">
              Filtrar por fechas
            </h2>
          </div>

          <form
            action="/balance"
            method="GET"
            className="flex flex-col items-end gap-4 md:flex-row"
          >
            <div className="w-full flex-1">
              <label
                htmlFor="desde"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Desde
              </label>
              <input
                id="desde"
                name="desde"
                type="date"
                defaultValue={desde}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="w-full flex-1">
              <label
                htmlFor="hasta"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Hasta
              </label>
              <input
                id="hasta"
                name="hasta"
                type="date"
                defaultValue={hasta}
                min={desde || undefined}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800 md:w-auto"
            >
              Consultar balance
            </button>

            <Link
              href="/balance"
              className="w-full rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50 md:w-auto"
            >
              Ver todo
            </Link>
          </form>

          {!rangoValido && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              La fecha Desde no puede ser posterior a la fecha Hasta.
              Selecciona un rango válido.
            </p>
          )}

          <p className="mt-3 text-sm text-slate-500">
            Puedes seleccionar ambas fechas o solamente una.
            Si dejas las dos vacías, se mostrarán todos los movimientos.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 border-t-4 border-t-green-600 bg-white p-6 shadow-sm">
            <TrendingUp className="mb-4 text-green-600" size={25} />
            <p className="text-sm text-slate-500">
              Total de ingresos
            </p>
            <p className="mt-1 text-3xl font-bold text-green-600">
              {formatoMoneda(totalIngresos)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {ingresos.length} movimientos de ingreso
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 border-t-4 border-t-red-600 bg-white p-6 shadow-sm">
            <TrendingDown className="mb-4 text-red-600" size={25} />
            <p className="text-sm text-slate-500">
              Total de egresos
            </p>
            <p className="mt-1 text-3xl font-bold text-red-600">
              {formatoMoneda(totalEgresos)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {egresos.length} gastos registrados
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 border-t-4 border-t-emerald-700 bg-white p-6 shadow-sm">
            <Scale className="mb-4 text-emerald-700" size={25} />
            <p className="text-sm text-slate-500">
              Balance neto
            </p>
            <p
              className={`mt-1 text-3xl font-bold ${
                balanceNeto < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatoMoneda(balanceNeto)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Ingresos menos egresos
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#07533f]">
              1. Detalle de ingresos
            </h2>
            <p className="mt-2 text-slate-500">
              Solo se incluyen pagos aprobados. Las cuotas por partido
              están agrupadas por día.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-emerald-50 text-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Jugador</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 text-right font-semibold">Importe</th>
                </tr>
              </thead>

              <tbody>
                {ingresos.map((ingreso) => (
                  <tr
                    key={ingreso.clave}
                    className="border-t border-slate-200 text-slate-800"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatoFecha(ingreso.fecha)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {ingreso.jugador}
                    </td>
                    <td className="px-4 py-3">
                      {ingreso.concepto}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-green-700">
                      {formatoMoneda(ingreso.importe)}
                    </td>
                  </tr>
                ))}

                {ingresos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay ingresos aprobados para este periodo.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="bg-green-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 font-bold text-slate-800"
                  >
                    TOTAL DE INGRESOS
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-green-700">
                    {formatoMoneda(totalIngresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#07533f]">
              2. Detalle de egresos
            </h2>
            <p className="mt-2 text-slate-500">
              Gastos registrados dentro del periodo seleccionado.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-red-50 text-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Concepto</th>
                  <th className="px-4 py-3 font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-right font-semibold">Importe</th>
                </tr>
              </thead>

              <tbody>
                {egresos.map((egreso) => (
                  <tr
                    key={egreso.id}
                    className="border-t border-slate-200 text-slate-800"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatoFecha(egreso.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      {egreso.tipoEgreso.descripcion}
                    </td>
                    <td className="px-4 py-3">
                      {egreso.responsableEgreso}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-red-600">
                      {formatoMoneda(Number(egreso.monto))}
                    </td>
                  </tr>
                ))}

                {egresos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No hay egresos registrados para este periodo.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="bg-red-50">
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 font-bold text-slate-800"
                  >
                    TOTAL DE EGRESOS
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-red-600">
                    {formatoMoneda(totalEgresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                Balance del periodo seleccionado
              </p>
              <p className="text-xl font-bold text-slate-800">
                Total de ingresos − Total de egresos
              </p>
            </div>

            <p
              className={`text-2xl font-bold ${
                balanceNeto < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              {formatoMoneda(balanceNeto)}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
