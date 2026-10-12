import { prisma } from '@/lib/prisma';
import { UserRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Players() {
  const players = await prisma.player.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      jerseyNumber: 'asc',
    },
  });

  return (
    <main
      className="container"
      style={{
        padding: '48px 0 70px',
        color: '#12352b',
      }}
    >
      <div style={{ marginBottom: 26 }}>
        <h1
          style={{
            fontSize: 'clamp(30px, 4vw, 36px)',
            fontWeight: 900,
            letterSpacing: '-0.8px',
            margin: '0 0 8px',
          }}
        >
          Peloteros
        </h1>

        <p
          style={{
            color: '#64748b',
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Conoce a los jugadores activos de San Antonio FC.
        </p>
      </div>

      {players.length === 0 ? (
        <section
          className="card"
          style={{
            padding: 35,
            textAlign: 'center',
          }}
        >
          <UserRound
            size={42}
            color="#059669"
            style={{ margin: '0 auto 12px' }}
          />

          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>
            No hay peloteros activos
          </h2>

          <p style={{ color: '#64748b', margin: 0 }}>
            Cuando se registren jugadores activos, aparecerán aquí.
          </p>
        </section>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(min(100%, 190px), 1fr))',
            gap: 16,
            marginTop: 28,
          }}
        >
          {players.map((p) => (
            <article
              className="card"
              key={p.id}
              style={{
                overflow: 'hidden',
                padding: '20px 17px 18px',
                background: '#ffffff',
                border: '1px solid #dcefe5',
                borderRadius: 16,
                boxShadow: '0 5px 18px rgba(15, 80, 55, 0.055)',
                minWidth: 0,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 76,
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(38px, 4vw, 46px)',
                    lineHeight: 1,
                    fontWeight: 950,
                    letterSpacing: '-2px',
                    color: '#047857',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  #{p.jerseyNumber}
                </div>

                <div
                  aria-hidden="true"
                  style={{
                    width: 57,
                    height: 57,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 15,
                    background:
                      'linear-gradient(145deg, #ecfdf5, #d1fae5)',
                    color: '#6aae91',
                  }}
                >
                  <UserRound size={39} strokeWidth={1.5} />
                </div>
              </div>

              <div
                style={{
                  width: 43,
                  height: 4,
                  borderRadius: 99,
                  background: '#10b981',
                  marginBottom: 13,
                }}
              />

              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 850,
                  lineHeight: 1.3,
                  letterSpacing: '-0.3px',
                  margin: '0 0 6px',
                  overflowWrap: 'anywhere',
                  color: '#12352b',
                }}
              >
                {p.fullName}
              </h2>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#64748b',
                  fontSize: 14,
                  lineHeight: 1.5,
                  minHeight: 22,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#059669',
                    flexShrink: 0,
                  }}
                />
                {p.position}
              </div>

              <div style={{ marginTop: 15 }}>
                <span
                  className="badge badge-approved"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #d1fae5',
                    borderRadius: 999,
                    padding: '5px 10px',
                    fontSize: 11,
                    fontWeight: 850,
                    letterSpacing: '0.3px',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10b981',
                    }}
                  />
                  ACTIVO
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 26,
          padding: '14px 16px',
          borderRadius: 12,
          background: '#f0fdf4',
          border: '1px solid #dcfce7',
          color: '#166534',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        <strong>San Antonio FC</strong>
        {' — '}
        {players.length}{' '}
        {players.length === 1
          ? 'pelotero activo registrado'
          : 'peloteros activos registrados'}
      </div>
    </main>
  );
}
