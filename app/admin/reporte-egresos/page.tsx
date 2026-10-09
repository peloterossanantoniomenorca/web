import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type SearchParams = {
  anio?: string;
  mes?: string;
  tipo?: string;
};

const meses = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default async function ReporteEgresosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const anioActual = new Date().getFullYear();

  const anioSolicitado = Number(params.anio);
  const anio =
    params.anio &&
    /^\d{4}$/.test(params.anio) &&
    Number.isInteger(anioSolicitado) &&
    anioSolicitado >= 2000 &&
    anioSolicitado <= 2100
      ? anioSolicitado
      : anioActual;

  const mesSolicitado = Number(params.mes);
  const mes =
    params.mes &&
    /^\d{1,2}$/.test(params.mes) &&
    Number.isInteger(mesSolicitado) &&
    mesSolicitado >= 1 &&
    mesSolicitado <= 12
      ? mesSolicitado
      : undefined;

  const tipoId = params.tipo || '';

  const [tipos, fechasRegistradas] = await Promise.all([
    prisma.tipoEgreso.findMany({
      orderBy: { descripcion: 'asc' },
    }),
    prisma.egreso.findMany({
      select: { fecha: true },
    }),
  ]);

  const aniosRegistrados = fechasRegistradas.map((registro) =>
    registro.fecha.getUTCFullYear()
  );

  const aniosDisponibles = Array.from(
    new Set([anioActual, anio, ...aniosRegistrados])
  ).sort((a, b) => b - a);

  const desde = mes
    ? new Date(Date.UTC(anio, mes - 1, 1))
    : new Date(Date.UTC(anio, 0, 1));

  const hasta = mes
    ? new Date(Date.UTC(anio, mes, 1))
    : new Date(Date.UTC(anio + 1, 0, 1));

  const egresos = await prisma.egreso.findMany({
    where: {
      fecha: {
        gte: desde,
        lt: hasta,
      },
      ...(tipoId ? { idTipEgreso: tipoId } : {}),
    },
    include: {
      tipoEgreso: {
        select: {
          descripcion: true,
        },
      },
    },
    orderBy: [
      { fecha: 'desc' },
      { id: 'desc' },
    ],
  });

  const total = egresos.reduce(
    (suma, egreso) => suma + Number(egreso.monto),
    0
  );

  const formatoSoles = (cantidad: number) =>
    cantidad.toLocaleString('es-PE', {
      style: 'currency',
      currency: 'PEN',
    });

  const estiloCampo = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    background: '#fff',
    color: '#111827',
    fontSize: '14px',
  } as const;

  return (
    <main
      className="container"
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '40px 16px 56px',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Link href="/admin" style={{ color: '#166534' }}>
          ← Volver al panel administrador
        </Link>
      </div>

      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#12372b',
          }}
        >
          Reporte de egresos
        </h1>

        <p style={{ color: '#6b7280', marginTop: 8 }}>
          Consulta y filtra los gastos registrados del club.
        </p>
      </header>

      <section
        style={{
          background: '#fff',
          padding: 24,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
          Filtros de búsqueda
        </h2>

        <form
          method="GET"
          action="/admin/reporte-egresos"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <div>
            <label
              htmlFor="anio"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Año
            </label>

            <select
              id="anio"
              name="anio"
              defaultValue={String(anio)}
              style={estiloCampo}
            >
              {aniosDisponibles.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="mes"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Mes
            </label>

            <select
              id="mes"
              name="mes"
              defaultValue={mes ? String(mes) : ''}
              style={estiloCampo}
            >
              <option value="">Todo el año</option>
              {meses.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tipo"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Tipo de egreso
            </label>

            <select
              id="tipo"
              name="tipo"
              defaultValue={tipoId}
              style={estiloCampo}
            >
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => (
                <option
                  key={tipo.idTipEgreso}
                  value={tipo.idTipEgreso}
                >
                  {tipo.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '11px 14px',
                background: '#166534',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Filtrar
            </button>

            <Link
              href="/admin/reporte-egresos"
              style={{
                padding: '11px 14px',
                background: '#f3f4f6',
                color: '#374151',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Limpiar
            </Link>
          </div>
        </form>
      </section>

      <section
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <p style={{ color: '#166534', fontWeight: 600 }}>
          Total de egresos encontrados
        </p>

        <p
          style={{
            color: '#14532d',
            fontSize: 32,
            fontWeight: 800,
            marginTop: 8,
          }}
        >
          {formatoSoles(total)}
        </p>

        <p style={{ color: '#166534', marginTop: 8 }}>
          {egresos.length}{' '}
          {egresos.length === 1 ? 'registro' : 'registros'}
          {' · '}
          {mes
            ? `${meses[mes - 1].label} de ${anio}`
            : `Año ${anio}`}
        </p>
      </section>

      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflowX: 'auto',
        }}
      >
        <div style={{ padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Detalle de egresos
          </h2>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 760,
          }}
        >
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              {[
                'Fecha',
                'Tipo de egreso',
                'Responsable',
                'Monto',
                'Voucher',
              ].map((titulo) => (
                <th
                  key={titulo}
                  style={{
                    padding: '13px 16px',
                    borderTop: '1px solid #e5e7eb',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: 13,
                    color: '#374151',
                  }}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {egresos.map((egreso) => (
              <tr key={egreso.id}>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {egreso.fecha.toLocaleDateString('es-PE', {
                    timeZone: 'UTC',
                  })}
                </td>

                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {egreso.tipoEgreso.descripcion}
                </td>

                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {egreso.responsableEgreso}
                </td>

                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                  }}
                >
                  {formatoSoles(Number(egreso.monto))}
                </td>

                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {egreso.voucherUrl ? (
                    <a
                      href={egreso.voucherUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#166534',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      Ver voucher
                    </a>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>
                      Sin voucher
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {egresos.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: '#6b7280',
                  }}
                >
                  No hay egresos para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
