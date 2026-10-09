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

const VERDE = '#07533f';
const VERDE_OSCURO = '#064332';
const FONDO = '#f3f8f5';
const ZONA_HORARIA = 'America/Lima';
const CONCEPTO_CUOTA = 'Pago cuota por partido';

const estilos = {
  pagina: {
    minHeight: '100vh',
    backgroundColor: FONDO,
    padding: '32px 24px 48px',
    color: '#1e293b',
    fontFamily: 'Arial, Helvetica, sans-serif',
  } as const,
  contenedor: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
  } as const,
  encabezado: {
    backgroundColor: VERDE_OSCURO,
    color: '#ffffff',
    padding: '30px 32px',
    borderRadius: '16px',
    marginBottom: '24px',
    boxShadow: '0 5px 16px rgba(6, 67, 50, 0.12)',
  } as const,
  volver: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    color: '#d1fae5',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '22px',
  } as const,
  titulo: {
    fontSize: '30px',
    fontWeight: 800,
    margin: '0 0 10px',
    lineHeight: 1.25,
  } as const,
  subtitulo: {
    color: '#d1fae5',
    fontSize: '15px',
    margin: '0',
    lineHeight: 1.6,
  } as const,
  tarjeta: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 3px 10px rgba(15, 23, 42, 0.035)',
  } as const,
  tituloSeccion: {
    fontSize: '21px',
    fontWeight: 750,
    color: VERDE,
    margin: '0 0 8px',
  } as const,
  etiqueta: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '8px',
  } as const,
  campo: {
    display: 'block',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box' as const,
    height: '46px',
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    fontSize: '14px',
  } as const,
  boton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box' as const,
    minHeight: '46px',
    padding: '12px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as const,
  tablaContenedor: {
    width: '100%',
    overflowX: 'auto' as const,
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
  } as const,
  tabla: {
    width: '100%',
    minWidth: '650px',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
    fontSize: '14px',
  } as const,
  celda: {
    padding: '15px 18px',
    borderBottom: '1px solid #edf2f7',
    verticalAlign: 'middle' as const,
  } as const,
};

