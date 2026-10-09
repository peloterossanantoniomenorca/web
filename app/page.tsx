import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  Users,
  CreditCard,
  Clock3,
  CheckCircle,
  XCircle,
  ArrowRight,
  FileText,
  Scale,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [players, payments, approved, rejected, pending, latest] =
    await Promise.all([
      prisma.player.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.payment.count(),
      prisma.payment.count({
        where: { status: 'APPROVED' },
      }),
      prisma.payment.count({
        where: { status: 'REJECTED' },
      }),
      prisma.payment.count({
        where: { status: 'PENDING' },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { player: true },
      }),
    ]);

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 17px',
    borderRadius: 12,
    textDecoration: 'none',
    fontWeight: 800,
  } as const;

  return (
    <main>
      <section
        className="hero"
        style={{
          background:
            'linear-gradient(135deg, #03281f 0%, #064e3b 48%, #087f5b 100%)',
        }}
      >
        <div
          className="container"
          style={{
            padding: '78px 0 70px',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
            gap: 30,
            alignItems: 'center',
          }}
        >
          <div>
            <span
              className="badge"
              style={{
                background: '#ffffff18',
                color: '#d1fae5',
                border: '1px solid #ffffff25',
              }}
            >
              COMUNIDAD • DISCIPLINA • FÚTBOL
            </span>

            <h1
              style={{
                fontSize: 'clamp(40px, 6vw, 68px)',
                lineHeight: 1,
                margin: '18px 0',
                color: '#ffffff',
              }}
            >
              Peloteros
              <br />
              <span style={{ color: '#bef264' }}>
                San Antonio FC
              </span>
            </h1>

            <p
              style={{
                fontSize: 19,
                color: '#d1fae5',
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
                href="/peloteros"
                className="btn"
                style={{
                  background: '#a3e635',
                  color: '#163300',
                  border: '1px solid #bef264',
                  fontWeight: 800,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                }}
              >
                Ver Peloteros
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/pagos"
                className="btn"
                style={{
                  background: '#e9f7f2',
                  color: '#075e46',
                  border: '1px solid #c7eadc',
                  fontWeight: 800,
                }}
              >
                Registrar Pago
              </Link>

              <Link
                href="/reporte-cuotas"
                className="btn"
                style={{
                  background: '#ffffff',
                  color: '#075e46',
                  border: '1px solid #bbf7d0',
                  fontWeight: 800,
                }}
              >
                <FileText size={17} />
                Reporte de cuotas
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/balance"
                className="btn"
                style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #93c5fd',
                  fontWeight: 800,
                }}
              >
                <Scale size={17} />
                Balance
                <ArrowRight size={17} />
              </Link>
            </div>

            <p
              style={{
                color: '#d1fae5',
                fontSize: 13,
                marginTop: 13,
              }}
            >
              Consulta pública de cuotas por partido y fechas pendientes.
            </p>
          </div>

          <div
            className="card"
            style={{
              padding: 28,
              background:
                'linear-gradient(145deg, #f0fdf4 0%, #d1fae5 100%)',
              border: '1px solid #bbf7d0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                height: 250,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: 220,
                  height: 220,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, #86efac 0%, #bbf7d055 55%, transparent 70%)',
                }}
              />

              <svg
                width="230"
                height="210"
                viewBox="0 0 230 210"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  position: 'relative',
                  zIndex: 2,
                  filter:
                    'drop-shadow(0 18px 18px rgba(6,78,59,0.20))',
                }}
              >
                <path
                  d="M25 175C55 151 175 151 205 175"
                  stroke="#16A34A"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M45 177C75 161 155 161 185 177"
                  stroke="#86EFAC"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <circle
                  cx="115"
                  cy="95"
                  r="62"
                  fill="#ffffff"
                  stroke="#166534"
                  strokeWidth="5"
                />
                <path
                  d="M115 43L132 55L126 75L104 75L98 55L115 43Z"
                  fill="#166534"
                />
                <path
                  d="M98 55L79 66L84 88L104 75"
                  stroke="#166534"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M132 55L151 66L146 88L126 75"
                  stroke="#166534"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M84 88L67 104L78 124L101 118L104 94"
                  stroke="#166534"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M146 88L163 104L152 124L129 118L126 94"
                  stroke="#166534"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <path
                  d="M101 118L115 143L129 118"
                  stroke="#166534"
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
                <circle
                  cx="115"
                  cy="95"
                  r="69"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeDasharray="5 8"
                  opacity="0.45"
                />
                <path
                  d="M39 55L42 62L49 65L42 68L39 75L36 68L29 65L36 62L39 55Z"
                  fill="#84CC16"
                />
                <path
                  d="M188 76L191 83L198 86L191 89L188 96L185 89L178 86L185 83L188 76Z"
                  fill="#84CC16"
                />
              </svg>
            </div>

            <div
              style={{
                textAlign: 'center',
                fontWeight: 900,
                fontSize: 22,
                color: '#064e3b',
              }}
            >
              Pasión que nos une
            </div>

            <p
              style={{
                textAlign: 'center',
                color: '#3f6f5f',
                marginBottom: 0,
              }}
            >
              Todo lo que necesitas para mantener tu pago al día.
            </p>
          </div>
        </div>
      </section>

      <section
        className="container"
        style={{ padding: '48px 0' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 16,
          }}
        >
          {[
            {
              label: 'Peloteros activos',
              value: players,
              Icon: Users,
              color: '#087f5b',
            },
            {
              label: 'Pagos registrados',
              value: payments,
              Icon: CreditCard,
              color: '#087f5b',
            },
            {
              label: 'Pagos aprobados',
              value: approved,
              Icon: CheckCircle,
              color: '#16a34a',
            },
            {
              label: 'Pagos rechazados',
              value: rejected,
              Icon: XCircle,
              color: '#dc2626',
            },
            {
              label: 'Pagos pendientes',
              value: pending,
              Icon: Clock3,
              color: '#d97706',
            },
          ].map(({ label, value, Icon, color }) => (
            <div
              className="card"
              style={{ padding: 24 }}
              key={label}
            >
              <Icon size={25} style={{ color }} />
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  marginTop: 12,
                  color: '#064e3b',
                }}
              >
                {value}
              </div>
              <div style={{ color: '#64748b' }}>{label}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginTop: 30,
          }}
        >
          <Link
            href="/reporte-cuotas"
            className="card"
            style={{
              ...buttonStyle,
              justifyContent: 'space-between',
              padding: 20,
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #bbf7d0',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <FileText size={24} />
              <span>
                <strong style={{ display: 'block', fontSize: 17 }}>
                  Consultar reporte de cuotas
                </strong>
                <small style={{ fontWeight: 500 }}>
                  Revisa quién está al día y qué fechas tiene pendientes.
                </small>
              </span>
            </span>
            <ArrowRight size={20} />
          </Link>

          <Link
            href="/balance"
            className="card"
            style={{
              ...buttonStyle,
              justifyContent: 'space-between',
              padding: 20,
              background: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Scale size={24} />
              <span>
                <strong style={{ display: 'block', fontSize: 17 }}>
                  Consultar Balance
                </strong>
                <small style={{ fontWeight: 500 }}>
                  Revisa los ingresos, egresos y el saldo acumulado del club.
                </small>
              </span>
            </span>
            <ArrowRight size={20} />
          </Link>
        </div>

        <div style={{ marginTop: 55 }}>
          <h2>¿Cómo funciona?</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                style={{ padding: 20 }}
                key={item}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: '#087f5b',
                  }}
                >
                  0{index + 1}
                </div>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 55 }}>
          <h2>Últimos pagos</h2>
          {latest.length === 0 ? (
            <p style={{ color: '#64748b' }}>
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
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                  key={payment.id}
                >
                  <span>
                    <strong>{payment.player.fullName}</strong>
                    <br />
                    <small>
                      {payment.paymentDate.toLocaleDateString('es-PE')}
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
