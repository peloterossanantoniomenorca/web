import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, TrendingUp, TrendingDown, Scale } from 'lucide-react';

export const dynamic = 'force-dynamic';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatoMoneda(valor: number) {
  return valor.toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatoFecha(fecha: Date) {
  return fecha.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;

  const fechaActual = new Date(
    new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    }),
  );

  const anioActual = fechaActual.getFullYear();
  const mesActual = fechaActual.getMonth() + 1;

  const anioSolicitado = Number(params.year);
  const mesSolicitado = Number(params.month);

  const anio =
    Number.isInteger(anioSolicitado) &&
    anioSolicitado >= 2000 &&
    anioSolicitado <= anioActual + 1
      ? anioSolicitado
      : anioActual;

  const mes =
    Number.isInteger(mesSolicitado) &&
    mesSolicitado >= 1 &&
    mesSolicitado <= 12
      ? mesSolicitado
      : mesActual;

  // Fecha de corte: primer día del mes siguiente,
  // a las 00:00 de Lima. Se usa límite exclusivo.
  const siguienteMes = new Date(
    Date.UTC(anio, mes, 1, 5, 0, 0),
  );

  const [ingresos, egresos] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: 'APPROVED',
        paymentDate: {
          lt: siguienteMes,
        },
      },
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
      where: {
        fecha: {
          lt: siguienteMes,
        },
      },
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
  ]);

  const totalIngresos = ingresos.reduce(
    (total, pago) => total + Number(pago.amount ?? 0),
    0,
  );

  const totalEgresos = egresos.reduce(
    (total, egreso) => total + Number(egreso.monto),
    0,
  );

  const balance = totalIngresos - totalEgresos;

  const anios = Array.from(
    { length: Math.max(1, anioActual - 2019) },
    (_, i) => anioActual - i,
  );

  const fechaCorte = new Date(
    Date.UTC(anio, mes, 0, 12, 0, 0),
  );

  return (
    <main className="container" style={{ padding: '36px 0 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#047857',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </Link>
      </div>

      <header
        style={{
          background:
            'linear-gradient(135deg, #03281f 0%, #064e3b 55%, #087f5b 100%)',
          color: '#fff',
          padding: '30px 24px',
          borderRadius: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 8,
          }}
        >
          <Scale size={30} />
          <h1 style={{ margin: 0, fontSize: 32 }}>
            Balance del club
          </h1>
        </div>

        <p style={{ color: '#d1fae5', margin: '8px 0 0' }}>
          Resumen acumulado hasta el cierre de{' '}
          {MESES[mes - 1]} de {anio}.
        </p>

        <p style={{ color: '#d1fae5', fontSize: 13, marginBottom: 0 }}>
          Fecha de corte: {formatoFecha(fechaCorte)}
        </p>
      </header>

      <form
        method="GET"
        style={{
          display: 'flex',
          alignItems: 'end',
          gap: 12,
          flexWrap: 'wrap',
          padding: 20,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <label
          style={{
            display: 'grid',
            gap: 7,
            fontWeight: 700,
            color: '#334155',
          }}
        >
          Año
          <select
            name="year"
            defaultValue={String(anio)}
            style={{
              padding: '11px 12px',
              borderRadius: 9,
              border: '1px solid #cbd5e1',
              minWidth: 130,
              background: '#fff',
            }}
          >
            {anios.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{
            display: 'grid',
            gap: 7,
            fontWeight: 700,
            color: '#334155',
          }}
        >
          Mes de corte
          <select
            name="month"
            defaultValue={String(mes)}
            style={{
              padding: '11px 12px',
              borderRadius: 9,
              border: '1px solid #cbd5e1',
              minWidth: 160,
              background: '#fff',
            }}
          >
            {MESES.map((nombre, index) => (
              <option key={nombre} value={index + 1}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          style={{
            padding: '12px 20px',
            border: 0,
            borderRadius: 9,
            background: '#047857',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Consultar balance
        </button>
      </form>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 36,
        }}
      >
        <div
          className="card"
          style={{
            padding: 24,
            borderTop: '4px solid #16a34a',
          }}
        >
          <TrendingUp color="#16a34a" size={27} />
          <p style={{ color: '#64748b', marginBottom: 6 }}>
            Ingresos acumulados
          </p>
          <div
            style={{
              color: '#16a34a',
              fontSize: 27,
              fontWeight: 900,
            }}
          >
            {formatoMoneda(totalIngresos)}
          </div>
          <small style={{ color: '#64748b' }}>
            {ingresos.length} pagos aprobados
          </small>
        </div>

        <div
          className="card"
          style={{
            padding: 24,
            borderTop: '4px solid #dc2626',
          }}
        >
          <TrendingDown color="#dc2626" size={27} />
          <p style={{ color: '#64748b', marginBottom: 6 }}>
            Egresos acumulados
          </p>
          <div
            style={{
              color: '#dc2626',
              fontSize: 27,
              fontWeight: 900,
            }}
          >
            {formatoMoneda(totalEgresos)}
          </div>
          <small style={{ color: '#64748b' }}>
            {egresos.length} gastos registrados
          </small>
        </div>

        <div
          className="card"
          style={{
            padding: 24,
            borderTop: `4px solid ${balance >= 0 ? '#047857' : '#dc2626'}`,
          }}
        >
          <Scale
            color={balance >= 0 ? '#047857' : '#dc2626'}
            size={27}
          />
          <p style={{ color: '#64748b', marginBottom: 6 }}>
            Balance neto
          </p>
          <div
            style={{
              color: balance >= 0 ? '#047857' : '#dc2626',
              fontSize: 27,
              fontWeight: 900,
            }}
          >
            {formatoMoneda(balance)}
          </div>
          <small style={{ color: '#64748b' }}>
            Ingresos menos egresos
          </small>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ color: '#064e3b' }}>
          1. Detalle de ingresos
        </h2>
        <p style={{ color: '#64748b' }}>
          Pagos aprobados acumulados hasta el mes seleccionado.
        </p>

        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 650,
            }}
          >
            <thead style={{ background: '#ecfdf5' }}>
              <tr>
                {['Fecha', 'Jugador', 'Concepto', 'Importe'].map(
                  (titulo) => (
                    <th
                      key={titulo}
                      style={{
                        padding: 14,
                        textAlign: titulo === 'Importe' ? 'right' : 'left',
                        borderBottom: '1px solid #d1fae5',
                      }}
                    >
                      {titulo}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {ingresos.map((pago) => (
                <tr key={pago.id}>
                  <td style={celda}>{formatoFecha(pago.paymentDate)}</td>
                  <td style={celda}>{pago.player.fullName}</td>
                  <td style={celda}>
                    {pago.paymentType?.description ?? 'Pago'}
                  </td>
                  <td
                    style={{
                      ...celda,
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      color: '#15803d',
                    }}
                  >
                    {formatoMoneda(Number(pago.amount ?? 0))}
                  </td>
                </tr>
              ))}

              {ingresos.length === 0 && (
                <tr>
                  <td colSpan={4} style={celda}>
                    No hay ingresos aprobados hasta esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot style={{ background: '#f0fdf4' }}>
              <tr>
                <td colSpan={3} style={{ ...celda, fontWeight: 900 }}>
                  TOTAL DE INGRESOS
                </td>
                <td
                  style={{
                    ...celda,
                    textAlign: 'right',
                    fontWeight: 900,
                    color: '#15803d',
                  }}
                >
                  {formatoMoneda(totalIngresos)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <h2 style={{ color: '#991b1b' }}>
          2. Detalle de egresos
        </h2>
        <p style={{ color: '#64748b' }}>
          Gastos acumulados hasta el mes seleccionado.
        </p>

        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 650,
            }}
          >
            <thead style={{ background: '#fef2f2' }}>
              <tr>
                {['Fecha', 'Concepto', 'Responsable', 'Importe'].map(
                  (titulo) => (
                    <th
                      key={titulo}
                      style={{
                        padding: 14,
                        textAlign: titulo === 'Importe' ? 'right' : 'left',
                        borderBottom: '1px solid #fecaca',
                      }}
                    >
                      {titulo}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {egresos.map((egreso) => (
                <tr key={egreso.id}>
                  <td style={celda}>{formatoFecha(egreso.fecha)}</td>
                  <td style={celda}>
                    {egreso.tipoEgreso.descripcion}
                  </td>
                  <td style={celda}>{egreso.responsableEgreso}</td>
                  <td
                    style={{
                      ...celda,
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      color: '#b91c1c',
                    }}
                  >
                    {formatoMoneda(Number(egreso.monto))}
                  </td>
                </tr>
              ))}

              {egresos.length === 0 && (
                <tr>
                  <td colSpan={4} style={celda}>
                    No hay egresos registrados hasta esta fecha.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot style={{ background: '#fef2f2' }}>
              <tr>
                <td colSpan={3} style={{ ...celda, fontWeight: 900 }}>
                  TOTAL DE EGRESOS
                </td>
                <td
                  style={{
                    ...celda,
                    textAlign: 'right',
                    fontWeight: 900,
                    color: '#b91c1c',
                  }}
                >
                  {formatoMoneda(totalEgresos)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div
        style={{
          marginTop: 32,
          padding: 20,
          borderRadius: 12,
          background: '#f1f5f9',
          color: '#475569',
          fontSize: 13,
        }}
      >
        Este reporte considera todos los pagos aprobados y egresos
        registrados desde el inicio de los registros hasta el cierre
        del mes seleccionado. Los pagos pendientes y rechazados no
        se contabilizan como ingresos.
      </div>
    </main>
  );
}

const celda = {
  padding: 14,
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left' as const,
};
