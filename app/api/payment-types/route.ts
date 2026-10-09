import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paymentTypes = await prisma.paymentType.findMany({
      orderBy: {
        description: 'asc',
      },
      select: {
        id: true,
        description: true,
        amount: true,
      },
    });

    return NextResponse.json(
      paymentTypes.map((type) => ({
        id: type.id,
        description: type.description,
        amount: type.amount.toString(),
      }))
    );
  } catch (error) {
    console.error('Error consultando tipos de pago:', error);

    return NextResponse.json(
      { error: 'No se pudieron cargar los tipos de pago.' },
      { status: 500 }
    );
  }
}
