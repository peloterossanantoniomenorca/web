'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Shirt,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  Shuffle,
  AlertCircle,
  RefreshCw,
  Clock,
  UserPlus,
} from 'lucide-react';

type Pelotero = {
  id: string;
  fullName: string;
  jerseyNumber: number;
};

type Asignacion = {
  id: string;
  fechaPichanga: string;
  estado: string;
  createdAt: string;
  pelotero: Pelotero;
};

type RegistroHistorial = Asignacion;

function obtenerFechaActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatearFechaCorta(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function colorEstado(estado: string) {
  if (estado === 'REALIZADO') {
    return { background: '#dcfce7', color: '#166534' };
  }

  if (estado === 'REASIGNADO') {
    return { background: '#f1f5f9', color: '#475569' };
  }

  return { background: '#fef3c7', color: '#92400e' };
}

export default function LavarChalecosClient() {
  const [fecha, setFecha] = useState(obtenerFechaActual());
  const [loading, setLoading] = useState(false);
  const [consultando, setConsultando] = useState(true);
  const [reasignando, setReasignando] = useState(false);
  const [guardandoManual, setGuardandoManual] = useState(false);
  const [marcandoRealizado, setMarcandoRealizado] = useState(false);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [resultado, setResultado] = useState<Asignacion | null>(null);
  const [asistentes, setAsistentes] = useState<Pelotero[]>([]);
  const [historial, setHistorial] = useState<RegistroHistorial[]>([]);

  const [criterio, setCriterio] = useState('');
  const [totalAsistentes, setTotalAsistentes] = useState(0);
  const [cantidadCandidatos, setCantidadCandidatos] = useState(0);

  const [nuevoPlayerId, setNuevoPlayerId] = useState('');

  const [mostrarAsignacionManual, setMostrarAsignacionManual] = useState(false);
  const [manualPlayerId, setManualPlayerId] = useState('');

  const cargarDatos = useCallback(async (fechaConsulta: string) => {
    setConsultando(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch(
        `/api/admin/lavar-chalecos?fecha=${encodeURIComponent(fechaConsulta)}`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo consultar la información.');
      }

      setResultado(data.asignacion);
      setAsistentes(data.asistentes || []);
      setHistorial(data.historial || []);
      setNuevoPlayerId('');
      setManualPlayerId('');
      setMostrarAsignacionManual(false);
    } catch (err) {
      setResultado(null);
      setAsistentes([]);
      setHistorial([]);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo consultar la información.'
      );
    } finally {
      setConsultando(false);
    }
  }, []);

  useEffect(() => {
    if (fecha) {
      cargarDatos(fecha);
    }
  }, [fecha, cargarDatos]);

  async function asignarPelotero() {
    if (!fecha) {
      setError('Selecciona la fecha de la pichanga.');
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas realizar el sorteo para la pichanga del ${formatearFecha(fecha)}?`
    );

    if (!confirmar) return;

    setLoading(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch('/api/admin/lavar-chalecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaPichanga: fecha }),
      });

      const data = await response.json();

      if (!response.ok) {
        await cargarDatos(fecha);
        throw new Error(data.error || 'No se pudo realizar el sorteo.');
      }

      setCriterio(data.criterio);
      setTotalAsistentes(data.totalAsistentes);
      setCantidadCandidatos(data.cantidadCandidatos);
      setMensaje('El sorteo se realizó correctamente.');

      await cargarDatos(fecha);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al realizar el sorteo.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function asignarManualmente() {
    if (!fecha) {
      setError('Selecciona la fecha de la pichanga.');
      return;
    }

    if (!manualPlayerId) {
      setError('Selecciona un pelotero de la lista.');
      return;
    }

    const peloteroSeleccionado = asistentes.find(
      (item) => item.id === manualPlayerId
    );

    if (!peloteroSeleccionado) {
      setError('El pelotero seleccionado no está disponible.');
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas asignar manualmente el lavado a ${peloteroSeleccionado.fullName} para el ${formatearFecha(fecha)}?`
    );

    if (!confirmar) return;

    setGuardandoManual(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch('/api/admin/lavar-chalecos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaPichanga: fecha,
          playerId: manualPlayerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        await cargarDatos(fecha);
        throw new Error(data.error || 'No se pudo guardar la asignación manual.');
      }

      setMensaje(
        `Asignación manual guardada correctamente para ${peloteroSeleccionado.fullName}.`
      );

      setMostrarAsignacionManual(false);
      setManualPlayerId('');

      await cargarDatos(fecha);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar la asignación manual.'
      );
    } finally {
      setGuardandoManual(false);
    }
  }

  async function reasignarPelotero() {
    if (!resultado || !nuevoPlayerId) {
      setError('Selecciona al nuevo pelotero responsable.');
      return;
    }

    const nuevoPelotero = asistentes.find(
      (item) => item.id === nuevoPlayerId
    );

    if (!nuevoPelotero) {
      setError('El pelotero seleccionado no está disponible.');
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas reasignar el lavado de ${resultado.pelotero.fullName} a ${nuevoPelotero.fullName}?`
    );

    if (!confirmar) return;

    setReasignando(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch('/api/admin/lavar-chalecos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignacionId: resultado.id,
          playerId: nuevoPlayerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo realizar la reasignación.');
      }

      setMensaje(
        `La responsabilidad fue reasignada a ${nuevoPelotero.fullName}.`
      );

      setNuevoPlayerId('');
      await cargarDatos(fecha);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al reasignar.'
      );
    } finally {
      setReasignando(false);
    }
  }

  // MARCAR EL LAVADO COMO REALIZADO
  async function marcarComoRealizado() {
    if (!resultado || resultado.estado !== 'PENDIENTE') {
      setError('No existe una asignación pendiente para marcar como realizada.');
      return;
    }

    const confirmar = window.confirm(
      `¿Confirmas que ${resultado.pelotero.fullName} ya realizó el lavado de chalecos correspondiente a la pichanga del ${formatearFecha(resultado.fechaPichanga)}?`
    );

    if (!confirmar) return;

    setMarcandoRealizado(true);
    setError('');
    setMensaje('');

    try {
      const response = await fetch('/api/admin/lavar-chalecos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asignacionId: resultado.id,
          accion: 'REALIZADO',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo marcar el lavado como realizado.'
        );
      }

      setMensaje(
        `El lavado de chalecos realizado por ${resultado.pelotero.fullName} quedó registrado correctamente.`
      );

      await cargarDatos(fecha);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al marcar el lavado como realizado.'
      );
    } finally {
      setMarcandoRealizado(false);
    }
  }

  const opcionesReasignacion = asistentes.filter(
    (pelotero) => pelotero.id !== resultado?.pelotero.id
  );

  const bloqueado =
    loading ||
    reasignando ||
    guardandoManual ||
    marcandoRealizado ||
    consultando;

  return (
    <main
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '28px 20px 50px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 15,
            background: '#dcfce7',
            color: '#166534',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shirt size={30} />
        </div>

        <div>
          <h1 style={{ fontSize: 27, fontWeight: 800, margin: 0 }}>
            Lavar Chalecos
          </h1>
          <p style={{ color: '#64748b', margin: '5px 0 0' }}>
            Asignación automática y equitativa de lavado
          </p>
        </div>
      </div>

      {/* SELECCIÓN DE FECHA Y ASIGNACIÓN */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 700, marginTop: 0 }}>
          Seleccionar pichanga
        </h2>

        <label
          htmlFor="fechaPichanga"
          style={{
            display: 'block',
            fontWeight: 600,
            marginBottom: 9,
          }}
        >
          Fecha Peloteo
        </label>

        <div style={{ position: 'relative', marginBottom: 22 }}>
          <CalendarDays
            size={19}
            style={{
              position: 'absolute',
              left: 13,
              top: 13,
              color: '#64748b',
            }}
          />

          <input
            id="fechaPichanga"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={bloqueado}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 12px 12px 42px',
              border: '1px solid #cbd5e1',
              borderRadius: 9,
              fontSize: 16,
              background: '#fff',
              color: '#0f172a',
            }}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={asignarPelotero}
            disabled={
              bloqueado ||
              !fecha ||
              Boolean(resultado) ||
              asistentes.length === 0
            }
            style={{
              width: '100%',
              minHeight: 48,
              border: 'none',
              borderRadius: 10,
              background:
                bloqueado || resultado || asistentes.length === 0
                  ? '#94a3b8'
                  : '#047857',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              cursor:
                bloqueado || resultado || asistentes.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {loading ? (
              <>
                <LoaderCircle size={20} />
                Realizando sorteo...
              </>
            ) : consultando ? (
              <>
                <LoaderCircle size={20} />
                Consultando fecha...
              </>
            ) : resultado ? (
              <>
                <CheckCircle2 size={20} />
                Ya existe una asignación
              </>
            ) : (
              <>
                <Shuffle size={20} />
                Asignar Pelotero
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMostrarAsignacionManual((actual) => !actual);
              setManualPlayerId('');
              setError('');
              setMensaje('');
            }}
            disabled={
              bloqueado ||
              Boolean(resultado) ||
              asistentes.length === 0
            }
            style={{
              width: '100%',
              minHeight: 48,
              border: '1px solid #047857',
              borderRadius: 10,
              background:
                consultando || resultado || asistentes.length === 0
                  ? '#e2e8f0'
                  : '#ffffff',
              color:
                consultando || resultado || asistentes.length === 0
                  ? '#94a3b8'
                  : '#047857',
              fontSize: 16,
              fontWeight: 700,
              cursor:
                bloqueado || resultado || asistentes.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <UserPlus size={20} />
            {mostrarAsignacionManual
              ? 'Cancelar asignación'
              : 'Asignar manualmente'}
          </button>
        </div>

        {/* FORMULARIO DE ASIGNACIÓN MANUAL */}
        {mostrarAsignacionManual && !resultado && (
          <div
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 12,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#166534', fontSize: 17 }}>
              Asignación manual
            </h3>

            <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 13 }}>
              Selecciona al pelotero que se hará responsable del lavado. La lista
              incluye únicamente a quienes registraron asistencia el{' '}
              {formatearFecha(fecha)}.
            </p>

            {asistentes.length > 0 ? (
              <>
                <label
                  htmlFor="peloteroManual"
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Pelotero responsable
                </label>

                <select
                  id="peloteroManual"
                  value={manualPlayerId}
                  onChange={(e) => setManualPlayerId(e.target.value)}
                  disabled={guardandoManual}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: 12,
                    border: '1px solid #cbd5e1',
                    borderRadius: 9,
                    background: '#fff',
                    fontSize: 15,
                    marginBottom: 14,
                  }}
                >
                  <option value="">Seleccionar pelotero...</option>
                  {asistentes.map((pelotero) => (
                    <option key={pelotero.id} value={pelotero.id}>
                      {pelotero.fullName} - Camiseta {pelotero.jerseyNumber}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={asignarManualmente}
                  disabled={guardandoManual || !manualPlayerId}
                  style={{
                    width: '100%',
                    minHeight: 46,
                    border: 'none',
                    borderRadius: 9,
                    background:
                      guardandoManual || !manualPlayerId ? '#94a3b8' : '#047857',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor:
                      guardandoManual || !manualPlayerId
                        ? 'not-allowed'
                        : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                  }}
                >
                  {guardandoManual ? (
                    <>
                      <LoaderCircle size={19} />
                      Guardando asignación...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={19} />
                      Guardar asignación manual
                    </>
                  )}
                </button>
              </>
            ) : (
              <p style={{ color: '#b91c1c', margin: 0, fontSize: 14 }}>
                No hay peloteros que hayan marcado asistencia en esta fecha.
              </p>
            )}
          </div>
        )}

        <p
          style={{
            color: '#64748b',
            fontSize: 13,
            marginBottom: 0,
            marginTop: 13,
          }}
        >
          El sorteo y la asignación manual consideran únicamente a los
          peloteros que marcaron asistencia en la fecha seleccionada.
        </p>
      </section>

      {/* MENSAJES */}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 10,
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <AlertCircle size={21} />
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 10,
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <CheckCircle2 size={21} />
          {mensaje}
        </div>
      )}

      {/* CARGANDO */}
      {consultando && (
        <div
          style={{
            marginTop: 22,
            padding: 22,
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <LoaderCircle
            size={22}
            style={{ verticalAlign: 'middle', marginRight: 8 }}
          />
          Consultando asignación e historial...
        </div>
      )}

      {/* TARJETA DE ASIGNACIÓN EXISTENTE */}
      {!consultando && resultado && (
        <section
          style={{
            marginTop: 24,
            padding: 24,
            borderRadius: 16,
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                color: '#166534',
              }}
            >
              <CheckCircle2 size={24} />
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Detalle de asignación
              </h2>
            </div>

            <span
              style={{
                ...colorEstado(resultado.estado),
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {resultado.estado}
            </span>
          </div>

          <p style={{ color: '#64748b', margin: '0 0 18px' }}>
            Pichanga del {formatearFecha(resultado.fechaPichanga)}
          </p>

          <div
            style={{
              background: '#f0fdf4',
              borderRadius: 13,
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              border: '1px solid #dcfce7',
            }}
          >
            <div
              style={{
                width: 65,
                height: 65,
                minWidth: 65,
                borderRadius: 14,
                background: '#047857',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              {resultado.pelotero.jerseyNumber}
            </div>

            <div>
              <p
                style={{
                  color: '#64748b',
                  fontSize: 13,
                  margin: '0 0 5px',
                }}
              >
                RESPONSABLE DEL LAVADO
              </p>
              <h3
                style={{
                  color: '#14532d',
                  fontSize: 21,
                  margin: 0,
                  fontWeight: 800,
                }}
              >
                {resultado.pelotero.fullName}
              </h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '6px 0 0' }}>
                Camiseta N.º {resultado.pelotero.jerseyNumber}
              </p>
            </div>
          </div>

          {/* ACCIONES PARA ASIGNACIÓN PENDIENTE */}
          {resultado.estado === 'PENDIENTE' && (
            <>
              {/* MARCAR COMO REALIZADO */}
              <div
                style={{
                  marginTop: 22,
                  padding: 18,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                }}
              >
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: 17,
                    color: '#166534',
                  }}
                >
                  Confirmar lavado de chalecos
                </h3>

                <p
                  style={{
                    color: '#64748b',
                    fontSize: 13,
                    margin: '0 0 14px',
                  }}
                >
                  Cuando el responsable haya terminado de lavar los chalecos,
                  puedes registrar aquí que la tarea fue completada.
                </p>

                <button
                  type="button"
                  onClick={marcarComoRealizado}
                  disabled={marcandoRealizado || reasignando || consultando}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    border: 'none',
                    borderRadius: 9,
                    background: marcandoRealizado ? '#94a3b8' : '#15803d',
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: marcandoRealizado ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                  }}
                >
                  {marcandoRealizado ? (
                    <>
                      <LoaderCircle size={20} />
                      Registrando lavado...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Marcar como realizado
                    </>
                  )}
                </button>
              </div>

              {/* REASIGNACIÓN */}
              <div
                style={{
                  marginTop: 22,
                  padding: 18,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>
                  Reasignar responsable
                </h3>

                <p
                  style={{
                    color: '#64748b',
                    fontSize: 13,
                    margin: '0 0 14px',
                  }}
                >
                  Selecciona otro pelotero que haya asistido a esta pichanga.
                  La asignación actual quedará registrada como REASIGNADO.
                </p>

                {opcionesReasignacion.length > 0 ? (
                  <>
                    <label
                      htmlFor="nuevoPelotero"
                      style={{
                        display: 'block',
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      Nuevo pelotero responsable
                    </label>

                    <select
                      id="nuevoPelotero"
                      value={nuevoPlayerId}
                      onChange={(e) => setNuevoPlayerId(e.target.value)}
                      disabled={reasignando || marcandoRealizado}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: 12,
                        border: '1px solid #cbd5e1',
                        borderRadius: 9,
                        background: '#fff',
                        fontSize: 15,
                        marginBottom: 14,
                      }}
                    >
                      <option value="">Seleccionar pelotero...</option>
                      {opcionesReasignacion.map((pelotero) => (
                        <option key={pelotero.id} value={pelotero.id}>
                          {pelotero.fullName} - Camiseta {pelotero.jerseyNumber}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={reasignarPelotero}
                      disabled={reasignando || marcandoRealizado || !nuevoPlayerId}
                      style={{
                        width: '100%',
                        minHeight: 46,
                        border: 'none',
                        borderRadius: 9,
                        background:
                          reasignando || marcandoRealizado || !nuevoPlayerId
                            ? '#94a3b8'
                            : '#b45309',
                        color: '#fff',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor:
                          reasignando || marcandoRealizado || !nuevoPlayerId
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 9,
                      }}
                    >
                      {reasignando ? (
                        <>
                          <LoaderCircle size={19} />
                          Reasignando...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={19} />
                          Reasignar
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <p style={{ color: '#b45309', margin: 0, fontSize: 14 }}>
                    No hay otro pelotero asistente disponible para reasignar.
                  </p>
                )}
              </div>
            </>
          )}

          {resultado.estado === 'REALIZADO' && (
            <div
              style={{
                marginTop: 22,
                padding: 16,
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle2 size={22} />
              <p style={{ margin: 0, fontSize: 14 }}>
                Este lavado ya fue marcado como realizado y no se puede
                reasignar desde esta pantalla.
              </p>
            </div>
          )}

          {resultado.estado === 'REASIGNADO' && (
            <p style={{ color: '#64748b', marginBottom: 0, fontSize: 14 }}>
              Este registro fue reasignado. No es la asignación pendiente
              vigente.
            </p>
          )}
        </section>
      )}

      {/* ÚLTIMOS 10 REGISTROS */}
      <section
        style={{
          marginTop: 30,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 22,
          boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 18,
          }}
        >
          <Clock size={22} color="#166534" />
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>
              Últimos 10 registros
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
              Historial de asignaciones de lavado de chalecos
            </p>
          </div>
        </div>

        {historial.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
            Todavía no existen registros de lavado de chalecos.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 600,
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <th style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    Fecha pichanga
                  </th>
                  <th style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    Pelotero
                  </th>
                  <th style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    N.º
                  </th>
                  <th style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {historial.map((registro) => (
                  <tr key={registro.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {formatearFechaCorta(registro.fechaPichanga)}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: '1px solid #f1f5f9',
                        fontWeight: 600,
                      }}
                    >
                      {registro.pelotero.fullName}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {registro.pelotero.jerseyNumber}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      <span
                        style={{
                          ...colorEstado(registro.estado),
                          display: 'inline-block',
                          padding: '5px 10px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {registro.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
