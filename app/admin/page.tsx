import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const estiloTarjeta = {
    display: 'block',
    padding: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    textDecoration: 'none',
    color: '#111827',
    background: '#fff',
    transition: 'box-shadow 0.2s ease',
  } as const;

  return (
    <main
      className="container"
      style={{
        padding: '48px 16px',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: '#12352b',
              margin: 0,
            }}
          >
            Panel administrador
          </h1>

          <p style={{ color: '#6b7280', marginTop: 8 }}>
            Administración de Peloteros San Antonio FC
          </p>
        </div>

        <form action="/admin/logout" method="POST">
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 20,
        }}
      >
        {/* Registro de peloteros: azul */}
        <Link
          href="/admin/peloteros"
          style={{
            ...estiloTarjeta,
            borderColor: '#bfdbfe',
            color: '#1d4ed8',
            background: '#eff6ff',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Registro de peloteros
          </h2>

          <p style={{ marginTop: 8, color: '#1d4ed8' }}>
            Gestiona los jugadores del club.
          </p>
        </Link>

        {/* Registro de asistencias */}
        <Link
          href="/admin/asistencias"
          style={{
            ...estiloTarjeta,
            borderColor: '#86efac',
            color: '#166534',
            background: '#f0fdf4',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Registro de asistencias
          </h2>

          <p style={{ marginTop: 8, color: '#166534' }}>
            Registra quiénes asistieron a cada pichanga y controla sus cuotas
            pendientes o pagadas.
          </p>
        </Link>

        {/* Aprobar pagos: naranja */}
        <Link
          href="/reportes"
          style={{
            ...estiloTarjeta,
            borderColor: '#fed7aa',
            color: '#9a3412',
            background: '#fff7ed',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Aprobar pagos
          </h2>

          <p style={{ marginTop: 8, color: '#9a3412' }}>
            Consulta y gestiona la revisión de los pagos registrados.
          </p>
        </Link>

        {/* Registro de egresos */}
        <Link
          href="/admin/egresos"
          style={{
            ...estiloTarjeta,
            borderColor: '#bbf7d0',
            color: '#166534',
            background: '#f0fdf4',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Registro de egresos
          </h2>

          <p style={{ marginTop: 8, color: '#166534' }}>
            Registra gastos, responsables y comprobantes.
          </p>
        </Link>

        {/* Reporte de egresos */}
        <Link
          href="/admin/reporte-egresos"
          style={{
            ...estiloTarjeta,
            borderColor: '#bfdbfe',
            color: '#1d4ed8',
            background: '#eff6ff',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Reporte de egresos
          </h2>

          <p style={{ marginTop: 8, color: '#1d4ed8' }}>
            Consulta los gastos por año, mes y tipo de egreso.
          </p>
        </Link>

        {/* Registro de tipos de ingresos */}
        <Link
          href="/admin/tipos-ingresos"
          style={{
            ...estiloTarjeta,
            borderColor: '#bbf7d0',
            color: '#166534',
            background: '#f0fdf4',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Registro de tipos de ingresos
          </h2>

          <p style={{ marginTop: 8, color: '#166534' }}>
            Administra los conceptos de ingreso y sus montos.
          </p>
        </Link>

        {/* Registro de tipos de egresos */}
        <Link
          href="/admin/tipos-egresos"
          style={{
            ...estiloTarjeta,
            borderColor: '#fed7aa',
            color: '#9a3412',
            background: '#fff7ed',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Registro de tipos de egresos
          </h2>

          <p style={{ marginTop: 8, color: '#9a3412' }}>
            Administra las categorías de gastos del club.
          </p>
        </Link>
      </div>
    </main>
  );
}
