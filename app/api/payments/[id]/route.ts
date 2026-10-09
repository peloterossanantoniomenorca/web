import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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
      });

      if (!payment) {
        throw new Error('PAYMENT_NOT_FOUND');
      }

      // Actualizar únicamente el estado.
      // El voucher y los demás datos se conservan.
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: { status },
      });

      // Solo sincronizar asistencias cuando el pago
      // tenga jugador y fecha de pichanga.
      if (payment.pichangaDate) {
        const paymentDate = payment.pichangaDate
          .toISOString()
          .slice(0, 10);

        const attendanceDate = new Date(
          `${paymentDate}T00:00:00.000Z`
        );

        if (status === 'APPROVED') {
          await tx.asistencia.updateMany({
            where: {
              playerId: payment.playerId,
              fechaPichanga: attendanceDate,
            },
            data: {
              estadoPago: 'PAGADO',
            },
          });
        } else {
          // Comprobar si existe otro pago aprobado
          // del mismo jugador y de la misma pichanga.
          const otherApprovedPayment =
            await tx.payment.findFirst({
              where: {
                id: { not: payment.id },
                playerId: payment.playerId,
                pichangaDate: {
                  gte: attendanceDate,
                  lt: new Date(
                    attendanceDate.getTime() +
                      24 * 60 * 60 * 1000
                  ),
                },
                status: 'APPROVED',
              },
            });

          if (!otherApprovedPayment) {
            await tx.asistencia.updateMany({
              where: {
                playerId: payment.playerId,
                fechaPichanga: attendanceDate,
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
          ? 'Pago aprobado correctamente. El voucher se conserva y se actualiza la asistencia correspondiente.'
          : 'Pago rechazado correctamente. El voucher se conserva y se verifica el estado de la asistencia.',
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
