'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LoaderCircle,
  RefreshCw,
  Users,
  XCircle,
} from 'lucide-react';

type FechaReporte = {
  fecha: string;
  fechaFormato: string;
};

type JugadorReporte = {
  playerId: string;
  nombre: string;
  fechasAsistidas: FechaReporte[];
  fechasPendientes: FechaReporte[];
  estadoCuenta: 'AL_DIA' | 'DEBE';
};

type ReporteResponse = {
  reporte: JugadorReporte[];
  totalPeloteros: number;
  totalAlDia: number;
  totalDebe: number;
  error?: string;
};

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

export default function ReporteCuotasPage() {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');
  const [datos, setDatos] = useState<ReporteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const cargarReporte = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ anio });

      if (mes) params.set('mes', mes);
      if (dia) params.set('dia', dia);

      const response = await fetch(
        `/api/reportes/cuotas?${params.toString()}`,
        { cache: 'no-store' }
      );

      const data = (await response.json()) as ReporteResponse;

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar el reporte.');
      }

      setDatos(data);
    } catch (err) {
      setDatos(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al consultar el reporte.'
      );
    } finally {
      setLoading(false);
    }
  }, [anio, mes, dia]);

  useEffect(() => {
    void cargarReporte();
  }, [cargarReporte]);

  const anios = Array.from(
    { length: 7 },
    (_, index) => String(new Date().getFullYear() - index)
  );

  const diasDelMes = mes
    ? new Date(Number(anio), Number(mes), 0).getDate()
    : 31;

  const thStyle = {
    padding: '14px 12px',
    textAlign: 'left' as const,
    background: '#f0fdf4',
    color: '#334155',
    borderBottom: '1px solid #dbe7df',
    fontSize: 13,
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: '15px 12px',
    borderBottom: '1px solid #edf2ef',
    verticalAlign: 'top' as const,
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 13px',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#ffffff',
    color: '#12352b',
    minHeight: 44,
  };

  return (
    <main
      className="container"
      style={{
        padding: '38px 0 70px',
        color: '#12352b',
        minHeight: '70vh',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#047857',
            fontWeight: 800,
            textDecoration: 'none',
            marginBottom: 22,
          }}
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </Link>

        <div style={{ marginBottom: 26 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              borderRadius: 999,
              background: '#d1fae5',
              color: '#047857',
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <FileText size={15} />
            CONSULTA PÚBLICA
          </span>

          <h1
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              lineHeight: 1.2,
              margin: '15px 0 8px',
            }}
          >
            Reporte de cuotas por partido
          </h1>

          <p
            style={{
              color: '#64748b',
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 760,
            }}
          >
            Consulta el estado de cuenta de los peloteros según sus
            asistencias registradas y las cuotas por partido aprobadas.
            Este reporte es de libre acceso.
          </p>
        </div>

        <section
          className="card"
          style={{ padding: 22, marginBottom: 22 }}
        >
          <h2 style={{ margin: '0 0 18px', fontSize: 19 }}>
            <CalendarDays
              size={20}
              style={{
                display: 'inline',
                verticalAlign: 'middle',
                marginRight: 8,
                color: '#047857',
              }}
            />
            Filtrar reporte
          </h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void cargarReporte();
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
              alignItems: 'end',
            }}
          >
            <label style={{ display: 'block', fontWeight: 700 }}>
              Año
              <select
                value={anio}
                onChange={(event) => {
                  setAnio(event.target.value);
                  setDia('');
                }}
                style={{ ...inputStyle, display: 'block', marginTop: 8 }}
              >
                {anios.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', fontWeight: 700 }}>
              Mes
              <select
                value={mes}
                onChange={(event) => {
                  setMes(event.target.value);
                  setDia('');
                }}
                style={{ ...inputStyle, display: 'block', marginTop: 8 }}
              >
                <option value="">Todos los meses</option>
                {MESES.map((nombre, index) => (
                  <option key={nombre} value={String(index + 1)}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', fontWeight: 700 }}>
              Día
              <select
                value={dia}
                onChange={(event) => setDia(event.target.value)}
                disabled={!mes}
                style={{
                  ...inputStyle,
                  display: 'block',
                  marginTop: 8,
                  opacity: mes ? 1 : 0.55,
                }}
              >
                <option value="">Todos los días</option>
                {Array.from({ length: diasDelMes }, (_, index) => (
                  <option key={index + 1} value={String(index + 1)}>
                    {String(index + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="btn btn-dark"
              disabled={loading}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              {loading ? (
                <LoaderCircle size={18} />
              ) : (
                <RefreshCw size={17} />
              )}
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
          </form>

          <p
            style={{
              color: '#64748b',
              fontSize: 12,
              margin: '13px 0 0',
              lineHeight: 1.6,
            }}
          >
            Selecciona solo el año para revisar todo el año; agrega el
            mes para limitar la consulta, y el día para consultar una
            fecha específica.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            style={{
              padding: 15,
              marginBottom: 18,
              borderRadius: 12,
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        {datos && (
          <>
            <section
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 14,
                marginBottom: 22,
              }}
            >
              <div className="card" style={{ padding: 18 }}>
                <Users size={23} color="#047857" />
                <p style={{ color: '#64748b', margin: '10px 0 4px' }}>
                  Peloteros con asistencia
                </p>
                <strong style={{ fontSize: 30 }}>
                  {datos.totalPeloteros}
                </strong>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <CheckCircle2 size={23} color="#16a34a" />
                <p style={{ color: '#64748b', margin: '10px 0 4px' }}>
                  Al día
                </p>
                <strong style={{ fontSize: 30, color: '#15803d' }}>
                  {datos.totalAlDia}
                </strong>
              </div>

              <div className="card" style={{ padding: 18 }}>
                <XCircle size={23} color="#dc2626" />
                <p style={{ color: '#64748b', margin: '10px 0 4px' }}>
                  Deben cuotas
                </p>
                <strong style={{ fontSize: 30, color: '#b91c1c' }}>
                  {datos.totalDebe}
                </strong>
              </div>
            </section>

            <section
              className="card"
              style={{ padding: 18, overflowX: 'auto' }}
            >
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 21 }}>
                  Estado de cuenta de los peloteros
                </h2>
                <p
                  style={{
                    margin: '6px 0 0',
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  {mes
                    ? `${MESES[Number(mes) - 1]} de ${anio}`
                    : `Año ${anio}`}
                  {dia ? ` — Día ${dia}` : ''}
                </p>
              </div>

              {datos.reporte.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '35px 15px',
                    color: '#64748b',
                  }}
                >
                  <Users
                    size={35}
                    style={{ margin: '0 auto 12px', opacity: 0.6 }}
                  />
                  <p style={{ fontWeight: 800, margin: 0 }}>
                    No hay asistencias registradas en este período.
                  </p>
                  <p style={{ fontSize: 13 }}>
                    Prueba con otro año, mes o día.
                  </p>
                </div>
              ) : (
                <table
                  style={{
                    width: '100%',
                    minWidth: 700,
                    borderCollapse: 'collapse',
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Pelotero</th>
                      <th style={thStyle}>Estado de cuenta</th>
                      <th style={thStyle}>Fechas pendientes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {datos.reporte.map((jugador) => (
                      <tr key={jugador.playerId}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>
                          {jugador.nombre}
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              borderRadius: 999,
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              background:
                                jugador.estadoCuenta === 'AL_DIA'
                                  ? '#dcfce7'
                                  : '#fee2e2',
                              color:
                                jugador.estadoCuenta === 'AL_DIA'
                                  ? '#166534'
                                  : '#991b1b',
                            }}
                          >
                            {jugador.estadoCuenta === 'AL_DIA' ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Clock3 size={14} />
                            )}
                            {jugador.estadoCuenta === 'AL_DIA'
                              ? 'Al día'
                              : 'Debe'}
                          </span>
                        </td>

                        <td style={{ ...tdStyle, minWidth: 220 }}>
                          {jugador.fechasPendientes.length === 0 ? (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 6,
                              }}
                            >
                              {jugador.fechasPendientes.map((fecha) => (
                                <span
                                  key={fecha.fecha}
                                  style={{
                                    background: '#fff1f2',
                                    color: '#9f1239',
                                    border: '1px solid #fecdd3',
                                    borderRadius: 8,
                                    padding: '5px 8px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {fecha.fechaFormato}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div
                style={{
                  marginTop: 18,
                  padding: 13,
                  background: '#f8fafc',
                  color: '#475569',
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.7,
                }}
              >
                <strong>Importante:</strong> solo cuentan los pagos
                aprobados del concepto «Pago cuota por partido» asociados
                a la fecha correspondiente. Las donaciones y otros
                conceptos no se consideran cuotas. Solo se muestran
                peloteros con asistencia registrada en el período elegido,
                independientemente de si están activos o inactivos.
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
