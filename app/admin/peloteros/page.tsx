import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PlayerManager from './manager';

export const dynamic = 'force-dynamic';

export default async function AdminPlayers() {
  const session = await getSession();

  if (!session) {
    redirect('/admin');
  }

  const players = await prisma.player.findMany({
    orderBy: {
      jerseyNumber: 'asc',
    },
  });

  return (
    <main
      className="container"
      style={{
        padding: '48px 0',
      }}
    >
      <div style={{ marginBottom: 30 }}>
        <span className="badge">
          ADMINISTRACIÓN
        </span>

        <h1 style={{ marginTop: 12 }}>
          Registro de peloteros
        </h1>

        <p style={{ color: '#64748b' }}>
          Agrega y administra los jugadores de
          Peloteros San Antonio FC.
        </p>
      </div>

      <PlayerManager initialPlayers={players} />
    </main>
  );
}
