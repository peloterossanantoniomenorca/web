'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';

type TipoEgreso = {
  idTipEgreso: string;
  descripcion: string;
};

type Pelotero = {
  id: string;
  fullName: string;
};

export default function RegistroEgresosPage() {
  const [tipos, setTipos] = useState<TipoEgreso[]>([]);
  const [peloteros, setPeloteros] = useState<Pelotero[]>([]);
  const [idTipEgreso, setIdTipEgreso] = useState('');
  const [fecha, setFecha] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [monto, setMonto] = useState('');
  const [responsableEgreso, setResponsableEgreso] = useState('');
  const [voucher, setVoucher] = useState<File | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function cargarDatos() {
      try {
        const response = await fetch('/api/egresos', {
          cache: 'no-store',
        });

        const data = await response.json();

        if (response.status === 401) {
          window.location.href = '/admin/login';
          return;
        }

        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los datos.');
        }

        setTipos(data.tipos);
        setPeloteros(data.peloteros);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Error al cargar los datos.'
        );
      } finally {
        setCargando(false);
      }
    }

    cargarDatos();
  }, []);

  async function registrarEgreso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setMensaje('');

    if (!idTipEgreso || !fecha || !monto || !responsableEgreso || !voucher) {
      setError('Completa todos los campos y adjunta el voucher.');
      return;
    }

    const importe = Number(monto);

    if (!Number.isFinite(importe) || importe <= 0) {
      setError('Ingresa un monto válido mayor que cero.');
      return;
    }

    if (voucher.size > 5 * 1024 * 1024) {
      setError('El voucher no puede superar los 5 MB.');
      return;
    }

    const formatosPermitidos = [
      'image/jpeg',
      'image/png',
      'application/pdf',
    ];

    if (!formatosPermitidos.includes(voucher.type)) {
      setError('Solo se permiten archivos JPG, PNG o PDF.');
      return;
    }

    const datos = new FormData();
    datos.append('idTipEgreso', idTipEgreso);
    datos.append('fecha', fecha);
    datos.append('monto', importe.toFixed(2));
    datos.append('responsableEgreso', responsableEgreso);
    datos.append('voucher', voucher);

    setGuardando(true);

    try {
      const response = await fetch('/api/egresos', {
        method: 'POST',
        body: datos,
      });

      const resultado = await response.json();

      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }

      if (!response.ok) {
        throw new Error(
          resultado.error || 'No se pudo registrar el egreso.'
        );
      }

      setMensaje('¡Egreso registrado correctamente!');
      setIdTipEgreso('');
      setFecha(new Date().toLocaleDateString('en-CA'));
      setMonto('');
      setResponsableEgreso('');
      setVoucher(null);

      const inputArchivo = document.getElementById(
        'voucher'
      ) as HTMLInputElement | null;

      if (inputArchivo) inputArchivo.value = '';
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al registrar el egreso.'
      );
    } finally {
      setGuardando(false);
    }
  }

  const estiloCampo = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    background: '#fff',
    color: '#111827',
  } as const;

  if (cargando) {
    return (
      <main className="container" style={{ padding: '48px 0' }}>
        Cargando formulario de egresos...
      </main>
    );
  }

  return (
    <main
      className="container"
      style={{
        padding: '40px 16px',
        maxWidth: '760px',
        margin: '0 auto',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin" style={{ color: '#2563eb' }}>
          ← Volver al panel administrador
        </Link>
      </div>

      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '8px',
            color: '#111827',
          }}
        >
          Registro de egresos
        </h1>

        <p style={{ color: '#6b7280', marginBottom: '28px' }}>
          Registra los gastos del club y adjunta el comprobante de pago.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div
            role="status"
            style={{
              background: '#f0fdf4',
              color: '#166534',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '18px',
            }}
          >
            {mensaje}
          </div>
        )}

        {tipos.length === 0 && (
          <p style={{ color: '#b45309', marginBottom: '16px' }}>
            No hay categorías de egreso registradas. Debes crear al menos una
            categoría en la tabla TipoEgreso de Supabase.
          </p>
        )}

        {peloteros.length === 0 && (
          <p style={{ color: '#b45309', marginBottom: '16px' }}>
            No hay peloteros registrados para seleccionar como responsables.
          </p>
        )}

        <form onSubmit={registrarEgreso}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label
                htmlFor="tipo"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Tipo de egreso *
              </label>

              <select
                id="tipo"
                value={idTipEgreso}
                onChange={(e) => setIdTipEgreso(e.target.value)}
                required
                style={estiloCampo}
              >
                <option value="">Selecciona una categoría</option>
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

            <div>
              <label
                htmlFor="fecha"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Fecha del gasto *
              </label>

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                style={estiloCampo}
              />
            </div>

            <div>
              <label
                htmlFor="monto"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Monto del egreso (S/) *
              </label>

              <input
                id="monto"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="Ej. 150.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                style={estiloCampo}
              />
            </div>

            <div>
              <label
                htmlFor="responsable"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Responsable del egreso *
              </label>

              <select
                id="responsable"
                value={responsableEgreso}
                onChange={(e) => setResponsableEgreso(e.target.value)}
                required
                style={estiloCampo}
              >
                <option value="">Selecciona al responsable</option>
                {peloteros.map((pelotero) => (
                  <option key={pelotero.id} value={pelotero.id}>
                    {pelotero.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="voucher"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Voucher o comprobante *
              </label>

              <input
                id="voucher"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                required
                onChange={(e) =>
                  setVoucher(e.target.files?.[0] ?? null)
                }
                style={{
                  ...estiloCampo,
                  padding: '10px',
                }}
              />

              <p
                style={{
                  color: '#6b7280',
                  fontSize: '13px',
                  marginTop: '8px',
                }}
              >
                Formatos permitidos: JPG, PNG y PDF. Tamaño máximo: 5 MB.
              </p>

              {voucher && (
                <p
                  style={{
                    color: '#374151',
                    fontSize: '13px',
                    marginTop: '6px',
                  }}
                >
                  Archivo: {voucher.name} (
                  {(voucher.size / (1024 * 1024)).toFixed(2)} MB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={
                guardando ||
                tipos.length === 0 ||
                peloteros.length === 0
              }
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '8px',
                background:
                  guardando ||
                  tipos.length === 0 ||
                  peloteros.length === 0
                    ? '#9ca3af'
                    : '#166534',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                cursor:
                  guardando ||
                  tipos.length === 0 ||
                  peloteros.length === 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {guardando ? 'Registrando egreso...' : 'Registrar egreso'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
