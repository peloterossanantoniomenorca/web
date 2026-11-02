'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Save,
  Users,
  XCircle,
  AlertTriangle,
  X,
  MessageCircle,
} from 'lucide-react';

type Player = {
  id: string;
  fullName: string;
};

type Attendance = {
  id: string | null;
  playerId: string;
  fechaPichanga: string;
  asistio: boolean;
  estadoPago: string;
};

type AttendanceRow = {
  playerId: string;
  fullName: string;
  asistio: boolean;
  estadoPago: string;
  tocado: boolean;
  teniaRegistro: boolean;
};

type DeudaPelotero = {
  playerId: string;
  fullName: string;
  fechas: string[];
};

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function AsistenciasPage() {
  const [fecha, setFecha] = useState(today());
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deudas, setDeudas] = useState<DeudaPelotero[]>([]);
  const [mostrarPopup, setMostrarPopup] = useState(false);

  const cargarAsistencias = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/asistencias?fecha=${encodeURIComponent(fecha)}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudieron cargar las asistencias.'
        );
      }

      const players: Player[] = data.players || [];
      const asistencias: Attendance[] = data.asistencias || [];

      const attendanceMap = new Map(
        asistencias.map((item) => [item.playerId, item])
      );

      setRows(
        players.map((player) => {
          const existing = attendanceMap.get(player.id);

          return {
            playerId: player.id,
            fullName: player.fullName,
            asistio: existing?.asistio ?? false,
            estadoPago:
              existing?.estadoPago === 'PAGADO'
                ? 'PAGADO'
                : 'POR_PAGAR',
            tocado: false,
            teniaRegistro: Boolean(existing),
          };
        })
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar las asistencias.'
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargarAsistencias();
  }, [cargarAsistencias]);

  function marcarTodos(asistio: boolean) {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        asistio,
        tocado: row.tocado || row.asistio !== asistio,
      }))
    );

    setSuccess('');
    setError('');
  }

  function cambiarAsistencia(playerId: string, asistio: boolean) {
    setRows((current) =>
      current.map((row) =>
        row.playerId === playerId
          ? {
              ...row,
              asistio,
              tocado: row.tocado || row.asistio !== asistio,
            }
          : row
      )
    );

    setSuccess('');
    setError('');
  }

  function compartirPorWhatsApp() {
    const nombresAsistentes = rows
      .filter((row) => row.asistio)
      .map((row, index) => `${index + 1}. ${row.fullName}`);

    if (nombresAsistentes.length === 0) {
      setError(
        'No hay peloteros marcados como asistentes para compartir.'
      );
      return;
    }

    const mensaje = [
      `*ASISTENCIA DE PICHANGA:* ${formatDate(fecha)}`,
      '',
      '*PELOTEROS QUE ASISTIERON:*',
      '',
      ...nombresAsistentes,
      '',
      `*TOTAL DE ASISTENTES:* ${nombresAsistentes.length}`,
    ].join('\n');

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function guardar() {
    setSaving(true);
    setError('');
    setSuccess('');
    setMostrarPopup(false);
    setDeudas([]);

    try {
      const asistenciasModificadas = rows
        .filter((row) => row.tocado)
        .map((row) => ({
          playerId: row.playerId,
          asistio: row.asistio,
        }));

      const playerIdsAsistieron = rows
        .filter((row) => row.asistio)
        .map((row) => row.playerId);

      const response = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha,
          asistencias: asistenciasModificadas,
          playerIdsAsistieron,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudieron guardar las asistencias.'
        );
      }

      await cargarAsistencias();

      const deudasEncontradas: DeudaPelotero[] = data.deudas || [];

      if (deudasEncontradas.length > 0) {
        setDeudas(deudasEncontradas);
        setMostrarPopup(true);

        setSuccess(
          `Asistencia guardada correctamente para el ${formatDate(fecha)}.`
        );
      } else {
        setSuccess(
          `Asistencia guardada correctamente para el ${formatDate(fecha)}. No se encontraron cuotas pendientes de fechas anteriores entre los asistentes.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar las asistencias.'
      );
    } finally {
      setSaving(false);
    }
  }

  const asistentes = rows.filter((row) => row.asistio).length;
  const ausentes = rows.length - asistentes;

  const pendientes = rows.filter(
    (row) => row.asistio && row.estadoPago !== 'PAGADO'
  ).length;

  const pagados = rows.filter(
    (row) => row.asistio && row.estadoPago === 'PAGADO'
  ).length;

  const totalFechasDeuda = deudas.reduce(
    (total, jugador) => total + jugador.fechas.length,
    0
  );

  const thStyle = {
    textAlign: 'left' as const,
    padding: '13px 12px',
    color: '#334155',
    background: '#f0fdf4',
    borderBottom: '1px solid #dbe7df',
    whiteSpace: 'nowrap' as const,
    fontSize: 13,
  };

  const tdStyle = {
    padding: '13px 12px',
    borderBottom: '1px solid #edf2ef',
    verticalAlign: 'middle' as const,
  };

  return (
    <main
      className="container"
      style={{ padding: '38px 0 70px', color: '#12352b' }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 26 }}>
          <a
            href="/admin"
            style={{
              color: '#047857',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: 14,
            }}
          >
            ← Volver al panel administrador
          </a>

          <div style={{ marginTop: 20 }}>
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
              <ClipboardCheck size={15} />
              CONTROL DE ASISTENCIA
            </span>

            <h1
              style={{
                fontSize: 32,
                lineHeight: 1.25,
                margin: '14px 0 8px',
                color: '#12352b',
              }}
            >
              Registro de asistencias
            </h1>

            <p style={{ color: '#64748b', lineHeight: 1.7, margin: 0 }}>
              Marca los peloteros que participaron en la pichanga y lleva
              el control de sus cuotas pendientes.
            </p>
          </div>
        </div>

        <section
          className="card"
          style={{
            padding: 22,
            marginBottom: 22,
            display: 'flex',
            gap: 16,
            alignItems: 'end',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 240px' }}>
            <label
              htmlFor="fecha"
              style={{
                display: 'block',
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Fecha de la pichanga
            </label>

            <div style={{ position: 'relative' }}>
              <CalendarDays
                size={19}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 13,
                  color: '#047857',
                  pointerEvents: 'none',
                }}
              />

              <input
                id="fecha"
                type="date"
                className="input"
                value={fecha}
                onChange={(event) => {
                  setFecha(event.target.value);
                  setMostrarPopup(false);
                  setError('');
                  setSuccess('');
                }}
                style={{ paddingLeft: 42 }}
                required
              />
            </div>
          </div>

          <button
            type="button"
            className="btn"
            disabled={loading || rows.length === 0}
            onClick={() => marcarTodos(true)}
            style={{
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle2 size={17} />
            Marcar a todos
          </button>

          <button
            type="button"
            className="btn"
            disabled={loading || rows.length === 0}
            onClick={() => marcarTodos(false)}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          >
            <XCircle size={17} />
            Desmarcar a todos
          </button>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div className="card" style={{ padding: 18 }}>
            <Users size={22} color="#047857" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              Peloteros activos
            </p>
            <strong style={{ fontSize: 28 }}>{rows.length}</strong>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <CheckCircle2 size={22} color="#16a34a" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              Asistieron
            </p>
            <strong style={{ fontSize: 28, color: '#15803d' }}>
              {asistentes}
            </strong>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <XCircle size={22} color="#64748b" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              No asistieron
            </p>
            <strong style={{ fontSize: 28 }}>{ausentes}</strong>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <CalendarDays size={22} color="#b45309" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              Por pagar
            </p>
            <strong style={{ fontSize: 28, color: '#b45309' }}>
              {pendientes}
            </strong>
            <p style={{ fontSize: 11, color: '#64748b', margin: '5px 0 0' }}>
              Asistieron y no pagaron
            </p>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <CheckCircle2 size={22} color="#047857" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              Pagados
            </p>
            <strong style={{ fontSize: 28, color: '#047857' }}>
              {pagados}
            </strong>
            <p style={{ fontSize: 11, color: '#64748b', margin: '5px 0 0' }}>
              Asistieron y pagaron
            </p>
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

        {success && (
          <div
            role="status"
            style={{
              padding: 14,
              marginBottom: 18,
              borderRadius: 12,
              background: '#ecfdf5',
              color: '#065f46',
              fontWeight: 700,
            }}
          >
            {success}
          </div>
        )}

        <section
          className="card"
          style={{ padding: 18, overflowX: 'auto' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Lista de peloteros
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
                Fecha seleccionada: {formatDate(fecha)}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={compartirPorWhatsApp}
                disabled={loading || rows.length === 0 || asistentes === 0}
                style={{
                  background: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                }}
              >
                <MessageCircle size={18} />
                Compartir por WhatsApp
              </button>

              <button
                type="button"
                className="btn btn-dark"
                onClick={guardar}
                disabled={loading || saving || rows.length === 0}
              >
                {saving ? (
                  <LoaderCircle size={18} />
                ) : (
                  <Save size={18} />
                )}
                {saving ? 'Guardando...' : 'Guardar asistencia'}
              </button>
            </div>
          </div>

          {loading ? (
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
              Cargando peloteros y asistencias...
            </div>
          ) : rows.length === 0 ? (
            <p style={{ padding: 24, color: '#64748b', textAlign: 'center' }}>
              No hay peloteros activos para registrar.
            </p>
          ) : (
            <table
              style={{
                width: '100%',
                minWidth: 650,
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Asistencia</th>
                  <th style={thStyle}>Pelotero</th>
                  <th style={thStyle}>Estado de asistencia</th>
                  <th style={thStyle}>Estado de pago</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.playerId}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={row.asistio}
                        onChange={(event) =>
                          cambiarAsistencia(
                            row.playerId,
                            event.target.checked
                          )
                        }
                        aria-label={`Marcar asistencia de ${row.fullName}`}
                        style={{
                          width: 19,
                          height: 19,
                          accentColor: '#047857',
                          cursor: 'pointer',
                        }}
                      />
                    </td>

                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      {row.fullName}
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          borderRadius: 999,
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          background: row.asistio ? '#dcfce7' : '#f1f5f9',
                          color: row.asistio ? '#166534' : '#475569',
                        }}
                      >
                        {row.asistio ? 'Asistió' : 'No asistió'}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          borderRadius: 999,
                          padding: '5px 10px',
                          fontSize: 12,
                          fontWeight: 800,
                          background:
                            row.estadoPago === 'PAGADO'
                              ? '#dcfce7'
                              : '#fef3c7',
                          color:
                            row.estadoPago === 'PAGADO'
                              ? '#166534'
                              : '#92400e',
                        }}
                      >
                        {row.estadoPago === 'PAGADO'
                          ? 'Pagado'
                          : 'Por pagar'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && rows.length > 0 && (
            <div
              style={{
                marginTop: 18,
                padding: 13,
                background: '#f8fafc',
                color: '#475569',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <strong>Importante:</strong> los contadores Por pagar y
              Pagados consideran solamente a los peloteros que asistieron
              a la fecha seleccionada. Una cuota cuenta como pagada cuando
              el pago correspondiente está aprobado y asociado a esa fecha.
              Solo el concepto «Pago cuota por partido» cuenta como cuota;
              las donaciones y otros conceptos no deben incluirse.
            </div>
          )}
        </section>
      </div>

      {mostrarPopup && (
        <div
          role="presentation"
          onClick={() => setMostrarPopup(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-deudas"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 18,
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              color: '#12352b',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: '#fef3c7',
                    color: '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={24} />
                </div>

                <div>
                  <h2
                    id="titulo-deudas"
                    style={{ margin: '2px 0 5px', fontSize: 21 }}
                  >
                    Peloteros con cuotas pendientes
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    La asistencia se guardó correctamente. Estos asistentes
                    tienen deudas de pichangas anteriores.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarPopup(false)}
                aria-label="Cerrar popup"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                margin: '20px 0',
              }}
            >
              <div
                style={{
                  background: '#fff7ed',
                  borderRadius: 12,
                  padding: 13,
                }}
              >
                <div style={{ color: '#9a3412', fontSize: 12 }}>
                  Peloteros con deuda
                </div>
                <strong style={{ fontSize: 25, color: '#9a3412' }}>
                  {deudas.length}
                </strong>
              </div>

              <div
                style={{
                  background: '#fff7ed',
                  borderRadius: 12,
                  padding: 13,
                }}
              >
                <div style={{ color: '#9a3412', fontSize: 12 }}>
                  Fechas pendientes
                </div>
                <strong style={{ fontSize: 25, color: '#9a3412' }}>
                  {totalFechasDeuda}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deudas.map((jugador) => (
                <div
                  key={jugador.playerId}
                  style={{
                    border: '1px solid #fed7aa',
                    borderRadius: 12,
                    padding: 15,
                    background: '#fffdfa',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <strong style={{ fontSize: 15 }}>
                      {jugador.fullName}
                    </strong>

                    <span
                      style={{
                        borderRadius: 999,
                        padding: '5px 9px',
                        background: '#fef3c7',
                        color: '#92400e',
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      {jugador.fechas.length}{' '}
                      {jugador.fechas.length === 1
                        ? 'fecha pendiente'
                        : 'fechas pendientes'}
                    </span>
                  </div>

                  <div
                    style={{
                      color: '#64748b',
                      fontSize: 12,
                      fontWeight: 700,
                      marginBottom: 7,
                    }}
                  >
                    Fechas de pichangas anteriores que debe:
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {jugador.fechas.map((fechaDeuda) => (
                      <span
                        key={fechaDeuda}
                        style={{
                          display: 'inline-block',
                          background: '#ffedd5',
                          color: '#9a3412',
                          borderRadius: 8,
                          padding: '7px 10px',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <CalendarDays
                          size={13}
                          style={{
                            display: 'inline',
                            verticalAlign: 'middle',
                            marginRight: 5,
                          }}
                        />
                        {formatDate(fechaDeuda)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-dark"
              onClick={() => setMostrarPopup(false)}
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 20,
                padding: 13,
              }}
            >
              Entendido
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
