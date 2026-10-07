import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

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
        maxWidth: 1000,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          marginBottom: 32,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1>Panel administrador</h1>
          <p style={{ color: '#64748b' }}>
            Gestiona los peloteros y la información del club.
          </p>
        </div>

        <Link
          href="/admin/logout"
          className="btn btn-dark"
        >
          Cerrar sesión
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        <Link
          href="/admin/peloteros"
          className="card"
          style={{
            padding: 28,
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
          }}
        >
          <h2>Registro de peloteros</h2>

          <p style={{ color: '#64748b' }}>
            Registrar nuevos peloteros, consultar los existentes y
            activar o desactivar jugadores.
          </p>

          <div
            style={{
              marginTop: 20,
              fontWeight: 800,
            }}
          >
            Administrar peloteros →
          </div>
        </Link>

        <Link
          href="/reportes"
          className="card"
          style={{
            padding: 28,
            textDecoration: 'none',
            color: 'inherit',
            display: 'block',
          }}
        >
          <h2>Reportes</h2>

          <p style={{ color: '#64748b' }}>
            Consulta los pagos y genera reportes del club.
          </p>

          <div
            style={{
              marginTop: 20,
              fontWeight: 800,
            }}
          >
            Ver reportes →
          </div>
        </Link>
      </div>
    </main>
  );
}
