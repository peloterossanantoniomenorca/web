'use client';

import { useState } from 'react';
import {
  Shirt,
  CalendarDays,
  Users,
  CheckCircle2,
  LoaderCircle,
  Shuffle,
  AlertCircle,
} from 'lucide-react';

type Resultado = {
  id: string;
  fechaPichanga: string;
  estado: string;
  pelotero: {
    id: string;
    fullName: string;
    jerseyNumber: number;
  };
};

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

export default function LavarChalecosClient() {
  const [fecha, setFecha] = useState(obtenerFechaActual());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [criterio, setCriterio] = useState('');
  const [totalAsistentes, setTotalAsistentes] = useState(0);
  const [cantidadCandidatos, setCantidadCandidatos] = useState(0);

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
    setResultado(null);

    try {
      const response = await fetch('/api/admin/lavar-chalecos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fechaPichanga: fecha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo realizar el sorteo.');
      }

      setResultado(data.asignacion);
      setCriterio(data.criterio);
      setTotalAsistentes(data.totalAsistentes);
      setCantidadCandidatos(data.cantidadCandidatos);
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

  return (
    <main
      style={{
        maxWidth: 900,
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
            onChange={(e) => {
              setFecha(e.target.value);
              setResultado(null);
              setError('');
            }}
            disabled={loading}
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

        <button
          type="button"
          onClick={asignarPelotero}
          disabled={loading || !fecha}
          style={{
            width: '100%',
            minHeight: 48,
            border: 'none',
            borderRadius: 10,
            background: loading ? '#94a3b8' : '#047857',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
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
          ) : (
            <>
              <Shuffle size={20} />
              Asignar Pelotero
            </>
          )}
        </button>

        <p
          style={{
            color: '#64748b',
            fontSize: 13,
            marginBottom: 0,
            marginTop: 13,
          }}
        >
          El sorteo considerará únicamente a los peloteros que marcaron
          asistencia en la fecha seleccionada.
        </p>
      </section>

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

      {resultado && (
        <section
          style={{
            marginTop: 24,
            padding: 25,
            borderRadius: 16,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              color: '#166534',
              marginBottom: 18,
            }}
          >
            <CheckCircle2 size={25} />
            <h2 style={{ margin: 0, fontSize: 20 }}>
              ¡Pelotero asignado!
            </h2>
          </div>

          <p style={{ color: '#166534', margin: '0 0 18px' }}>
            {formatearFecha(resultado.fechaPichanga)}
          </p>

          <div
            style={{
              background: '#ffffff',
              borderRadius: 13,
              padding: 22,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              border: '1px solid #bbf7d0',
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
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 9,
                  padding: '5px 11px',
                  borderRadius: 20,
                  background: '#fef3c7',
                  color: '#92400e',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                PENDIENTE
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 18,
              marginTop: 20,
              color: '#166534',
              fontSize: 14,
            }}
          >
            <span>
              <Users size={16} style={{ verticalAlign: 'middle' }} />{' '}
              {totalAsistentes} asistentes
            </span>

            <span>
              {cantidadCandidatos} candidatos en el sorteo
            </span>
          </div>

          <p
            style={{
              color: '#166534',
              fontSize: 13,
              marginBottom: 0,
            }}
          >
            Criterio aplicado: {
              criterio === 'SIN_HISTORIAL'
                ? 'Peloteros sin historial'
                : criterio === 'MAYOR_DEUDA'
                  ? 'Mayor cantidad de asignaciones pendientes'
                  : 'Rotación equitativa'
            }
          </p>
        </section>
      )}
    </main>
  );
}