// Los egresos utilizan fechas de calendario de Perú.
function inicioDelDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-05:00`);
}

function inicioDiaSiguiente(fecha: string): Date {
  const resultado = inicioDelDia(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
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

// Los ingresos se muestran usando la fecha UTC almacenada.
function inicioPagoUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function finPagoUTCExclusivo(fecha: string): Date {
  const resultado = inicioPagoUTC(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function formatoFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fecha);
}

function formatoFechaPago(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'UTC',
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

  return !Number.isNaN(date.getTime()) && fechaLima(date) === fecha;
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parametros = await searchParams;

  const desde = fechaValida(parametros.desde) ? parametros.desde! : '';
  const hasta = fechaValida(parametros.hasta) ? parametros.hasta! : '';

  const rangoValido = !desde || !hasta || desde <= hasta;

  // Filtros de ingresos: UTC.
  const inicioPago = desde ? inicioPagoUTC(desde) : undefined;
  const finPagoExclusivo = hasta
    ? finPagoUTCExclusivo(hasta)
    : undefined;

  // Filtros de egresos: hora local de Perú.
  const inicioEgreso = desde ? inicioDelDia(desde) : undefined;
  const finEgresoExclusivo = hasta
    ? inicioDiaSiguiente(hasta)
    : undefined;

  const filtroPagos: {
    status: 'APPROVED';
    paymentDate?: { gte?: Date; lt?: Date };
  } = { status: 'APPROVED' };

  const filtroEgresos: {
    fecha?: { gte?: Date; lt?: Date };
  } = {};

  if (inicioPago) {
    filtroPagos.paymentDate = {
      ...filtroPagos.paymentDate,
      gte: inicioPago,
    };
  }

  if (finPagoExclusivo) {
    filtroPagos.paymentDate = {
      ...filtroPagos.paymentDate,
      lt: finPagoExclusivo,
    };
  }

  if (inicioEgreso) {
    filtroEgresos.fecha = {
      ...filtroEgresos.fecha,
      gte: inicioEgreso,
    };
  }

  if (finEgresoExclusivo) {
    filtroEgresos.fecha = {
      ...filtroEgresos.fecha,
      lt: finEgresoExclusivo,
    };
  }

  const [pagos, egresos] = rangoValido
    ? await Promise.all([
        prisma.payment.findMany({
          where: filtroPagos,
          include: {
            player: { select: { fullName: true } },
            paymentType: { select: { description: true } },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.egreso.findMany({
          where: filtroEgresos,
          include: {
            tipoEgreso: { select: { descripcion: true } },
          },
          orderBy: { fecha: 'desc' },
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

  const cuotasAgrupadas = new Map<string, Ingreso>();
  const ingresosIndividuales: Ingreso[] = [];

  for (const pago of pagos) {
    const importe = Number(pago.amount ?? 0);
    const concepto = pago.paymentType?.description ?? 'Sin concepto';

    if (
      concepto.trim().toLowerCase() === CONCEPTO_CUOTA.toLowerCase()
    ) {
      // Agrupar las cuotas según el día UTC del pago.
      const dia = pago.paymentDate.toISOString().slice(0, 10);
      const clave = `${dia}|${CONCEPTO_CUOTA}`;
      const existente = cuotasAgrupadas.get(clave);

      if (existente) {
        existente.importe += importe;
      } else {
        cuotasAgrupadas.set(clave, {
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
    ...Array.from(cuotasAgrupadas.values()),
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

  const tarjetasResumen = [
    {
      titulo: 'Total de ingresos',
      total: totalIngresos,
      detalle: `${ingresos.length} movimientos de ingreso`,
      icono: TrendingUp,
      color: '#15803d',
      fondo: '#f0fdf4',
      borde: '#bbf7d0',
    },
    {
      titulo: 'Total de egresos',
      total: totalEgresos,
      detalle: `${egresos.length} gastos registrados`,
      icono: TrendingDown,
      color: '#dc2626',
      fondo: '#fef2f2',
      borde: '#fecaca',
    },
    {
      titulo: 'Balance neto',
      total: balanceNeto,
      detalle: 'Ingresos menos egresos',
      icono: Scale,
      color: balanceNeto < 0 ? '#dc2626' : VERDE,
      fondo: '#f0fdfa',
      borde: '#99f6e4',
    },
  ];

  return (
    <main style={estilos.pagina}>
      <div style={estilos.contenedor}>
        <header style={estilos.encabezado}>
          <Link href="/" style={estilos.volver}>
            <ArrowLeft size={18} />
            Volver al inicio
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                height: 52,
                flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderRadius: 12,
              }}
            >
              <Scale size={29} />
            </div>
            <div>
              <h1 style={estilos.titulo}>Balance del club</h1>
              <p style={estilos.subtitulo}>
                Control de ingresos, egresos y saldo del club.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 22,
              padding: '9px 13px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#ecfdf5',
              fontSize: 13,
            }}
          >
            <CalendarDays size={16} />
            {tituloRango}
          </div>
        </header>

        <section style={estilos.tarjeta}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 7,
            }}
          >
            <CalendarDays color={VERDE} size={22} />
            <h2 style={{ ...estilos.tituloSeccion, margin: 0 }}>
              Filtrar por fechas
            </h2>
          </div>

          <p
            style={{
              color: '#64748b',
              fontSize: 14,
              lineHeight: 1.6,
              margin: '8px 0 22px',
            }}
          >
            Selecciona el periodo que deseas consultar. Puedes indicar una
            sola fecha o dejar ambas vacías para ver todos los movimientos.
          </p>

          <form
            action="/balance"
            method="GET"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              gap: 16,
            }}
          >
            <div style={{ flex: '1 1 190px', minWidth: 0 }}>
              <label htmlFor="desde" style={estilos.etiqueta}>
                Fecha desde
              </label>
              <input
                id="desde"
                name="desde"
                type="date"
                defaultValue={desde}
                style={estilos.campo}
              />
            </div>

            <div style={{ flex: '1 1 190px', minWidth: 0 }}>
              <label htmlFor="hasta" style={estilos.etiqueta}>
                Fecha hasta
              </label>
              <input
                id="hasta"
                name="hasta"
                type="date"
                defaultValue={hasta}
                min={desde || undefined}
                style={estilos.campo}
              />
            </div>

            <button
              type="submit"
              style={{
                ...estilos.boton,
                flex: '0 0 auto',
                border: '1px solid #047857',
                backgroundColor: '#047857',
                color: '#ffffff',
              }}
            >
              Consultar balance
            </button>

            <Link
              href="/balance"
              style={{
                ...estilos.boton,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
              }}
            >
              Ver todo
            </Link>
          </form>

          {!rangoValido && (
            <p
              style={{
                margin: '16px 0 0',
                padding: 12,
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 8,
                color: '#b91c1c',
                fontSize: 14,
              }}
            >
              La fecha Desde no puede ser posterior a la fecha Hasta.
              Selecciona un rango válido.
            </p>
          )}
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))',
            gap: 20,
            marginBottom: 32,
          }}
        >
          {tarjetasResumen.map((tarjeta) => {
            const Icono = tarjeta.icono;

            return (
              <div
                key={tarjeta.titulo}
                style={{
                  backgroundColor: '#ffffff',
                  border: `1px solid ${tarjeta.borde}`,
                  borderTop: `4px solid ${tarjeta.color}`,
                  borderRadius: 14,
                  padding: '23px 24px',
                  boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 22,
                  }}
                >
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {tarjeta.titulo}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 42,
                      height: 42,
                      backgroundColor: tarjeta.fondo,
                      borderRadius: 10,
                    }}
                  >
                    <Icono size={23} color={tarjeta.color} />
                  </span>
                </div>

                <p
                  style={{
                    color: tarjeta.color,
                    fontSize: 'clamp(23px, 2.5vw, 30px)',
                    fontWeight: 800,
                    margin: '0 0 10px',
                    letterSpacing: '-0.7px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {formatoMoneda(tarjeta.total)}
                </p>

                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  {tarjeta.detalle}
                </p>
              </div>
            );
          })}
        </section>

        <section style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={estilos.tituloSeccion}>Detalle de ingresos</h2>
            <p
              style={{
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Pagos aprobados. Las cuotas por partido se agrupan por fecha
              y se identifican como VARIOS.
            </p>
          </div>

          <div style={estilos.tablaContenedor}>
            <table style={estilos.tabla}>
              <thead>
                <tr style={{ backgroundColor: '#e8f5ee', color: VERDE }}>
                  {['Fecha', 'Jugador', 'Concepto', 'Importe'].map((texto, i) => (
                    <th
                      key={texto}
                      style={{
                        padding: '15px 18px',
                        fontWeight: 750,
                        fontSize: 13,
                        textAlign: i === 3 ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {texto}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {ingresos.map((ingreso, indice) => (
                  <tr
                    key={ingreso.clave}
                    style={{
                      backgroundColor: indice % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ ...estilos.celda, whiteSpace: 'nowrap' }}>
                      {formatoFechaPago(ingreso.fecha)}
                    </td>
                    <td
                      style={{
                        ...estilos.celda,
                        fontWeight: 650,
                        color: ingreso.jugador === 'VARIOS' ? VERDE : '#334155',
                      }}
                    >
                      {ingreso.jugador}
                    </td>
                    <td style={estilos.celda}>
                      {ingreso.concepto}
                    </td>
                    <td
                      style={{
                        ...estilos.celda,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 750,
                        color: '#15803d',
                      }}
                    >
                      {formatoMoneda(ingreso.importe)}
                    </td>
                  </tr>
                ))}

                {ingresos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '38px 16px',
                        textAlign: 'center',
                        color: '#64748b',
                      }}
                    >
                      No hay ingresos aprobados para este periodo.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr style={{ backgroundColor: '#f0fdf4' }}>
                  <td
                    colSpan={3}
                    style={{
                      padding: '17px 18px',
                      fontWeight: 800,
                      color: '#166534',
                      borderTop: '1px solid #bbf7d0',
                    }}
                  >
                    TOTAL DE INGRESOS
                  </td>
                  <td
                    style={{
                      padding: '17px 18px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#15803d',
                      whiteSpace: 'nowrap',
                      borderTop: '1px solid #bbf7d0',
                    }}
                  >
                    {formatoMoneda(totalIngresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={estilos.tituloSeccion}>Detalle de egresos</h2>
            <p
              style={{
                color: '#64748b',
                fontSize: 14,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Gastos registrados dentro del periodo seleccionado.
            </p>
          </div>

          <div style={estilos.tablaContenedor}>
            <table style={estilos.tabla}>
              <thead>
                <tr style={{ backgroundColor: '#fff0f0', color: '#991b1b' }}>
                  {['Fecha', 'Concepto', 'Responsable', 'Importe'].map((texto, i) => (
                    <th
                      key={texto}
                      style={{
                        padding: '15px 18px',
                        fontWeight: 750,
                        fontSize: 13,
                        textAlign: i === 3 ? 'right' : 'left',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {texto}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {egresos.map((egreso, indice) => (
                  <tr
                    key={egreso.id}
                    style={{
                      backgroundColor: indice % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ ...estilos.celda, whiteSpace: 'nowrap' }}>
                      {formatoFecha(egreso.fecha)}
                    </td>
                    <td style={estilos.celda}>
                      {egreso.tipoEgreso.descripcion}
                    </td>
                    <td style={estilos.celda}>
                      {egreso.responsableEgreso}
                    </td>
                    <td
                      style={{
                        ...estilos.celda,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 750,
                        color: '#dc2626',
                      }}
                    >
                      {formatoMoneda(Number(egreso.monto))}
                    </td>
                  </tr>
                ))}

                {egresos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '38px 16px',
                        textAlign: 'center',
                        color: '#64748b',
                      }}
                    >
                      No hay egresos registrados para este periodo.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr style={{ backgroundColor: '#fef2f2' }}>
                  <td
                    colSpan={3}
                    style={{
                      padding: '17px 18px',
                      fontWeight: 800,
                      color: '#991b1b',
                      borderTop: '1px solid #fecaca',
                    }}
                  >
                    TOTAL DE EGRESOS
                  </td>
                  <td
                    style={{
                      padding: '17px 18px',
                      textAlign: 'right',
                      fontWeight: 800,
                      color: '#dc2626',
                      whiteSpace: 'nowrap',
                      borderTop: '1px solid #fecaca',
                    }}
                  >
                    {formatoMoneda(totalEgresos)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section
          style={{
            ...estilos.tarjeta,
            borderLeft: '5px solid #0f766e',
            marginBottom: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 20,
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 8px',
                  color: '#64748b',
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Resultado del periodo
              </p>
              <h2
                style={{
                  margin: 0,
                  color: '#1e293b',
                  fontSize: 20,
                  fontWeight: 800,
                }}
              >
                Balance neto
              </h2>
              <p
                style={{
                  margin: '7px 0 0',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Ingresos menos egresos
              </p>
            </div>

            <p
              style={{
                margin: 0,
                color: balanceNeto < 0 ? '#dc2626' : VERDE,
                fontSize: 'clamp(27px, 4vw, 36px)',
                fontWeight: 850,
                letterSpacing: '-0.8px',
                overflowWrap: 'anywhere',
              }}
            >
              {formatoMoneda(balanceNeto)}
            </p>
          </div>
        </section>

        <footer
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 12,
            paddingTop: 24,
          }}
        >
          Peloteros San Antonio FC · Balance financiero
        </footer>
      </div>
    </main>
  );
}
