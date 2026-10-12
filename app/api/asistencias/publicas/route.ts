import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getMonthRange(anio: number, mes: number) {
  const inicio = new Date(
    Date.UTC(anio, mes - 1, 1)
  );
  const fin = new Date(
    Date.UTC(anio, mes, 1)
  );

  return { inicio, fin };
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const anio = Number(searchParams.get('anio'));
    const mes = Number(searchParams.get('mes'));
    const fecha = searchParams.get('fecha');

    if (
      !Number.isInteger(anio) ||
      anio < 2000 ||
      anio > 2100 ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      return NextResponse.json(
        { error: 'Selecciona un año y mes válidos.' },
        { status: 400 }
      );
    }

    if (fecha && !isValidDate(fecha)) {
      return NextResponse.json(
        { error: 'La fecha seleccionada no es válida.' },
        { status: 400 }
      );
    }

    if (
      fecha &&
      (Number(fecha.slice(0, 4)) !== anio ||
        Number(fecha.slice(5, 7)) !== mes)
    ) {
      return NextResponse.json(
        { error: 'La fecha no corresponde al mes seleccionado.' },
        { status: 400 }
      );
    }

    const { inicio, fin } = getMonthRange(anio, mes);

    // Solo se consideran fechas en las que al menos un pelotero
    // tenga asistencia registrada como verdadera.
    const registros = await prisma.asistencia.findMany({
      where: {
        fechaPichanga: {
          gte: inicio,
          lt: fin,
        },
        asistio: true,
      },
      select: {
        fechaPichanga: true,
      },
      orderBy: {
        fechaPichanga: 'asc',
      },
    });

    const fechas = [
      ...new Set(
        registros.map((registro) =>
          registro.fechaPichanga.toISOString().slice(0, 10)
        )
      ),
    ];

    // Sin fecha seleccionada, devolver únicamente las fechas
    // disponibles para construir el calendario.
    if (!fecha) {
      return NextResponse.json({
        anio,
        mes,
        fechas,
      });
    }

    const fechaPichanga = new Date(
      `${fecha}T00:00:00.000Z`
    );
    const finFecha = new Date(fechaPichanga);
    finFecha.setUTCDate(finFecha.getUTCDate() + 1);

    // Una fecha sin asistentes registrados no puede mostrar detalle.
    if (!fechas.includes(fecha)) {
      return NextResponse.json({
        anio,
        mes,
        fechas,
        asistentes: [],
      });
    }

    const [asistencias, pagos] = await Promise.all([
      prisma.asistencia.findMany({
        where: {
          fechaPichanga: {
            gte: fechaPichanga,
            lt: finFecha,
          },
          asistio: true,
        },
        select: {
          playerId: true,
          player: {
            select: {
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

      prisma.payment.findMany({
        where: {
          status: 'APPROVED',
          pichangaDate: {
            gte: fechaPichanga,
            lt: finFecha,
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
      }),
    ]);

    const jugadoresPagados = new Set(
      pagos.map((pago) => pago.playerId)
    );

    const asistentes = asistencias.map((asistencia) => ({
      playerId: asistencia.playerId,
      fullName: asistencia.player.fullName,
      jerseyNumber: asistencia.player.jerseyNumber,
      estadoPago: jugadoresPagados.has(asistencia.playerId)
        ? 'PAGADO'
        : 'POR_PAGAR',
    }));

    return NextResponse.json({
      anio,
      mes,
      fecha,
      fechas,
      asistentes,
    });
  } catch (error) {
    console.error(
      'ERROR CONSULTANDO REPORTE PUBLICO DE ASISTENCIAS:',
      error
    );

    return NextResponse.json(
      { error: 'No se pudo cargar el reporte de asistencias.' },
      { status: 500 }
    );
  }
}
