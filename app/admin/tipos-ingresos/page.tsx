'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type TipoIngreso = {
  id: string;
  description: string;
  amount: string | number;
};

export default function TiposIngresosPage() {
  const [tipos, setTipos] = useState<TipoIngreso[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  async function cargarTipos() {
    try {
      const response = await fetch('/api/tipos-ingresos', {
        cache: 'no-store',
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los tipos.');
      }

      setTipos(data.tipos);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al consultar los tipos de ingresos.'
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

    const descripcion = description.trim();
    const importe = Number(amount);

    if (!descripcion || !Number.isFinite(importe) || importe <= 0) {
      setError('Ingresa una descripción y un monto mayor que cero.');
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch('/api/tipos-ingresos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: descripcion,
          amount: importe,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo registrar el tipo.');
      }

      setMensaje('Tipo de ingreso registrado correctamente.');
      setDescription('');
      setAmount('');
      await cargarTipos();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al guardar el tipo.'
      );
    } finally {
      setGuardando(false);
    }
  }

  const campo = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    color: '#111827',
    fontSize: 15,
  } as const;

  return (
    <main
      className="container"
      style={{
        maxWidth: 900,
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
            lineHeight: 1.3,
            fontWeight: 700,
            color: '#12372b',
          }}
        >
          Registro de tipos de ingresos
        </h1>

        <p style={{ color: '#4b5563', marginTop: 10, lineHeight: 1.6 }}>
          Administra los conceptos de ingreso y sus montos en soles.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {mensaje && (
        <div
          role="status"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: '#f0fdf4',
            color: '#166534',
          }}
        >
          {mensaje}
        </div>
      )}

      <section
        style={{
          padding: 24,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
          marginBottom: 24,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
          Nuevo tipo de ingreso
        </h2>

        <form onSubmit={registrarTipo}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 18,
            }}
          >
            <div>
              <label
                htmlFor="description"
                style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}
              >
                Descripción *
              </label>

              <input
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ej. Cuota mensual"
                maxLength={100}
                required
                style={campo}
              />
            </div>

            <div>
              <label
                htmlFor="amount"
                style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}
              >
                Monto (S/) *
              </label>

              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ej. 50.00"
                required
                style={campo}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            style={{
              marginTop: 20,
              padding: '12px 20px',
              border: 'none',
              borderRadius: 8,
              background: guardando ? '#9ca3af' : '#166534',
              color: '#fff',
              fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer',
            }}
          >
            {guardando ? 'Guardando...' : 'Registrar tipo de ingreso'}
          </button>
        </form>
      </section>

      <section
        style={{
          padding: 24,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#fff',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>
          Tipos de ingresos registrados
        </h2>

        {cargando ? (
          <p>Cargando tipos de ingresos...</p>
        ) : tipos.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            Todavía no hay tipos de ingresos registrados.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 420,
              }}
            >
              <thead>
                <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                  <th style={{ padding: 12 }}>Descripción</th>
                  <th style={{ padding: 12 }}>Monto</th>
                </tr>
              </thead>

              <tbody>
                {tipos.map((tipo) => (
                  <tr key={tipo.id}>
                    <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                      {tipo.description}
                    </td>

                    <td style={{ padding: 12, borderTop: '1px solid #e5e7eb' }}>
                      {Number(tipo.amount).toLocaleString('es-PE', {
                        style: 'currency',
                        currency: 'PEN',
                      })}
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
