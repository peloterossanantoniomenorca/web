import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO_CUOTA_PARTIDO = 'Pago cuota por partido';

export async function PATCH(req: Request) {
  try {
    const session = await getSession();

    if (!session || normalizeRole(session.payload.role) !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const status = body?.status;
    const ids = body?.ids;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado no válido.' },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== 'string' || !id.trim())
    ) {
      return NextResponse.json(
        { error: 'Selecciona entre 1 y 100 pagos válidos.' },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(ids)];

    const result = await prisma.$transaction(async (tx) => {
      const pendingPayments = await tx.payment.findMany({
        where: {
          id: { in: uniqueIds },
          status: 'PENDING',
        },
        include: {
          paymentType: true,
        },
      });

      let processed = 0;

      for (const payment of pendingPayments) {
        const updated = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: 'PENDING',
          },
          data: { status },
        });

        if (updated.count === 0) continue;

        processed++;

        const isMatchFee =
          payment.paymentType?.description === TIPO_CUOTA_PARTIDO;

        if (!isMatchFee || !payment.pichangaDate) continue;

        const dateString = payment.pichangaDate
          .toISOString()
          .slice(0, 10);

        const startDate = new Date(`${dateString}T00:00:00.000Z`);
        const endDate = new Date(
          startDate.getTime() + 24 * 60 * 60 * 1000
        );

        if (status === 'APPROVED') {
          await tx.asistencia.updateMany({
            where: {
              playerId: payment.playerId,
              fechaPichanga: startDate,
            },
            data: {
              estadoPago: 'PAGADO',
            },
          });
        } else {
          const anotherApprovedFee = await tx.payment.findFirst({
            where: {
              id: { not: payment.id },
              playerId: payment.playerId,
              paymentType: {
                description: TIPO_CUOTA_PARTIDO,
              },
              pichangaDate: {
                gte: startDate,
                lt: endDate,
              },
              status: 'APPROVED',
            },
          });

          if (!anotherApprovedFee) {
            await tx.asistencia.updateMany({
              where: {
                playerId: payment.playerId,
                fechaPichanga: startDate,
              },
              data: {
                estadoPago: 'POR_PAGAR',
              },
            });
          }
        }
      }

      return {
        processed,
        skipped: uniqueIds.length - processed,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
      message:
        status === 'APPROVED'
          ? `Se aprobaron ${result.processed} pagos.`
          : `Se rechazaron ${result.processed} pagos.`,
    });
  } catch (error) {
    console.error('ERROR EN PROCESAMIENTO MASIVO DE PAGOS:', error);

    return NextResponse.json(
      { error: 'No se pudieron procesar los pagos seleccionados.' },
      { status: 500 }
    );
  }
}
