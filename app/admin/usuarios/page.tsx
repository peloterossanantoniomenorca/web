import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession, normalizeRole } from '@/lib/auth';
import UsersManager from './users-manager';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  if (normalizeRole(session.payload.role) !== 'ADMIN') redirect('/admin');

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 30, color: '#12352b', margin: 0 }}>Gestión de usuarios</h1>
          <p style={{ color: '#6b7280', marginTop: 8 }}>Crea cuentas y administra los roles de acceso.</p>
        </div>
        <Link href="/admin" style={{ color: '#166534', textDecoration: 'none' }}>← Volver al panel</Link>
      </div>
      <UsersManager />
    </main>
  );
}
