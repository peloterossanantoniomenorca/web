'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

type TipoEgreso = {
  idTipEgreso: string;
  descripcion: string;
};

export default function TiposEgresosPage() {
  const [tipos, setTipos] = useState<TipoEgreso[]>([]);
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarTipos() {
    try {
      const response = await fetch('/api/tipos-egresos', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudieron cargar los tipos de egresos.'
        );
      }

      setTipos(data.tipos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al cargar las categorías.'
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarTipos();
  }, []);

  async function registrarTipo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMensaje('');

    const nombre = descripcion.trim();

    if (!nombre) {
      setError('Escribe la descripción del tipo de egreso.');
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch('/api/tipos-egresos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descripcion: nombre,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || 'No se pudo registrar el tipo de egreso.'
        );
      }

      setDescripcion('');
      setMensaje('Tipo de egreso registrado correctamente.');

      await cargarTipos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al registrar la categoría.'
      );
    } finally {
      setGuardando(false);
    }
  }

  const estiloCampo = {
    display: 'block',
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#ffffff',
    color: '#12372b',
    boxSizing: 'border-box' as const,
  };

  return (
    <main
      className="container"
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '40px 16px 60px',
        color: '#12372b',
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin"
          style={{
            color: '#166534',
            textDecoration: 'none',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          ← Volver al panel administrador
        </Link>
      </div>

      {/* Encabezado con fondo transparente y texto legible */}
      <div
        style={{
          display: 'block',
          width: '100%',
          margin: '24px 0 28px',
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          boxShadow: 'none',
        }}
      >
        <h1
          style={{
            display: 'block',
            margin: 0,
            padding: 0,
            color: '#12372b',
            background: 'transparent',
            fontSize: 32,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          Registro de tipos de egresos
        </h1>

        <p
          style={{
            display: 'block',
            margin: '10px 0 0',
            padding: 0,
            color: '#4b5563',
            background: 'transparent',
            fontSize: 17,
            lineHeight: 1.6,
          }}
        >
          Administra las categorías de gastos del club.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 14,
            marginBottom: 20,
            borderRadius: 8,
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          style={{
            padding: 14,
            marginBottom: 20,
            borderRadius: 8,
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
          }}
        >
          {mensaje}
        </div>
      )}

      {/* Formulario de registro */}
      <section
        style={{
          padding: 28,
          marginBottom: 28,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <h2
          style={{
            margin: '0 0 22px',
            fontSize: 23,
            fontWeight: 700,
            color: '#12372b',
            background: 'transparent',
          }}
        >
          Nuevo tipo de egreso
        </h2>

        <form onSubmit={registrarTipo}>
          <div style={{ marginBottom: 20 }}>
            <label
              htmlFor="descripcion"
              style={{
                display: 'block',
                marginBottom: 8,
                fontWeight: 600,
                color: '#12372b',
              }}
            >
              Descripción de la categoría *
            </label>

            <input
              id="descripcion"
              name="descripcion"
              type="text"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Ej. Alquiler de cancha"
              maxLength={100}
              required
              style={estiloCampo}
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '13px 22px',
              border: 'none',
              borderRadius: 8,
              backgroundColor: guardando ? '#9ca3af' : '#166534',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 16,
              cursor: guardando ? 'not-allowed' : 'pointer',
            }}
          >
            {guardando ? 'Registrando...' : 'Registrar tipo de egreso'}
          </button>
        </form>
      </section>

      {/* Tabla de categorías registradas */}
      <section
        style={{
          padding: 28,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <h2
          style={{
            margin: '0 0 20px',
            fontSize: 23,
            fontWeight: 700,
            color: '#12372b',
            background: 'transparent',
          }}
        >
          Tipos de egresos registrados
        </h2>

        {cargando ? (
          <p style={{ color: '#4b5563' }}>
            Cargando categorías...
          </p>
        ) : tipos.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            Todavía no hay tipos de egresos registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                backgroundColor: '#ffffff',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f0fdf4' }}>
                  <th
                    style={{
                      padding: 14,
                      borderBottom: '1px solid #e5e7eb',
                      color: '#12372b',
                    }}
                  >
                    N.º
                  </th>
                  <th
                    style={{
                      padding: 14,
                      borderBottom: '1px solid #e5e7eb',
                      color: '#12372b',
                    }}
                  >
                    Descripción
                  </th>
                </tr>
              </thead>

              <tbody>
                {tipos.map((tipo, index) => (
                  <tr key={tipo.idTipEgreso}>
                    <td
                      style={{
                        padding: 14,
                        borderBottom: '1px solid #e5e7eb',
                        color: '#4b5563',
                      }}
                    >
                      {index + 1}
                    </td>

                    <td
                      style={{
                        padding: 14,
                        borderBottom: '1px solid #e5e7eb',
                        color: '#12372b',
                        fontWeight: 500,
                      }}
                    >
                      {tipo.descripcion}
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
