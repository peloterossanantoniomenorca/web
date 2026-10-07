import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Users,
  CreditCard,
  Clock3,
  ArrowRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [players, payments, pending, latest] = await Promise.all([
    prisma.player.count({
      where: {
        status: 'ACTIVE',
      },
    }),

    prisma.payment.count(),

    prisma.payment.count({
      where: {
        status: 'PENDING',
      },
    }),

    prisma.payment.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        player: true,
      },
    }),
  ]);

  return (
    <main>
      <section className="hero">
        <div
          className="container"
          style={{
            padding: '78px 0 70px',
            display: 'grid',
            gridTemplateColumns: '1.2fr .8fr',
            gap: 30,
            alignItems: 'center',
          }}
        >
          <div>
            <span
              className="badge"
              style={{
                background: '#ffffff18',
                color: '#fff',
              }}
            >
              COMUNIDAD • DISCIPLINA • FÚTBOL
            </span>

            <h1
              style={{
                fontSize: 'clamp(40px,6vw,68px)',
                lineHeight: 1,
                margin: '18px 0',
              }}
            >
              Peloteros
              <br />
              <span style={{ color: '#ef4444' }}>
                San Antonio FC
              </span>
            </h1>

            <p
              style={{
                fontSize: 19,
                color: '#cbd5e1',
                maxWidth: 620,
              }}
            >
              Una plataforma sencilla para conocer a nuestros
              peloteros y registrar comprobantes de pago desde
              cualquier dispositivo.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginTop: 28,
              }}
            >
              <Link
                className="btn btn-primary"
                href="/peloteros"
              >
                Ver Peloteros
                <ArrowRight size={17} />
              </Link>

              <Link
                className="btn btn-light"
                href="/pagos"
              >
                Registrar Pago
              </Link>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: 28,
              background:
                'linear-gradient(145deg,#ffffff,#e9eef5)',
            }}
          >
            <div
              style={{
                fontSize: 90,
                textAlign: 'center',
              }}
            >
              ⚽
            </div>

            <div
              style={{
                textAlign: 'center',
                fontWeight: 900,
                fontSize: 22,
              }}
            >
              Pasión que nos une
            </div>

            <p
              style={{
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              Todo lo que necesitas para mantener tu pago al día.
            </p>
          </div>
        </div>
      </section>

      <section
        className="container"
        style={{
          padding: '48px 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 16,
          }}
        >
          {[
            [Users, players, 'Peloteros activos'],
            [CreditCard, payments, 'Pagos registrados'],
            [Clock3, pending, 'Pagos pendientes'],
          ].map(([Icon, number, label]: any) => (
            <div
              className="card"
              style={{
                padding: 24,
              }}
              key={label}
            >
              <Icon size={25} />

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  marginTop: 12,
                }}
              >
                {number}
              </div>

              <div
                style={{
                  color: '#64748b',
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 55,
          }}
        >
          <h2>¿Cómo funciona?</h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4,1fr)',
              gap: 16,
              marginTop: 18,
            }}
          >
            {[
              'Selecciona tu nombre',
              'Selecciona la fecha',
              'Adjunta tu voucher',
              'Registra tu pago',
            ].map((item, index) => (
              <div
                className="card"
                style={{
                  padding: 20,
                }}
                key={item}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: '#e3262e',
                  }}
                >
                  0{index + 1}
                </div>

                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 55,
          }}
        >
          <h2>Últimos pagos</h2>

          {latest.length === 0 ? (
            <p
              style={{
                color: '#64748b',
              }}
            >
              No hay pagos registrados todavía.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 10,
                marginTop: 16,
              }}
            >
              {latest.map((payment) => (
                <div
                  className="card"
                  style={{
                    padding: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                  key={payment.id}
                >
                  <span>
                    <strong>
                      {payment.player.fullName}
                    </strong>

                    <br />

                    <small>
                      {payment.paymentDate.toLocaleDateString(
                        'es-PE'
                      )}
                    </small>
                  </span>

                  <span
                    className={`badge badge-${payment.status.toLowerCase()}`}
                  >
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
