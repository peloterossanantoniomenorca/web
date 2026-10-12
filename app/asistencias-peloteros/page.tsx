'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Users,
  XCircle,
} from 'lucide-react';

type Asistente = {
  playerId: string;
  fullName: string;
  jerseyNumber: number;
  estadoPago: 'PAGADO' | 'POR_PAGAR';
};

const meses = [
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

const diasSemana = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

function fechaLocal(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(
    dia
  ).padStart(2, '0')}`;
}

function formatoFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const date = new Date(Date.UTC(anio, mes - 1, dia));

  return {
    completa: new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date),
    diaSemana: new Intl.DateTimeFormat('es-PE', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(date),
  };
}

export default function AsistenciasPeloterosPage() {
  const ahora = new Date();

  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [fechas, setFechas] = useState<string[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [asistentes, setAsistentes] = useState<Asistente[]>([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();

    return Array.from(
      { length: Math.max(actual - 2025 + 3, 5) },
      (_, i) => actual + 1 - i
    ).sort((a, b) => b - a);
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function cargarCalendario() {
      setCargandoCalendario(true);
      setError('');
      setFechas([]);
      setFechaSeleccionada('');
      setAsistentes([]);

      try {
        const response = await fetch(
          `/api/asistencias/publicas?anio=${anio}&mes=${mes}`,
          { cache: 'no-store' }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'No se pudo cargar el calendario.'
          );
        }

        if (cancelado) return;

        const disponibles: string[] = data.fechas || [];
        setFechas(disponibles);

        // Selecciona automáticamente la primera fecha con asistencia.
        setFechaSeleccionada(disponibles[0] || '');
      } catch (err) {
        if (cancelado) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al cargar el calendario.'
        );
      } finally {
        if (!cancelado) setCargandoCalendario(false);
      }
    }

    void cargarCalendario();

    return () => {
      cancelado = true;
    };
  }, [anio, mes]);

  useEffect(() => {
    if (!fechaSeleccionada) {
      setAsistentes([]);
      return;
    }

    let cancelado = false;

    async function cargarDetalle() {
      setCargandoDetalle(true);
      setError('');
      setAsistentes([]);

      try {
        const response = await fetch(
          `/api/asistencias/publicas?anio=${anio}&mes=${mes}&fecha=${fechaSeleccionada}`,
          { cache: 'no-store' }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || 'No se pudo cargar la asistencia.'
          );
        }

        if (!cancelado) {
          setAsistentes(data.asistentes || []);
        }
      } catch (err) {
        if (!cancelado) {
          setError(
            err instanceof Error
              ? err.message
              : 'Ocurrió un error al consultar la asistencia.'
          );
        }
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    }

    void cargarDetalle();

    return () => {
      cancelado = true;
    };
  }, [anio, mes, fechaSeleccionada]);

  const diasDelMes = new Date(anio, mes, 0).getDate();

  // El calendario empieza en lunes.
  const espaciosIniciales =
    (new Date(anio, mes - 1, 1).getDay() + 6) % 7;

  const totalPagados = asistentes.filter(
    (p) => p.estadoPago === 'PAGADO'
  ).length;

  const totalPendientes = asistentes.filter(
    (p) => p.estadoPago === 'POR_PAGAR'
  ).length;

  const fechaInfo = fechaSeleccionada
    ? formatoFecha(fechaSeleccionada)
    : null;

  const thStyle = {
    padding: '13px 12px',
    textAlign: 'left' as const,
    background: '#f0fdf4',
    color: '#334155',
    fontSize: 13,
    borderBottom: '1px solid #dbe7df',
    whiteSpace: 'nowrap' as const,
  };

  const tdStyle = {
    padding: '14px 12px',
    borderBottom: '1px solid #edf2ef',
  };

  function cambiarMes(direccion: number) {
    const date = new Date(anio, mes - 1 + direccion, 1);
    setAnio(date.getFullYear());
    setMes(date.getMonth() + 1);
  }

  return (
    <main
      className="container"
      style={{
        padding: '38px 0 70px',
        color: '#12352b',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 26 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              borderRadius: 999,
              background: '#d1fae5',
              color: '#047857',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <ClipboardList size={15} />
            CONSULTA PÚBLICA
          </span>

          <h1
            style={{
              fontSize: 32,
              lineHeight: 1.25,
              margin: '14px 0 8px',
            }}
          >
            Asistencias peloteros
          </h1>

          <p style={{ color: '#64748b', lineHeight: 1.7, margin: 0 }}>
            Consulta las fechas de pichanga, quiénes asistieron y si
            pagaron su cuota correspondiente.
          </p>
        </div>

        <section
          className="card"
          style={{
            padding: 22,
            marginBottom: 22,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <div style={{ flex: '1 1 180px' }}>
            <label
              htmlFor="filtro-anio"
              style={{
                display: 'block',
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Año
            </label>

            <select
              id="filtro-anio"
              className="input"
              value={anio}
              onChange={(event) =>
                setAnio(Number(event.target.value))
              }
            >
              {anios.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 180px' }}>
            <label
              htmlFor="filtro-mes"
              style={{
                display: 'block',
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Mes
            </label>

            <select
              id="filtro-mes"
              className="input"
              value={mes}
              onChange={(event) => setMes(Number(event.target.value))}
            >
              {meses.map((nombre, index) => (
                <option key={nombre} value={index + 1}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              flex: '1 1 100%',
              color: '#64748b',
              fontSize: 13,
            }}
          >
            <CalendarDays
              size={16}
              style={{
                display: 'inline',
                verticalAlign: 'middle',
                marginRight: 7,
                color: '#047857',
              }}
            />
            {fechas.length} {fechas.length === 1
              ? 'fecha con asistencia registrada'
              : 'fechas con asistencia registrada'}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              marginBottom: 18,
              borderRadius: 12,
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <section className="card" style={{ padding: 20, marginBottom: 22 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              style={{
                background: '#f0fdf4',
                color: '#047857',
                border: '1px solid #bbf7d0',
              }}
            >
              <ChevronLeft size={19} />
            </button>

            <h2
              style={{
                margin: 0,
                fontSize: 21,
                textTransform: 'capitalize',
                textAlign: 'center',
              }}
            >
              {meses[mes - 1]} {anio}
            </h2>

            <button
              type="button"
              className="btn"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              style={{
                background: '#f0fdf4',
                color: '#047857',
                border: '1px solid #bbf7d0',
              }}
            >
              <ChevronRight size={19} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 5,
            }}
          >
            {diasSemana.map((dia) => (
              <div
                key={dia}
                style={{
                  padding: '9px 1px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                <span className="desktop-day">{dia}</span>
                <span className="mobile-day">
                  {dia === 'Miércoles'
                    ? 'Mi'
                    : dia === 'Sábado'
                      ? 'Sá'
                      : dia.slice(0, 2)}
                </span>
              </div>
            ))}

            {Array.from({ length: espaciosIniciales }, (_, index) => (
              <div key={`espacio-${index}`} />
            ))}

            {Array.from({ length: diasDelMes }, (_, index) => {
              const dia = index + 1;
              const fecha = fechaLocal(anio, mes, dia);
              const disponible = fechas.includes(fecha);
              const seleccionada = fechaSeleccionada === fecha;

              return (
                <button
                  key={fecha}
                  type="button"
                  disabled={!disponible || cargandoCalendario}
                  onClick={() => setFechaSeleccionada(fecha)}
                  aria-label={`${formatoFecha(fecha).completa}${
                    disponible ? ', asistencia registrada' : ', sin asistencia registrada'
                  }`}
                  aria-pressed={seleccionada}
                  style={{
                    minWidth: 0,
                    minHeight: 66,
                    padding: '7px 2px',
                    borderRadius: 12,
                    border: seleccionada
                      ? '2px solid #047857'
                      : disponible
                        ? '1px solid #a7f3d0'
                        : '1px solid transparent',
                    background: seleccionada
                      ? '#065f46'
                      : disponible
                        ? '#ecfdf5'
                        : 'transparent',
                    color: seleccionada
                      ? '#ffffff'
                      : disponible
                        ? '#065f46'
                        : '#cbd5e1',
                    cursor: disponible ? 'pointer' : 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    fontWeight: disponible ? 800 : 400,
                  }}
                >
                  <span>{dia}</span>

                  {disponible && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: seleccionada ? '#ffffff' : '#059669',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#059669',
                }}
              />
              Fecha con asistencia registrada
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#cbd5e1',
                }}
              />
              Sin asistencia registrada
            </span>
          </div>

          {cargandoCalendario && (
            <p
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 9,
                color: '#047857',
                padding: 18,
              }}
            >
              <LoaderCircle size={20} />
              Cargando calendario...
            </p>
          )}

          {!cargandoCalendario && fechas.length === 0 && !error && (
            <div
              style={{
                textAlign: 'center',
                padding: '26px 12px',
                color: '#64748b',
              }}
            >
              <CalendarDays
                size={30}
                style={{ margin: '0 auto 10px', color: '#94a3b8' }}
              />
              <strong>No hay asistencias registradas</strong>
              <p style={{ marginBottom: 0, fontSize: 13 }}>
                No existen fechas con peloteros asistentes en este mes.
              </p>
            </div>
          )}
        </section>

        {fechaSeleccionada && (
          <section className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: '#d1fae5',
                  color: '#047857',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <CalendarDays size={24} />
              </div>

              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 21,
                    textTransform: 'capitalize',
                  }}
                >
                  {fechaInfo?.completa}
                </h2>
                <p
                  style={{
                    margin: '5px 0 0',
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Relación de peloteros asistentes
                </p>
              </div>
            </div>

            {cargandoDetalle ? (
              <div
                style={{
                  padding: 35,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 10,
                  color: '#047857',
                }}
              >
                <LoaderCircle size={22} />
                Cargando asistentes...
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(145px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      borderRadius: 12,
                      background: '#f8fafc',
                    }}
                  >
                    <Users size={20} color="#047857" />
                    <p
                      style={{
                        margin: '8px 0 2px',
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      Asistieron
                    </p>
                    <strong style={{ fontSize: 25 }}>
                      {asistentes.length}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 15,
                      borderRadius: 12,
                      background: '#f0fdf4',
                    }}
                  >
                    <CheckCircle2 size={20} color="#15803d" />
                    <p
                      style={{
                        margin: '8px 0 2px',
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      Pagados
                    </p>
                    <strong style={{ fontSize: 25, color: '#15803d' }}>
                      {totalPagados}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: 15,
                      borderRadius: 12,
                      background: '#fffbeb',
                    }}
                  >
                    <XCircle size={20} color="#b45309" />
                    <p
                      style={{
                        margin: '8px 0 2px',
                        color: '#64748b',
                        fontSize: 13,
                      }}
                    >
                      Por pagar
                    </p>
                    <strong style={{ fontSize: 25, color: '#b45309' }}>
                      {totalPendientes}
                    </strong>
                  </div>
                </div>

                {asistentes.length === 0 ? (
                  <p
                    style={{
                      padding: 20,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    No hay peloteros asistentes registrados para esta fecha.
                  </p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        minWidth: 430,
                        borderCollapse: 'collapse',
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={thStyle}>N.º</th>
                          <th style={thStyle}>Pelotero</th>
                          <th style={thStyle}>Estado de pago</th>
                        </tr>
                      </thead>

                      <tbody>
                        {asistentes.map((pelotero) => (
                          <tr key={pelotero.playerId}>
                            <td
                              style={{
                                ...tdStyle,
                                fontWeight: 800,
                                color: '#047857',
                              }}
                            >
                              #{pelotero.jerseyNumber}
                            </td>

                            <td style={{ ...tdStyle, fontWeight: 700 }}>
                              {pelotero.fullName}
                            </td>

                            <td style={tdStyle}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  borderRadius: 999,
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap',
                                  background:
                                    pelotero.estadoPago === 'PAGADO'
                                      ? '#dcfce7'
                                      : '#fef3c7',
                                  color:
                                    pelotero.estadoPago === 'PAGADO'
                                      ? '#166534'
                                      : '#92400e',
                                }}
                              >
                                {pelotero.estadoPago === 'PAGADO'
                                  ? 'Pagado'
                                  : 'Por pagar'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            <p
              style={{
                margin: '18px 0 0',
                fontSize: 12,
                color: '#64748b',
                lineHeight: 1.6,
              }}
            >
              Reporte de solo lectura. El estado Pagado corresponde a una
              cuota por partido aprobada para la fecha seleccionada.
            </p>
          </section>
        )}
      </div>

      <style jsx>{`
        .mobile-day {
          display: none;
        }

        @media (max-width: 600px) {
          .desktop-day {
            display: none;
          }

          .mobile-day {
            display: inline;
          }
        }
      `}</style>
    </main>
  );
}
