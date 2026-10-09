import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { getSession } from '@/lib/auth';

const TIPO_CUOTA_PARTIDO = 'Pago cuota por partido';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Identificador de pago no válido.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const status = body?.status;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado no válido.' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { paymentType: true },
      });

      if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status },
      });

      // Donaciones y otros conceptos no modifican asistencias.
      const isMatchFee =
        payment.paymentType?.description ===
        TIPO_CUOTA_PARTIDO;

      if (isMatchFee && payment.pichangaDate) {
        const dateString = payment.pichangaDate
          .toISOString()
          .slice(0, 10);

        const startDate = new Date(
          `${dateString}T00:00:00.000Z`
        );

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
          const anotherApprovedFee =
            await tx.payment.findFirst({
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

      return updatedPayment;
    });

    return NextResponse.json({
      success: true,
      message:
        status === 'APPROVED'
          ? 'Pago aprobado. Se conserva el voucher y solo se actualiza la asistencia si corresponde a una cuota por partido.'
          : 'Pago rechazado. Se conserva el voucher y se verifica la cuota por partido.',
      payment: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'PAYMENT_NOT_FOUND'
    ) {
      return NextResponse.json(
        { error: 'Pago no encontrado.' },
        { status: 404 }
      );
    }

    console.error(
      'Error actualizando el estado del pago:',
      error
    );

    return NextResponse.json(
      { error: 'Error interno al actualizar el pago.' },
      { status: 500 }
    );
  }
}
