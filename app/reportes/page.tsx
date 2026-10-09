```tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReportsTable from './table';

export const dynamic = 'force-dynamic';

export default async function Reports() {
  if (!(await getSession())) {
    redirect('/admin/login');
  }

  const payments = await prisma.payment.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      player: true,
      paymentType: true,
    },
  });

  const stats = {
    total: payments.length,
    pending: payments.filter(
      (payment) => payment.status === 'PENDING'
    ).length,
    approved: payments.filter(
      (payment) => payment.status === 'APPROVED'
    ).length,
    rejected: payments.filter(
      (payment) => payment.status === 'REJECTED'
    ).length,
  };

  const tablePayments = payments.map((payment) => ({
    id: payment.id,
    player: payment.player.fullName,
    date: payment.paymentDate.toISOString(),
    pichangaDate:
      payment.pichangaDate?.toISOString() ?? null,
    paymentType:
      payment.paymentType?.description ?? 'No especificado',
    amount:
      payment.amount === null
        ? null
        : Number(payment.amount),
    status: payment.status,
    voucher: payment.voucherUrl,
    file: payment.voucherFileName,
    created: payment.createdAt.toISOString(),
  }));

  return (
    <main
      className="container"
      style={{ padding: '48px 0' }}
    >
      <h1>Aprobar pagos</h1>

      <p style={{ color: '#64748b' }}>
        Revisa los comprobantes, consulta el monto y la fecha
        de pichanga, y aprueba o rechaza los pagos registrados.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
          margin: '24px 0',
        }}
      >
        {Object.entries(stats).map(([key, value]) => {
          const labels: Record<string, string> = {
            total: 'TOTAL DE PAGOS',
            pending: 'PENDIENTES',
            approved: 'APROBADOS',
            rejected: 'RECHAZADOS',
          };

          return (
            <div
              className="card"
              style={{ padding: 18 }}
              key={key}
            >
              <small>{labels[key]}</small>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {value}
              </div>
            </div>
          );
        })}
      </div>

      <ReportsTable payments={tablePayments} />
    </main>
  );
}
```
