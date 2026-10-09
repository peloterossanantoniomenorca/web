import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Consultar los tipos de egresos
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const tipos = await prisma.tipoEgreso.findMany({
      select: {
        idTipEgreso: true,
        descripcion: true,
      },
      orderBy: {
        descripcion: 'asc',
      },
    });

    return NextResponse.json({ tipos });
  } catch (error) {
    console.error('ERROR CONSULTANDO TIPOS DE EGRESOS:', error);

    return NextResponse.json(
      { error: 'No se pudieron consultar los tipos de egresos.' },
      { status: 500 }
    );
  }
}

// Registrar un nuevo tipo de egreso
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

    const descripcion =
      typeof body.descripcion === 'string'
        ? body.descripcion.trim()
        : '';

    if (!descripcion) {
      return NextResponse.json(
        { error: 'La descripción es obligatoria.' },
        { status: 400 }
      );
    }

    if (descripcion.length > 100) {
      return NextResponse.json(
        { error: 'La descripción no puede superar los 100 caracteres.' },
        { status: 400 }
      );
    }

    const existente = await prisma.tipoEgreso.findFirst({
      where: {
        descripcion: {
          equals: descripcion,
          mode: 'insensitive',
        },
      },
      select: {
        idTipEgreso: true,
      },
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un tipo de egreso con esa descripción.' },
        { status: 409 }
      );
    }

    const tipo = await prisma.tipoEgreso.create({
      data: {
        descripcion,
      },
      select: {
        idTipEgreso: true,
        descripcion: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Tipo de egreso registrado correctamente.',
        tipo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ERROR REGISTRANDO TIPO DE EGRESO:', error);

    return NextResponse.json(
      { error: 'No se pudo registrar el tipo de egreso.' },
      { status: 500 }
    );
  }
}
