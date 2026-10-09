import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function obtenerRango(fechaInicio: string, fechaFin: string) {
  return {
    gte: new Date(`${fechaInicio}T00:00:00.000Z`),
    lt: new Date(`${fechaFin}T00:00:00.000Z`),
  };
}

function fechaUTC(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatoFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const anioTexto = searchParams.get('anio');
    const mesTexto = searchParams.get('mes');
    const diaTexto = searchParams.get('dia');

    if (!anioTexto || !/^\d{4}$/.test(anioTexto)) {
      return NextResponse.json(
        { error: 'Selecciona un año válido.' },
        { status: 400 }
      );
    }

    const anio = Number(anioTexto);
    const mes = mesTexto ? Number(mesTexto) : null;
    const dia = diaTexto ? Number(diaTexto) : null;

    if (
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100
    ) {
      return NextResponse.json(
        { error: 'El año seleccionado no es válido.' },
        { status: 400 }
      );
    }

    if (
      mes !== null &&
      (!Number.isInteger(mes) || mes < 1 || mes > 12)
    ) {
      return NextResponse.json(
        { error: 'Selecciona un mes válido.' },
        { status: 400 }
      );
    }

    if (dia !== null && mes === null) {
      return NextResponse.json(
        { error: 'Selecciona un mes antes de elegir un día.' },
        { status: 400 }
      );
    }

    if (dia !== null) {
      const diasDelMes = new Date(Date.UTC(anio, mes!, 0)).getUTCDate();

      if (
        !Number.isInteger(dia) ||
        dia < 1 ||
        dia > diasDelMes
      ) {
        return NextResponse.json(
          { error: 'El día seleccionado no es válido.' },
          { status: 400 }
        );
      }
    }

    const inicio = dia !== null
      ? `${anioTexto}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      : mes !== null
        ? `${anioTexto}-${String(mes).padStart(2, '0')}-01`
        : `${anioTexto}-01-01`;

    let fin: string;

    if (dia !== null) {
      const siguienteDia = new Date(`${inicio}T00:00:00.000Z`);
      siguienteDia.setUTCDate(siguienteDia.getUTCDate() + 1);
      fin = fechaUTC(siguienteDia);
    } else if (mes !== null) {
      const siguienteMes = new Date(Date.UTC(anio, mes, 1));
      fin = fechaUTC(siguienteMes);
    } else {
      fin = `${anio + 1}-01-01`;
    }

    const rangoAsistencia = obtenerRango(inicio, fin);

    // No se filtra por estado del pelotero: incluye activos e inactivos.
    // Solo se incluyen asistencias realmente registradas como asistencia.
    const asistencias = await prisma.asistencia.findMany({
      where: {
        asistio: true,
        fechaPichanga: rangoAsistencia,
      },
      select: {
        playerId: true,
        fechaPichanga: true,
        player: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: [
        { player: { fullName: 'asc' } },
        { fechaPichanga: 'asc' },
      ],
    });

    if (asistencias.length === 0) {
      return NextResponse.json({
        filtros: { anio, mes, dia },
        reporte: [],
        totalPeloteros: 0,
        totalAlDia: 0,
        totalDebe: 0,
      });
    }

    const playerIds = [
      ...new Set(asistencias.map((asistencia) => asistencia.playerId)),
    ];

    const pagos = await prisma.payment.findMany({
      where: {
        playerId: { in: playerIds },
        status: 'APPROVED',
        pichangaDate: rangoAsistencia,
        paymentType: {
          is: {
            description: 'Pago cuota por partido',
          },
        },
      },
      select: {
        playerId: true,
        pichangaDate: true,
      },
    });

    // La clave combina jugador y día de pichanga.
    const pagosPorJugadorYFecha = new Set(
      pagos
        .filter((pago) => pago.pichangaDate !== null)
        .map(
          (pago) =>
            `${pago.playerId}|${fechaUTC(pago.pichangaDate!)}`
        )
    );

    const reportePorJugador = new Map<
      string,
      {
        playerId: string;
        nombre: string;
        fechasAsistidas: string[];
        fechasPendientes: string[];
      }
    >();

    for (const asistencia of asistencias) {
      const fecha = fechaUTC(asistencia.fechaPichanga);

      let jugador = reportePorJugador.get(asistencia.playerId);

      if (!jugador) {
        jugador = {
          playerId: asistencia.playerId,
          nombre: asistencia.player.fullName,
          fechasAsistidas: [],
          fechasPendientes: [],
        };

        reportePorJugador.set(asistencia.playerId, jugador);
      }

      // Evita duplicar una misma fecha en el reporte.
      if (!jugador.fechasAsistidas.includes(fecha)) {
        jugador.fechasAsistidas.push(fecha);
      }

      const clavePago = `${asistencia.playerId}|${fecha}`;

      if (
        !pagosPorJugadorYFecha.has(clavePago) &&
        !jugador.fechasPendientes.includes(fecha)
      ) {
        jugador.fechasPendientes.push(fecha);
      }
    }

    const reporte = Array.from(reportePorJugador.values())
      .map((jugador) => ({
        ...jugador,
        fechasAsistidas: jugador.fechasAsistidas
          .sort()
          .map((fecha) => ({
            fecha,
            fechaFormato: formatoFecha(fecha),
          })),
        fechasPendientes: jugador.fechasPendientes
          .sort()
          .map((fecha) => ({
            fecha,
            fechaFormato: formatoFecha(fecha),
          })),
        estadoCuenta:
          jugador.fechasPendientes.length === 0
            ? 'AL_DIA'
            : 'DEBE',
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return NextResponse.json({
      filtros: { anio, mes, dia },
      reporte,
      totalPeloteros: reporte.length,
      totalAlDia: reporte.filter(
        (jugador) => jugador.estadoCuenta === 'AL_DIA'
      ).length,
      totalDebe: reporte.filter(
        (jugador) => jugador.estadoCuenta === 'DEBE'
      ).length,
    });
  } catch (error) {
    console.error('ERROR EN REPORTE PÚBLICO DE CUOTAS:', error);

    return NextResponse.json(
      { error: 'No se pudo generar el reporte de cuotas.' },
      { status: 500 }
    );
  }
}
