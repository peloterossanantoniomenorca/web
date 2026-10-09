import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Consultar los tipos de ingresos registrados
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const tipos = await prisma.paymentType.findMany({
      select: {
        id: true,
        description: true,
        amount: true,
      },
      orderBy: {
        description: 'asc',
      },
    });

    return NextResponse.json({ tipos });
  } catch (error) {
    console.error('ERROR CONSULTANDO TIPOS DE INGRESOS:', error);

    return NextResponse.json(
      { error: 'No se pudieron consultar los tipos de ingresos.' },
      { status: 500 }
    );
  }
}

// Registrar un nuevo tipo de ingreso
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const description =
      typeof body.description === 'string'
        ? body.description.trim()
        : '';

    if (!description) {
      return NextResponse.json(
        { error: 'La descripción es obligatoria.' },
        { status: 400 }
      );
    }

    if (description.length > 100) {
      return NextResponse.json(
        { error: 'La descripción no puede superar los 100 caracteres.' },
        { status: 400 }
      );
    }

    // Si el monto está vacío, se registra como cero.
    const montoVacio =
      body.amount === null ||
      body.amount === undefined ||
      (typeof body.amount === 'string' &&
        body.amount.trim() === '');

    const amount = montoVacio ? 0 : Number(body.amount);

    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(String(amount))
    ) {
      return NextResponse.json(
        {
          error: 'Ingresa un monto válido, con máximo dos decimales.',
        },
        { status: 400 }
      );
    }

    const existente = await prisma.paymentType.findFirst({
      where: {
        description: {
          equals: description,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existente) {
      return NextResponse.json(
        {
          error: 'Ya existe un tipo de ingreso con esa descripción.',
        },
        { status: 409 }
      );
    }

    const tipo = await prisma.paymentType.create({
      data: {
        description,
        amount,
      },
      select: {
        id: true,
        description: true,
        amount: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Tipo de ingreso registrado correctamente.',
        tipo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ERROR REGISTRANDO TIPO DE INGRESO:', error);

    return NextResponse.json(
      { error: 'No se pudo registrar el tipo de ingreso.' },
      { status: 500 }
    );
  }
}
