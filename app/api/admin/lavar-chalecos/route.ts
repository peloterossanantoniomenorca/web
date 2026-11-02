import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getSession, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function validarFecha(fecha: unknown): fecha is string {
  if (typeof fecha !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const date = new Date(`${fecha}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === fecha
  );
}

function fechaDesdeTexto(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

async function verificarPermiso() {
  const session = await getSession();

  if (!session) {
    return {
      autorizado: false,
      status: 401,
      error: 'No has iniciado sesión.',
    };
  }

  const role = normalizeRole(session.payload.role);

  if (role !== 'ADMIN' && role !== 'ENCARGADO') {
    return {
      autorizado: false,
      status: 403,
      error: 'No tienes permisos para acceder a este módulo.',
    };
  }

  return {
    autorizado: true,
    status: 200,
    error: '',
  };
}

function serializarAsignacion(asignacion: any) {
  if (!asignacion) return null;

  return {
    id: asignacion.id.toString(),
    fechaPichanga: asignacion.fechaPichanga.toISOString().slice(0, 10),
    estado: asignacion.estado,
    createdAt: asignacion.createdAt.toISOString(),
    pelotero: asignacion.player,
  };
}

function respuestaError(error: unknown) {
  if (error instanceof Error) {
    const errores: Record<string, { mensaje: string; status: number }> = {
      ASIGNACION_EXISTENTE: {
        mensaje: 'Ya existe una asignación de lavado para esta fecha.',
        status: 409,
      },
      SIN_ASISTENTES: {
        mensaje: 'No hay peloteros marcados como asistentes para esta fecha.',
        status: 400,
      },
      PELOTERO_NO_ASISTIO: {
        mensaje: 'El pelotero seleccionado no figura como asistente en esa fecha.',
        status: 400,
      },
      ASIGNACION_NO_ENCONTRADA: {
        mensaje: 'No se encontró la asignación.',
        status: 404,
      },
      ASIGNACION_NO_PENDIENTE: {
        mensaje: 'Esta asignación ya no está pendiente y no puede reasignarse.',
        status: 409,
      },
      MISMO_PELOTERO: {
        mensaje: 'Selecciona un pelotero diferente al responsable actual.',
        status: 400,
      },
    };

    const detalle = errores[error.message];

    if (detalle) {
      return NextResponse.json(
        { error: detalle.mensaje },
        { status: detalle.status }
      );
    }
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

  console.error('ERROR API LAVAR CHALECOS:', error);

  return NextResponse.json(
    { error: 'Ocurrió un error al procesar la solicitud.' },
    { status: 500 }
  );
}

// =====================================================
// GET: CONSULTAR ASIGNACIÓN, ASISTENTES E HISTORIAL
// =====================================================

export async function GET(req: Request) {
  try {
    const permiso = await verificarPermiso();

    if (!permiso.autorizado) {
      return NextResponse.json(
        { error: permiso.error },
        { status: permiso.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const fecha = searchParams.get('fecha');

    if (!validarFecha(fecha)) {
      return NextResponse.json(
        { error: 'La fecha seleccionada no es válida.' },
        { status: 400 }
      );
    }

    const fechaPichanga = fechaDesdeTexto(fecha);

    const [asistencias, asignaciones, historial] = await Promise.all([
      // Peloteros que asistieron a la fecha seleccionada.
      prisma.asistencia.findMany({
        where: {
          fechaPichanga,
          asistio: true,
        },
        select: {
          playerId: true,
          player: {
            select: {
              id: true,
              fullName: true,
              jerseyNumber: true,
            },
          },
        },
        orderBy: {
          player: {
            fullName: 'asc',
          },
        },
      }),

      // Todos los registros de lavado de la fecha seleccionada.
      prisma.lavarChaleco.findMany({
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
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),

      // Últimos 10 registros de todo el historial.
      prisma.lavarChaleco.findMany({
        take: 10,
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
              jerseyNumber: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      }),
    ]);

    // Mostrar primero la asignación PENDIENTE más reciente.
    // Si no existe, mostrar el registro más reciente de esa fecha.
    const asignacionVigente =
      asignaciones.find((item) => item.estado === 'PENDIENTE') ??
      asignaciones[0] ??
      null;

    return NextResponse.json({
      asignacion: serializarAsignacion(asignacionVigente),

      asistentes: asistencias.map((item) => ({
        id: item.player.id,
        fullName: item.player.fullName,
        jerseyNumber: item.player.jerseyNumber,
      })),

      historial: historial.map((item) => ({
        id: item.id.toString(),
        fechaPichanga: item.fechaPichanga.toISOString().slice(0, 10),
        estado: item.estado,
        createdAt: item.createdAt.toISOString(),
        pelotero: item.player,
      })),
    });
  } catch (error) {
    console.error('ERROR CONSULTANDO LAVAR CHALECOS:', error);

    return NextResponse.json(
      { error: 'No se pudo consultar la información de lavar chalecos.' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: ASIGNACIÓN MANUAL O SORTEO AUTOMÁTICO
// =====================================================

export async function POST(req: Request) {
  try {
    const permiso = await verificarPermiso();

    if (!permiso.autorizado) {
      return NextResponse.json(
        { error: permiso.error },
        { status: permiso.status }
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Los datos enviados no son válidos.' },
        { status: 400 }
      );
    }

    const fecha = body.fechaPichanga;

    if (!validarFecha(fecha)) {
      return NextResponse.json(
        { error: 'La fecha de la pichanga no es válida.' },
        { status: 400 }
      );
    }

    const fechaPichanga = fechaDesdeTexto(fecha);

    // -------------------------------------------------
    // ASIGNACIÓN MANUAL
    // Se identifica porque el cliente envía playerId.
    // -------------------------------------------------

    if (body.playerId !== undefined) {
      if (
        typeof body.playerId !== 'string' ||
        !body.playerId.trim()
      ) {
        return NextResponse.json(
          { error: 'Selecciona un pelotero válido.' },
          { status: 400 }
        );
      }

      const playerId = body.playerId.trim();

      const asignacion = await prisma.$transaction(
        async (tx) => {
          // Evitar más de una asignación inicial para la fecha.
          const asignacionExistente = await tx.lavarChaleco.findFirst({
            where: { fechaPichanga },
          });

          if (asignacionExistente) {
            throw new Error('ASIGNACION_EXISTENTE');
          }

          // Validar que el pelotero haya asistido.
          const asistencia = await tx.asistencia.findFirst({
            where: {
              fechaPichanga,
              playerId,
              asistio: true,
            },
          });

          if (!asistencia) {
            throw new Error('PELOTERO_NO_ASISTIO');
          }

          // Crear asignación manual con estado PENDIENTE.
          return tx.lavarChaleco.create({
            data: {
              fechaPichanga,
              playerId,
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
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );

      return NextResponse.json({
        success: true,
        mensaje: 'Asignación manual realizada correctamente.',
        asignacion: serializarAsignacion(asignacion),
        criterio: 'ASIGNACION_MANUAL',
      });
    }

    // -------------------------------------------------
    // SORTEO AUTOMÁTICO
    // -------------------------------------------------

    const resultado = await prisma.$transaction(
      async (tx) => {
        const asignacionExistente = await tx.lavarChaleco.findFirst({
          where: { fechaPichanga },
        });

        if (asignacionExistente) {
          throw new Error('ASIGNACION_EXISTENTE');
        }

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

        const playerIds = asistencias.map((item) => item.playerId);

        // Consultar el historial de los asistentes.
        const historial = await tx.lavarChaleco.findMany({
          where: {
            playerId: { in: playerIds },
          },
          select: {
            playerId: true,
            estado: true,
          },
        });

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

        // PRIORIDAD 1: Peloteros sin historial.
        const sinHistorial = estadisticas.filter(
          (jugador) => jugador.totalRegistros === 0
        );

        let candidatos = estadisticas;
        let criterio = '';

        if (sinHistorial.length > 0) {
          candidatos = sinHistorial;
          criterio = 'SIN_HISTORIAL';
        } else {
          // PRIORIDAD 1: Mayor cantidad de pendientes o reasignados.
          const maxPendientes = Math.max(
            ...estadisticas.map((jugador) => jugador.pendientes)
          );

          if (maxPendientes > 0) {
            candidatos = estadisticas.filter(
              (jugador) => jugador.pendientes === maxPendientes
            );

            criterio = 'MAYOR_DEUDA';
          } else {
            // PRIORIDAD 2: Menor cantidad de lavados realizados.
            const minRealizados = Math.min(
              ...estadisticas.map((jugador) => jugador.realizados)
            );

            candidatos = estadisticas.filter(
              (jugador) => jugador.realizados === minRealizados
            );

            criterio = 'ROTACION_EQUITATIVA';
          }
        }

        // Sorteo aleatorio entre los candidatos con mayor prioridad.
        const ganador = candidatos[randomInt(candidatos.length)];

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
          totalAsistentes: estadisticas.length,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return NextResponse.json({
      success: true,
      mensaje: 'Pelotero asignado correctamente.',
      asignacion: serializarAsignacion(resultado.asignacion),
      criterio: resultado.criterio,
      cantidadCandidatos: resultado.cantidadCandidatos,
      totalAsistentes: resultado.totalAsistentes,
    });
  } catch (error) {
    return respuestaError(error);
  }
}

// =====================================================
// PATCH: REASIGNAR RESPONSABLE
// =====================================================

export async function PATCH(req: Request) {
  try {
    const permiso = await verificarPermiso();

    if (!permiso.autorizado) {
      return NextResponse.json(
        { error: permiso.error },
        { status: permiso.status }
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Los datos enviados no son válidos.' },
        { status: 400 }
      );
    }

    const asignacionId = body.asignacionId;
    const nuevoPlayerId = body.playerId;

    if (
      typeof asignacionId !== 'string' ||
      !/^\d+$/.test(asignacionId) ||
      typeof nuevoPlayerId !== 'string' ||
      !nuevoPlayerId.trim()
    ) {
      return NextResponse.json(
        { error: 'Los datos de la reasignación no son válidos.' },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const actual = await tx.lavarChaleco.findUnique({
        where: {
          id: BigInt(asignacionId),
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

      if (!actual) {
        throw new Error('ASIGNACION_NO_ENCONTRADA');
      }

      if (actual.estado !== 'PENDIENTE') {
        throw new Error('ASIGNACION_NO_PENDIENTE');
      }

      if (actual.playerId === nuevoPlayerId) {
        throw new Error('MISMO_PELOTERO');
      }

      // El nuevo responsable debe haber asistido a esa fecha.
      const asistencia = await tx.asistencia.findFirst({
        where: {
          playerId: nuevoPlayerId,
          fechaPichanga: actual.fechaPichanga,
          asistio: true,
        },
      });

      if (!asistencia) {
        throw new Error('PELOTERO_NO_ASISTIO');
      }

      // El registro anterior cambia a REASIGNADO.
      const actualizacion = await tx.lavarChaleco.updateMany({
        where: {
          id: actual.id,
          estado: 'PENDIENTE',
        },
        data: {
          estado: 'REASIGNADO',
        },
      });

      if (actualizacion.count !== 1) {
        throw new Error('ASIGNACION_NO_PENDIENTE');
      }

      // Crear un nuevo registro PENDIENTE para el nuevo responsable.
      const nuevaAsignacion = await tx.lavarChaleco.create({
        data: {
          fechaPichanga: actual.fechaPichanga,
          playerId: nuevoPlayerId,
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
        anterior: actual,
        nueva: nuevaAsignacion,
      };
    });

    return NextResponse.json({
      success: true,
      mensaje: 'La asignación fue reasignada correctamente.',
      asignacionAnterior: serializarAsignacion({
        ...resultado.anterior,
        estado: 'REASIGNADO',
      }),
      asignacion: serializarAsignacion(resultado.nueva),
    });
  } catch (error) {
    return respuestaError(error);
  }
}
