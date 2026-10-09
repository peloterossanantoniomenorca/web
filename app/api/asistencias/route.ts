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

function getDateRange(fecha: string) {
  const inicio = new Date(`${fecha}T00:00:00.000Z`);
  const fin = new Date(inicio);
  fin.setUTCDate(fin.getUTCDate() + 1);

  return { inicio, fin };
}

/**
 * Devuelve los jugadores que tienen una cuota por partido
 * aprobada para la fecha indicada.
 *
 * Las donaciones y los demás conceptos se ignoran.
 * La fecha se compara por día, sin exigir una hora exacta.
 */
async function obtenerJugadoresPagados(fecha: string) {
  const { inicio, fin } = getDateRange(fecha);

  const pagos = await prisma.payment.findMany({
    where: {
      status: 'APPROVED',
      pichangaDate: {
        gte: inicio,
        lt: fin,
      },
      paymentType: {
        is: {
          description: 'Pago cuota por partido',
        },
      },
    },
    select: {
      playerId: true,
    },
  });

  return new Set(pagos.map((pago) => pago.playerId));
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

    const [players, asistencias, jugadoresPagados] =
      await Promise.all([
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

        obtenerJugadoresPagados(fecha),
      ]);

    const asistenciaPorJugador = new Map(
      asistencias.map((asistencia) => [
        asistencia.playerId,
        asistencia,
      ])
    );

    // Se muestran todos los jugadores activos, pero esto NO significa
    // que todos deban tener un registro de asistencia en la base de datos.
    const resultado = players.map((player) => {
      const asistencia = asistenciaPorJugador.get(player.id);

      return {
        id: asistencia?.id ?? null,
        playerId: player.id,
        fechaPichanga: `${fecha}T00:00:00.000Z`,
        asistio: asistencia?.asistio ?? false,

        // El estado de pago depende del pago aprobado correspondiente.
        estadoPago: jugadoresPagados.has(player.id)
          ? 'PAGADO'
          : 'POR_PAGAR',
      };
    });

    return NextResponse.json({
      fecha,
      players,
      asistencias: resultado,
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
          {
            error:
              'Hay datos inválidos en la lista de asistencias.',
          },
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

    // Solo validamos los jugadores que el cliente envía.
    // No se crean registros automáticamente para los ausentes.
    const [players, asistenciasExistentes, jugadoresPagados] =
      await Promise.all([
        prisma.player.findMany({
          where: {
            id: { in: playerIds },
            status: 'ACTIVE',
          },
          select: { id: true },
        }),

        prisma.asistencia.findMany({
          where: {
            fechaPichanga,
            playerId: { in: playerIds },
          },
          select: {
            id: true,
            playerId: true,
            asistio: true,
          },
        }),

        obtenerJugadoresPagados(fecha),
      ]);

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        {
          error:
            'Uno o más peloteros no existen o no están activos. Recarga la lista.',
        },
        { status: 400 }
      );
    }

    const jugadoresValidos = new Set(players.map((p) => p.id));

    const asistenciaExistentePorJugador = new Map(
      asistenciasExistentes.map((asistencia) => [
        asistencia.playerId,
        asistencia,
      ])
    );

    // Reglas:
    // 1. Marcado y sin registro: crear.
    // 2. Marcado y con registro: actualizar.
    // 3. Desmarcado y con registro previo: actualizar asistio=false.
    // 4. Desmarcado y sin registro previo: no guardar nada.
    const operaciones = asistencias
      .filter((item: { playerId: string; asistio: boolean }) =>
        jugadoresValidos.has(item.playerId)
      )
      .flatMap((item: { playerId: string; asistio: boolean }) => {
        const existente = asistenciaExistentePorJugador.get(
          item.playerId
        );

        // Si nunca existió un registro y sigue desmarcado,
        // no se crea una fila innecesaria.
        if (!existente && !item.asistio) {
          return [];
        }

        const estadoPago = jugadoresPagados.has(item.playerId)
          ? 'PAGADO'
          : 'POR_PAGAR';

        if (existente) {
          return [
            prisma.asistencia.update({
              where: { id: existente.id },
              data: {
                asistio: item.asistio,
                estadoPago,
                updatedAt: new Date(),
              },
            }),
          ];
        }

        return [
          prisma.asistencia.create({
            data: {
              playerId: item.playerId,
              fechaPichanga,
              asistio: true,
              estadoPago,
            },
          }),
        ];
      });

    await prisma.$transaction(operaciones);

    const total = asistencias.filter(
      (item: { playerId: string; asistio: boolean }) =>
        item.asistio
    ).length;

    return NextResponse.json({
      message: 'Asistencia guardada correctamente.',
      fecha,
      total,
      registrosProcesados: operaciones.length,
    });
  } catch (error) {
    console.error('ERROR GUARDANDO ASISTENCIAS:', error);

    return NextResponse.json(
      { error: 'No se pudieron guardar las asistencias.' },
      { status: 500 }
    );
  }
}
