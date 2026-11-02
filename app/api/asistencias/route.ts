import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPO_CUOTA_PARTIDO = 'Pago cuota por partido';

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
          description: TIPO_CUOTA_PARTIDO,
        },
      },
    },
    select: {
      playerId: true,
    },
  });

  return new Set(pagos.map((pago) => pago.playerId));
}

/**
 * Busca las deudas históricas de los peloteros que asistieron.
 *
 * IMPORTANTE:
 * Solo considera fechas anteriores a la pichanga actual.
 * No incluye la fecha que se está registrando ni fechas futuras.
 *
 * Una asistencia cuenta como deuda si no existe un pago
 * aprobado del concepto "Pago cuota por partido"
 * para esa misma fecha.
 */
async function obtenerDeudas(
  playerIds: string[],
  fechaActual: string
) {
  if (playerIds.length === 0) return [];

  const fechaLimite = new Date(`${fechaActual}T00:00:00.000Z`);

  const asistencias = await prisma.asistencia.findMany({
    where: {
      playerId: { in: playerIds },
      asistio: true,
      fechaPichanga: {
        lt: fechaLimite,
      },
    },
    select: {
      playerId: true,
      fechaPichanga: true,
    },
    orderBy: {
      fechaPichanga: 'asc',
    },
  });

  if (asistencias.length === 0) return [];

  const fechasOrdenadas = [
    ...new Set(
      asistencias.map((item) =>
        item.fechaPichanga.toISOString().slice(0, 10)
      )
    ),
  ].sort();

  const primeraFecha = new Date(
    `${fechasOrdenadas[0]}T00:00:00.000Z`
  );

  const pagosAprobados = await prisma.payment.findMany({
    where: {
      playerId: { in: playerIds },
      status: 'APPROVED',
      pichangaDate: {
        gte: primeraFecha,
        lt: fechaLimite,
      },
      paymentType: {
        is: {
          description: TIPO_CUOTA_PARTIDO,
        },
      },
    },
    select: {
      playerId: true,
      pichangaDate: true,
    },
  });

  const pagosPagados = new Set(
    pagosAprobados.map((pago) =>
      `${pago.playerId}|${pago.pichangaDate.toISOString().slice(0, 10)}`
    )
  );

  const deudasPorJugador = new Map<string, Set<string>>();

  for (const asistencia of asistencias) {
    const fecha = asistencia.fechaPichanga
      .toISOString()
      .slice(0, 10);

    const clave = `${asistencia.playerId}|${fecha}`;

    if (!pagosPagados.has(clave)) {
      if (!deudasPorJugador.has(asistencia.playerId)) {
        deudasPorJugador.set(asistencia.playerId, new Set());
      }

      deudasPorJugador.get(asistencia.playerId)!.add(fecha);
    }
  }

  const jugadores = await prisma.player.findMany({
    where: {
      id: { in: playerIds },
    },
    select: {
      id: true,
      fullName: true,
    },
  });

  const nombres = new Map(
    jugadores.map((jugador) => [jugador.id, jugador.fullName])
  );

  return [...deudasPorJugador.entries()]
    .map(([playerId, fechasPendientes]) => ({
      playerId,
      fullName: nombres.get(playerId) || 'Pelotero',
      fechas: [...fechasPendientes].sort(),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
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

    const resultado = players.map((player) => {
      const asistencia = asistenciaPorJugador.get(player.id);

      return {
        id: asistencia?.id ?? null,
        playerId: player.id,
        fechaPichanga: `${fecha}T00:00:00.000Z`,
        asistio: asistencia?.asistio ?? false,
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
    const playerIdsAsistieron = body.playerIdsAsistieron;

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

    if (
      !Array.isArray(playerIdsAsistieron) ||
      playerIdsAsistieron.some(
        (id) => typeof id !== 'string' || !id.trim()
      )
    ) {
      return NextResponse.json(
        { error: 'La lista de peloteros asistentes no es válida.' },
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
            error: 'Hay datos inválidos en la lista de asistencias.',
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

    if (
      new Set(playerIdsAsistieron).size !==
      playerIdsAsistieron.length
    ) {
      return NextResponse.json(
        { error: 'Hay peloteros asistentes duplicados.' },
        { status: 400 }
      );
    }

    const todosLosIds = [
      ...new Set([...playerIds, ...playerIdsAsistieron]),
    ];

    const fechaPichanga = new Date(`${fecha}T00:00:00.000Z`);

    const [players, asistenciasExistentes, jugadoresPagados] =
      await Promise.all([
        prisma.player.findMany({
          where: {
            id: { in: todosLosIds },
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

    if (players.length !== todosLosIds.length) {
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

    const operaciones = asistencias
      .filter((item: { playerId: string; asistio: boolean }) =>
        jugadoresValidos.has(item.playerId)
      )
      .flatMap((item: { playerId: string; asistio: boolean }) => {
        const existente = asistenciaExistentePorJugador.get(
          item.playerId
        );

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

    // Primero se guardan los cambios de asistencia.
    await prisma.$transaction(operaciones);

    // Después se buscan exclusivamente las deudas anteriores.
    const deudas = await obtenerDeudas(
      playerIdsAsistieron,
      fecha
    );

    return NextResponse.json({
      message: 'Asistencia guardada correctamente.',
      fecha,
      total: playerIdsAsistieron.length,
      registrosProcesados: operaciones.length,
      deudas,
    });
  } catch (error) {
    console.error('ERROR GUARDANDO ASISTENCIAS:', error);

    return NextResponse.json(
      { error: 'No se pudieron guardar las asistencias.' },
      { status: 500 }
    );
  }
}
