
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

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado.' },
        { status: 404 }
      );
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        status === 'APPROVED'
          ? 'Pago aprobado correctamente. El voucher se conserva.'
          : 'Pago rechazado correctamente. El voucher se conserva.',
      payment: updated,
    });
  } catch (error) {
    console.error('Error actualizando el estado del pago:', error);

    return NextResponse.json(
      { error: 'Error interno al actualizar el pago.' },
      { status: 500 }
    );
  }
}
