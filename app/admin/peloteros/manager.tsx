'use client';

import { useState } from 'react';
import {
  UserPlus,
  Power,
  CheckCircle2,
} from 'lucide-react';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jerseyNumber: number;
  position: string;
  status: 'ACTIVE' | 'INACTIVE';
  photoUrl?: string | null;
};

type Props = {
  initial: Player[];
};

export default function PlayerManager({
  initial,
}: Props) {
  const [players, setPlayers] =
    useState<Player[]>(initial);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    position: '',
  });

  const [loading, setLoading] = useState(false);

  const [createdPlayer, setCreatedPlayer] =
    useState<Player | null>(null);

  async function add(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setCreatedPlayer(null);
    setLoading(true);

    try {
      const response = await fetch(
        '/api/admin/players',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            'No se pudo registrar el pelotero.'
        );
        return;
      }

      const player = data.player || data;

      setPlayers((current) => [
        player,
        ...current,
      ]);

      setCreatedPlayer(player);

      setForm({
        firstName: '',
        lastName: '',
        jerseyNumber: '',
        position: '',
      });
    } catch {
      alert(
        'No se pudo conectar con el servidor.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggle(player: Player) {
    try {
      const response = await fetch(
        `/api/admin/players/${player.id}`,
        {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            status:
              player.status === 'ACTIVE'
                ? 'INACTIVE'
                : 'ACTIVE',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            'No se pudo cambiar el estado.'
        );
        return;
      }

      setPlayers((current) =>
        current.map((item) =>
          item.id === player.id
            ? data
            : item
        )
      );
    } catch {
      alert(
        'No se pudo conectar con el servidor.'
      );
    }
  }

  return (
    <>
      {createdPlayer && (
        <div
          className="card"
          style={{
            padding: 20,
            marginTop: 24,
            border: '1px solid #86efac',
            background: '#f0fdf4',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle2 size={24} />

            <strong>
              ¡Pelotero registrado correctamente!
            </strong>
          </div>

          <div
            style={{
              marginTop: 12,
              display: 'grid',
              gap: 5,
            }}
          >
            <div>
              <strong>Pelotero:</strong>{' '}
              {createdPlayer.fullName}
            </div>

            <div>
              <strong>Número:</strong>{' '}
              {createdPlayer.jerseyNumber}
            </div>

            <div>
              <strong>Posición:</strong>{' '}
              {createdPlayer.position}
            </div>

            <div>
              <strong>ID del pelotero:</strong>{' '}
              <code>{createdPlayer.id}</code>
            </div>
          </div>
        </div>
      )}

      <form
        className="card"
        onSubmit={add}
        style={{
          padding: 24,
          display: 'grid',
          gap: 15,
          marginTop: 24,
        }}
      >
        <h2
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <UserPlus size={22} />
          Nuevo pelotero
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(200px,1fr))',
            gap: 12,
          }}
        >
          <input
            className="input"
            required
            placeholder="Nombre"
            value={form.firstName}
            onChange={(event) =>
              setForm({
                ...form,
                firstName: event.target.value,
              })
            }
          />

          <input
            className="input"
            required
            placeholder="Apellido"
            value={form.lastName}
            onChange={(event) =>
              setForm({
                ...form,
                lastName: event.target.value,
              })
            }
          />

          <input
            className="input"
            required
            type="number"
            min="0"
            max="99"
            placeholder="Número"
            value={form.jerseyNumber}
            onChange={(event) =>
              setForm({
                ...form,
                jerseyNumber: event.target.value,
              })
            }
          />

          <select
            className="input"
            required
            value={form.position}
            onChange={(event) =>
              setForm({
                ...form,
                position: event.target.value,
              })
            }
          >
            <option value="">
              Selecciona posición
            </option>

            <option value="Portero">
              Portero
            </option>

            <option value="Defensa">
              Defensa
            </option>

            <option value="Mediocampista">
              Mediocampista
            </option>

            <option value="Delantero">
              Delantero
            </option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
        >
          <UserPlus size={18} />

          {loading
            ? 'Registrando...'
            : 'Crear pelotero'}
        </button>
      </form>

      <section style={{ marginTop: 30 }}>
        <h2>Peloteros registrados</h2>

        <div
          style={{
            display: 'grid',
            gap: 10,
            marginTop: 16,
          }}
        >
          {players.length === 0 ? (
            <div
              className="card"
              style={{ padding: 20 }}
            >
              No hay peloteros registrados.
            </div>
          ) : (
            players.map((player) => (
              <div
                className="card"
                style={{
                  padding: 18,
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 15,
                  flexWrap: 'wrap',
                }}
                key={player.id}
              >
                <div>
                  <strong>
                    #{player.jerseyNumber}{' '}
                    {player.fullName}
                  </strong>

                  <br />

                  <small
                    style={{
                      color: '#64748b',
                    }}
                  >
                    {player.position} ·{' '}
                    {player.status}
                  </small>

                  <br />

                  <small
                    style={{
                      color: '#94a3b8',
                    }}
                  >
                    ID: {player.id}
                  </small>
                </div>

                <button
                  className="btn btn-light"
                  type="button"
                  onClick={() =>
                    toggle(player)
                  }
                >
                  <Power size={17} />

                  {player.status === 'ACTIVE'
                    ? 'Desactivar'
                    : 'Activar'}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
