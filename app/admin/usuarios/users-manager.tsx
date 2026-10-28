'use client';

import { useCallback, useEffect, useState } from 'react';

type Role = 'PELOTERO' | 'ADMIN' | 'ENCARGADO';
type User = { id: string; email: string; role: Role; createdAt: string };
const roleLabel: Record<Role, string> = { PELOTERO: 'Pelotero', ADMIN: 'Admin', ENCARGADO: 'Encargado' };
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 };
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d1d5db', borderRadius: 8, marginTop: 6 };

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('PELOTERO');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar la lista.');
    setUsers(data.users);
  }, []);

  useEffect(() => { loadUsers().catch((e) => setError(e.message)); }, [loadUsers]);

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el usuario.');
      setMessage(data.message); setEmail(''); setPassword(''); setRole('PELOTERO');
      await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error.'); }
    finally { setBusy(false); }
  }

  async function changeRole(id: string, newRole: Role) {
    setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}/role`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el rol.');
      setMessage(data.message); await loadUsers();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error.'); }
  }

  return <div style={{ display: 'grid', gap: 24 }}>
    <section style={card}>
      <h2 style={{ marginTop: 0, color: '#12352b' }}>Crear usuario</h2>
      <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, alignItems: 'end' }}>
        <label style={{ color: '#374151', fontSize: 14 }}>Correo electrónico<input style={field} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label style={{ color: '#374151', fontSize: 14 }}>Contraseña inicial<input style={field} type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e => setPassword(e.target.value)} /><small>Mínimo 10 caracteres.</small></label>
        <label style={{ color: '#374151', fontSize: 14 }}>Rol<select style={field} value={role} onChange={e => setRole(e.target.value as Role)}><option value="PELOTERO">Pelotero</option><option value="ENCARGADO">Encargado</option><option value="ADMIN">Admin</option></select></label>
        <button disabled={busy} style={{ padding: '12px 16px', background: '#065f46', color: '#fff', border: 0, borderRadius: 8, cursor: busy ? 'wait' : 'pointer', fontWeight: 700 }}>{busy ? 'Guardando…' : 'Crear usuario'}</button>
      </form>
      {message && <p role="status" style={{ color: '#166534', marginBottom: 0 }}>{message}</p>}
      {error && <p role="alert" style={{ color: '#b91c1c', marginBottom: 0 }}>{error}</p>}
    </section>

    <section style={card}>
      <h2 style={{ marginTop: 0, color: '#12352b' }}>Usuarios registrados ({users.length})</h2>
      {users.length === 0 ? <p style={{ color: '#6b7280' }}>No hay usuarios para mostrar.</p> : <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead><tr style={{ textAlign: 'left', background: '#f0fdf4' }}><th style={{ padding: 12 }}>Correo</th><th style={{ padding: 12 }}>Rol actual</th><th style={{ padding: 12 }}>Cambiar rol</th><th style={{ padding: 12 }}>Creado</th></tr></thead>
          <tbody>{users.map(user => <tr key={user.id} style={{ borderTop: '1px solid #e5e7eb' }}>
            <td style={{ padding: 12 }}>{user.email}</td>
            <td style={{ padding: 12 }}>{roleLabel[user.role]}</td>
            <td style={{ padding: 12 }}><select aria-label={`Cambiar rol de ${user.email}`} style={{ ...field, marginTop: 0, minWidth: 140 }} value={user.role} onChange={e => changeRole(user.id, e.target.value as Role)}><option value="PELOTERO">Pelotero</option><option value="ENCARGADO">Encargado</option><option value="ADMIN">Admin</option></select></td>
            <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{new Date(user.createdAt).toLocaleDateString('es-PE')}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
