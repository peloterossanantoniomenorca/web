'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/admin/session', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            'Correo o contraseña incorrectos.'
        );
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError(
        'No se pudo conectar con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="container"
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 0',
      }}
    >
      <form
        className="card"
        onSubmit={login}
        style={{
          width: '100%',
          maxWidth: 430,
          padding: 30,
          display: 'grid',
          gap: 18,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <LockKeyhole size={42} />

          <h1 style={{ marginTop: 12 }}>
            Acceso administrador
          </h1>

          <p style={{ color: '#64748b' }}>
            Ingresa tus credenciales para continuar.
          </p>
        </div>

        <label>
          Correo electrónico

          <input
            className="input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="admin@ejemplo.com"
          />
        </label>

        <label>
          Contraseña

          <input
            className="input"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="••••••••"
          />
        </label>

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Ingresando...'
            : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
