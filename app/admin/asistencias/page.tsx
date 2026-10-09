
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
} from 'lucide-react';

type Player = {
  id: string;
  fullName: string;
};

type Attendance = {
  id: string;
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
            estadoPago: existing?.estadoPago ?? 'POR_PAGAR',
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
      current.map((row) => ({ ...row, asistio }))
    );
    setSuccess('');
  }

  function cambiarAsistencia(playerId: string, asistio: boolean) {
    setRows((current) =>
      current.map((row) =>
        row.playerId === playerId ? { ...row, asistio } : row
      )
    );
    setSuccess('');
  }

  async function guardar() {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha,
          asistencias: rows.map((row) => ({
            playerId: row.playerId,
            asistio: row.asistio,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudieron guardar las asistencias.'
        );
      }

      setSuccess(
        `¡Asistencia guardada! ${data.total ?? rows.filter((r) => r.asistio).length} peloteros registrados como asistentes para el ${formatDate(fecha)}.`
      );

      await cargarAsistencias();
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
                onChange={(event) => setFecha(event.target.value)}
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
          </div>

          <div className="card" style={{ padding: 18 }}>
            <CheckCircle2 size={22} color="#047857" />
            <p style={{ color: '#64748b', margin: '10px 0 4px', fontSize: 13 }}>
              Pagados
            </p>
            <strong style={{ fontSize: 28, color: '#047857' }}>
              {pagados}
            </strong>
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
                      {row.asistio ? (
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
                          {row.estadoPago === 'PAGADO' ? 'Pagado' : 'Por pagar'}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
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
              <strong>Importante:</strong> guardar la asistencia registra
              quiénes asistieron y crea el estado inicial «Por pagar» para
              los nuevos registros. El estado de pago se muestra aquí; la
              función para marcarlo como pagado se conectará en el siguiente
              paso.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
