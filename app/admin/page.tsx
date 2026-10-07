import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Users, LogOut } from 'lucide-react';

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
        padding: '48px 0',
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <span className="badge">
          PANEL ADMINISTRATIVO
        </span>

        <h1 style={{ marginTop: 12 }}>
          Administración
        </h1>

        <p style={{ color: '#64748b' }}>
          Gestiona los peloteros de Peloteros San Antonio FC.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(250px,1fr))',
          gap: 18,
        }}
      >
        <Link
          href="/admin/peloteros"
          className="card"
          style={{
            padding: 28,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Users size={32} />

          <h2 style={{ marginTop: 14 }}>
            Registro de peloteros
          </h2>

          <p style={{ color: '#64748b' }}>
            Registrar, activar y desactivar peloteros.
          </p>
        </Link>

        <Link
          href="/admin/logout"
          className="card"
          style={{
            padding: 28,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <LogOut size={32} />

          <h2 style={{ marginTop: 14 }}>
            Cerrar sesión
          </h2>

          <p style={{ color: '#64748b' }}>
            Salir del panel administrativo.
          </p>
        </Link>
      </div>
    </main>
  );
}
