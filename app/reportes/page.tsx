import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ReportsTable from './table';

export const dynamic = 'force-dynamic';

export default async function Reports() {
  const session = await getSession();

  if (!session) {
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
    pending: payments.filter((p) => p.status === 'PENDING').length,
    approved: payments.filter((p) => p.status === 'APPROVED').length,
    rejected: payments.filter((p) => p.status === 'REJECTED').length,
  };

  const tablePayments = payments.map((p) => ({
    id: p.id,
    player: p.player.fullName,
    date: p.paymentDate.toISOString(),
    pichangaDate: p.pichangaDate
      ? p.pichangaDate.toISOString()
      : null,
    paymentType: p.paymentType?.description ?? 'No especificado',
    paymentMethod: payment.paymentMethod ?? 'No especificado',
    amount: p.amount === null ? null : Number(p.amount),
    status: p.status,
    voucher: p.voucherUrl,
    file: p.voucherFileName,
    created: p.createdAt.toISOString(),
  }));

  return (
    <main className="container" style={{ padding: '48px 0' }}>
      <h1>Aprobar pagos</h1>

      <p style={{ color: '#64748b' }}>
        Revisa los comprobantes, los montos y las fechas de pichanga.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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
            <div className="card" style={{ padding: 18 }} key={key}>
              <small>{labels[key]}</small>
              <div style={{ fontSize: 30, fontWeight: 900 }}>
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
