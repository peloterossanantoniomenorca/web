import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    if (!isValidDate(fecha)) {
      return NextResponse.json(
        { error: 'Selecciona una fecha válida de pichanga.' },
        { status: 400 }
      );
    }

    const fechaPichanga = new Date(`${fecha}T00:00:00.000Z`);

    const [players, asistencias] = await Promise.all([
      prisma.player.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          fullName: true,
        },
        orderBy: { fullName: 'asc' },
      }),

      prisma.asistencia.findMany({
        where: { fechaPichanga },
        select: {
          id: true,
          playerId: true,
          fechaPichanga: true,
          asistio: true,
          estadoPago: true,
        },
      }),
    ]);

    return NextResponse.json({
      fecha,
      players,
      asistencias,
    });
  } catch (error) {
    console.error('ERROR CONSULTANDO ASISTENCIAS:', error);

    return NextResponse.json(
      { error: 'No se pudieron consultar las asistencias.' },
      { status: 500 }
    );
  }
}

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
    const fecha = body.fecha;
    const asistencias = body.asistencias;

    if (!isValidDate(fecha)) {
      return NextResponse.json(
        { error: 'Selecciona una fecha válida de pichanga.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(asistencias)) {
      return NextResponse.json(
        { error: 'La lista de asistencias no es válida.' },
        { status: 400 }
      );
    }

    const playerIds: string[] = [];

    for (const item of asistencias) {
      if (
        !item ||
        typeof item.playerId !== 'string' ||
        !item.playerId.trim() ||
        typeof item.asistio !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Hay datos inválidos en la lista de asistencias.' },
          { status: 400 }
        );
      }

      playerIds.push(item.playerId);
    }

    if (new Set(playerIds).size !== playerIds.length) {
      return NextResponse.json(
        { error: 'Hay peloteros duplicados en la lista.' },
        { status: 400 }
      );
    }

    const fechaPichanga = new Date(`${fecha}T00:00:00.000Z`);

    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        {
          error:
            'Uno o más peloteros no existen o no están activos. Recarga la lista.',
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      asistencias.map(
        (item: { playerId: string; asistio: boolean }) =>
          prisma.asistencia.upsert({
            where: {
              playerId_fechaPichanga: {
                playerId: item.playerId,
                fechaPichanga,
              },
            },
            create: {
              playerId: item.playerId,
              fechaPichanga,
              asistio: item.asistio,
              estadoPago: 'POR_PAGAR',
            },
            update: {
              asistio: item.asistio,
              updatedAt: new Date(),
            },
          })
      )
    );

    return NextResponse.json({
      message: 'Asistencia guardada correctamente.',
      fecha,
      total: asistencias.filter(
        (item: { asistio: boolean }) => item.asistio
      ).length,
    });
  } catch (error) {
    console.error('ERROR GUARDANDO ASISTENCIAS:', error);

    return NextResponse.json(
      { error: 'No se pudieron guardar las asistencias.' },
      { status: 500 }
    );
  }
}
