import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ZONA_HORARIA = 'America/Lima';

function fechaValida(fecha: string | null): boolean {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const date = new Date(`${fecha}T12:00:00-05:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date) === fecha
  );
}

function inicioPagoUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function siguienteDiaUTC(fecha: string): Date {
  const resultado = inicioPagoUTC(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function inicioEgresoLima(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-05:00`);
}

function siguienteDiaLima(fecha: string): Date {
  const resultado = inicioEgresoLima(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function fechaPago(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

function fechaEgreso(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

function csvCelda(valor: unknown): string {
  let texto = valor === null || valor === undefined
    ? ''
    : String(valor);

  // Evita que Excel interprete valores de texto como fórmulas.
  if (/^[\s]*[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    const parametros = request.nextUrl.searchParams;
    const desdeParametro = parametros.get('desde');
    const hastaParametro = parametros.get('hasta');

    const desde = desdeParametro && fechaValida(desdeParametro)
      ? desdeParametro
      : '';

    const hasta = hastaParametro && fechaValida(hastaParametro)
      ? hastaParametro
      : '';

    if (desdeParametro && !desde) {
      return NextResponse.json(
        { error: 'La fecha desde no es válida.' },
        { status: 400 },
      );
    }

    if (hastaParametro && !hasta) {
      return NextResponse.json(
        { error: 'La fecha hasta no es válida.' },
        { status: 400 },
      );
    }

    if (desde && hasta && desde > hasta) {
      return NextResponse.json(
        { error: 'La fecha desde no puede ser posterior a la fecha hasta.' },
        { status: 400 },
      );
    }

    const filtroPagos: {
      status: 'APPROVED';
      paymentDate?: { gte?: Date; lt?: Date };
    } = { status: 'APPROVED' };

    const filtroEgresos: {
      fecha?: { gte?: Date; lt?: Date };
    } = {};

    if (desde) {
      filtroPagos.paymentDate = {
        ...filtroPagos.paymentDate,
        gte: inicioPagoUTC(desde),
      };

      filtroEgresos.fecha = {
        ...filtroEgresos.fecha,
        gte: inicioEgresoLima(desde),
      };
    }

    if (hasta) {
      filtroPagos.paymentDate = {
        ...filtroPagos.paymentDate,
        lt: siguienteDiaUTC(hasta),
      };

      filtroEgresos.fecha = {
        ...filtroEgresos.fecha,
        lt: siguienteDiaLima(hasta),
      };
    }

    const [pagos, egresos] = await Promise.all([
      prisma.payment.findMany({
        where: filtroPagos,
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
            },
          },
          paymentType: {
            select: {
              description: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),

      prisma.egreso.findMany({
        where: filtroEgresos,
        include: {
          tipoEgreso: {
            select: {
              descripcion: true,
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    const encabezados = [
      'FECHA',
      'CONCEPTO (INGRESO O EGRESO)',
      'DESCRIPCION',
      'ID DEL PELOTERO',
      'NOMBRE DEL PELOTERO',
      'MONTO COBRADO',
      'MONTO PAGADO',
      'PENDIENTE PAGAR',
      'MEDIO DE PAGO',
      'ESTADO',
    ];

    const filas: unknown[][] = [];

    for (const pago of pagos) {
      filas.push([
        fechaPago(pago.paymentDate),
        'INGRESO',
        pago.paymentType?.description ?? 'Sin concepto',
        pago.player?.id ?? pago.playerId,
        pago.player?.fullName ?? '',
        Number(pago.amount ?? 0).toFixed(2),
        '0.00',
        '0.00',
        '',
        'APROBADO',
      ]);
    }

    for (const egreso of egresos) {
      filas.push([
        fechaEgreso(egreso.fecha),
        'EGRESO',
        egreso.tipoEgreso?.descripcion ?? 'Sin concepto',
        '',
        egreso.responsableEgreso ?? '',
        '0.00',
        Number(egreso.monto ?? 0).toFixed(2),
        '',
        '',
        'REGISTRADO',
      ]);
    }

    // Combina ingresos y egresos por fecha, del más reciente al más antiguo.
    filas.sort((a, b) =>
      String(b[0]).localeCompare(String(a[0])),
    );

    const contenido = [
      encabezados,
      ...filas,
    ]
      .map((fila) => fila.map(csvCelda).join(';'))
      .join('\r\n');

    // BOM para que Excel reconozca correctamente las tildes y la ñ.
    const archivo = '\uFEFF' + contenido;

    const fechaArchivo = new Date().toISOString().slice(0, 10);

    return new NextResponse(archivo, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          `attachment; filename="balance-${fechaArchivo}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exportando balance:', error);

    return NextResponse.json(
      { error: 'No se pudo exportar el balance.' },
      { status: 500 },
    );
  }
}
