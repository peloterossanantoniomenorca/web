import { redirect } from 'next/navigation';
import { getSession, normalizeRole } from '@/lib/auth';
import LavarChalecosClient from './LavarChalecosClient';

export const dynamic = 'force-dynamic';

export default async function LavarChalecosPage() {
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  const role = normalizeRole(session.payload.role);

  if (role !== 'ADMIN' && role !== 'ENCARGADO') {
    redirect('/');
  }

  return <LavarChalecosClient />;
}
