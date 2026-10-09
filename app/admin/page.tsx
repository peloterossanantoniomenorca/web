import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <main
      className="container"
      style={{
        padding: '48px 16px',
        maxWidth: 1000,
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
          <h1 style={{ fontSize: 30, fontWeight: 700 }}>
            Panel administrador
          </h1>

          <p style={{ color: '#6b7280', marginTop: 8 }}>
            Administración de Peloteros San Antonio FC
          </p>
        </div>

        <form action="/api/auth/logout" method="POST">
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
        <Link
          href="/admin/peloteros"
          style={{
            display: 'block',
            padding: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111827',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Registro de peloteros
          </h2>

          <p style={{ marginTop: 8, color: '#6b7280' }}>
            Gestiona los jugadores del club.
          </p>
        </Link>

        <Link
          href="/reportes"
          style={{
            display: 'block',
            padding: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111827',
            background: '#fff',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Reportes
          </h2>

          <p style={{ marginTop: 8, color: '#6b7280' }}>
            Consulta la información y los reportes del club.
          </p>
        </Link>

        <Link
          href="/admin/egresos"
          style={{
            display: 'block',
            padding: 24,
            border: '1px solid #bbf7d0',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#166534',
            background: '#f0fdf4',
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>
            Registro de egresos
          </h2>

          <p style={{ marginTop: 8, color: '#166534' }}>
            Registra gastos, responsables y comprobantes.
          </p>
        </Link>
      </div>
    </main>
  );
}
