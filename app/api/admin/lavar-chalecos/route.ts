import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getSession, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validarFecha(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string') return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const date = new Date(`${fecha}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === fecha
  );
}

export async function POST(req: Request) {
  try {
    // 1. Verificar sesión
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No has iniciado sesión.' },
        { status: 401 }
      );
    }

    // 2. Verificar rol autorizado
    const role = normalizeRole(session.payload.role);

    if (role !== 'ADMIN' && role !== 'ENCARGADO') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción.' },
        { status: 403 }
      );
    }

    // 3. Recibir fecha
    const body = await req.json();
    const fecha = body.fechaPichanga;

    if (!validarFecha(fecha)) {
      return NextResponse.json(
        { error: 'La fecha de la pichanga no es válida.' },
        { status: 400 }
      );
    }

    const fechaPichanga = new Date(`${fecha}T00:00:00.000Z`);

    // 4. Ejecutar el sorteo dentro de una transacción
    const resultado = await prisma.$transaction(
      async (tx) => {
        // Evitar asignaciones duplicadas para la misma fecha
        const asignacionExistente = await tx.lavarChaleco.findFirst({
          where: { fechaPichanga },
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                jerseyNumber: true,
              },
            },
          },
        });

        if (asignacionExistente) {
          throw new Error('ASIGNACION_EXISTENTE');
        }

        // 5. Obtener exclusivamente a los asistentes
        const asistencias = await tx.asistencia.findMany({
          where: {
            fechaPichanga,
            asistio: true,
          },
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                jerseyNumber: true,
              },
            },
          },
        });

        if (asistencias.length === 0) {
          throw new Error('SIN_ASISTENTES');
        }

        // 6. Obtener historial de lavados de los asistentes
        const playerIds = asistencias.map(
          (asistencia) => asistencia.playerId
        );

        const historial = await tx.lavarChaleco.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            estado: true,
          },
        });

        // 7. Calcular estadísticas individuales
        const estadisticas = asistencias.map((asistencia) => {
          const registros = historial.filter(
            (registro) => registro.playerId === asistencia.playerId
          );

          const pendientes = registros.filter(
            (registro) =>
              registro.estado === 'PENDIENTE' ||
              registro.estado === 'REASIGNADO'
          ).length;

          const realizados = registros.filter(
            (registro) => registro.estado === 'REALIZADO'
          ).length;

          return {
            playerId: asistencia.playerId,
            fullName: asistencia.player.fullName,
            jerseyNumber: asistencia.player.jerseyNumber,
            totalRegistros: registros.length,
            pendientes,
            realizados,
          };
        });

        // 8. Aplicar prioridades del sorteo

        // Prioridad 1: peloteros sin historial
        const sinHistorial = estadisticas.filter(
          (jugador) => jugador.totalRegistros === 0
        );

        let candidatos = estadisticas;
        let criterio = '';

        if (sinHistorial.length > 0) {
          candidatos = sinHistorial;
          criterio = 'SIN_HISTORIAL';
        } else {
          // Prioridad 2: mayor cantidad de pendientes/reasignados
          const maxPendientes = Math.max(
            ...estadisticas.map((jugador) => jugador.pendientes)
          );

          if (maxPendientes > 0) {
            candidatos = estadisticas.filter(
              (jugador) => jugador.pendientes === maxPendientes
            );

            criterio = 'MAYOR_DEUDA';
          } else {
            // Prioridad 3: menor cantidad de lavados realizados
            const minRealizados = Math.min(
              ...estadisticas.map((jugador) => jugador.realizados)
            );

            candidatos = estadisticas.filter(
              (jugador) => jugador.realizados === minRealizados
            );

            criterio = 'ROTACION_EQUITATIVA';
          }
        }

        // 9. Sorteo aleatorio entre los candidatos
        const ganador =
          candidatos[randomInt(candidatos.length)];

        // 10. Guardar inmediatamente la asignación
        const asignacion = await tx.lavarChaleco.create({
          data: {
            fechaPichanga,
            playerId: ganador.playerId,
            estado: 'PENDIENTE',
          },
          include: {
            player: {
              select: {
                id: true,
                fullName: true,
                jerseyNumber: true,
              },
            },
          },
        });

        return {
          asignacion,
          criterio,
          cantidadCandidatos: candidatos.length,
          asistentes: estadisticas.length,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({
      success: true,
      mensaje: 'Pelotero asignado correctamente.',
      asignacion: {
        id: resultado.asignacion.id.toString(),
        fechaPichanga: fecha,
        estado: resultado.asignacion.estado,
        pelotero: resultado.asignacion.player,
      },
      criterio: resultado.criterio,
      cantidadCandidatos: resultado.cantidadCandidatos,
      totalAsistentes: resultado.asistentes,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'ASIGNACION_EXISTENTE'
    ) {
      return NextResponse.json(
        {
          error: 'Ya existe una asignación de lavado para esta fecha.',
        },
        { status: 409 }
      );
    }

    if (
      error instanceof Error &&
      error.message === 'SIN_ASISTENTES'
    ) {
      return NextResponse.json(
        {
          error: 'No hay peloteros marcados como asistentes para esta fecha.',
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return NextResponse.json(
        {
          error: 'Se produjo una operación simultánea. Intenta nuevamente.',
        },
        { status: 409 }
      );
    }

    console.error('ERROR SORTEO LAVAR CHALECOS:', error);

    return NextResponse.json(
      { error: 'Ocurrió un error al realizar el sorteo.' },
      { status: 500 }
    );
  }
}
