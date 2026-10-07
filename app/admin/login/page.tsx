'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/admin/session', {
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
        throw new Error(
          data.error || 'No se pudo iniciar sesión.'
        );
      }

      router.push('/admin');
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo conectar con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 450,
          padding: 32,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <LockKeyhole
            size={48}
            style={{ margin: '0 auto 16px' }}
          />

          <h1>Acceso administrador</h1>

          <p style={{ color: '#64748b' }}>
            Ingresa tus credenciales para continuar.
          </p>
        </div>

        <form
          onSubmit={submit}
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
              placeholder="correo@ejemplo.com"
              required
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
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
            />
          </label>

          {error && (
            <div
              style={{
                padding: 14,
                borderRadius: 10,
                background: '#fef2f2',
                color: '#b91c1c',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading
              ? 'Iniciando sesión...'
              : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </main>
  );
}
