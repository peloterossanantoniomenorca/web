'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  FileText,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';

type SessionState = {
  authenticated: boolean;
};

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/session')
      .then((response) => response.json())
      .then((data) => {
        setSession(data);
      })
      .catch(() => {
        setSession({ authenticated: false });
      });
  }, []);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');

    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo iniciar sesión.');
      }

      window.location.href = '/admin';
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
    });

    window.location.href = '/admin';
  }

  if (session === null) {
    return (
      <main
        style={{
          minHeight: '70vh',
          display: 'grid',
          placeItems: 'center',
          padding: 40,
        }}
      >
        <div className="card" style={{ padding: 30 }}>
          Verificando acceso...
        </div>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main
        style={{
          minHeight: '75vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div
          className="card"
          style={{
            width: '100%',
            maxWidth: 460,
            padding: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              display: 'grid',
              placeItems: 'center',
              background: '#111827',
              color: '#fff',
              marginBottom: 20,
            }}
          >
            <ShieldCheck size={32} />
          </div>

          <h1 style={{ marginBottom: 8 }}>
            Administración
          </h1>

          <p style={{ color: '#64748b', marginBottom: 25 }}>
            Peloteros San Antonio FC
          </p>

          <form
            onSubmit={login}
            style={{
              display: 'grid',
              gap: 18,
            }}
          >
            <label>
              Correo electrónico

              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@ejemplo.com"
                autoComplete="email"
              />
            </label>

            <label>
              Contraseña

              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            {error && (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: '#fee2e2',
                  color: '#991b1b',
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{
                justifyContent: 'center',
              }}
            >
              <LogIn size={18} />

              {loading
                ? 'Ingresando...'
                : 'Ingresar como administrador'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main
      className="container"
      style={{
        padding: '48px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span className="badge">
            PANEL ADMINISTRATIVO
          </span>

          <h1 style={{ marginTop: 12 }}>
            Administración
          </h1>

          <p style={{ color: '#64748b' }}>
            Gestiona Peloteros San Antonio FC.
          </p>
        </div>

        <button
          className="btn btn-dark"
          onClick={logout}
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(240px,1fr))',
          gap: 18,
          marginTop: 35,
        }}
      >
        <Link
          href="/admin/peloteros"
          className="card"
          style={{
            padding: 25,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <UserPlus size={30} />

          <h2 style={{ marginTop: 15 }}>
            Registrar pelotero
          </h2>

          <p style={{ color: '#64748b' }}>
            Agrega nuevos jugadores al equipo.
          </p>
        </Link>

        <Link
          href="/peloteros"
          className="card"
          style={{
            padding: 25,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Users size={30} />

          <h2 style={{ marginTop: 15 }}>
            Ver peloteros
          </h2>

          <p style={{ color: '#64748b' }}>
            Consulta los jugadores registrados.
          </p>
        </Link>

        <Link
          href="/reportes"
          className="card"
          style={{
            padding: 25,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <FileText size={30} />

          <h2 style={{ marginTop: 15 }}>
            Reportes
          </h2>

          <p style={{ color: '#64748b' }}>
            Consulta estadísticas y pagos.
          </p>
        </Link>
      </div>
    </main>
  );
}
