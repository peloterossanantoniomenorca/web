import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ZONA_HORARIA = 'America/Lima';

function fechaValida(fecha: string | null): boolean {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

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

// Evita que caracteres especiales rompan el archivo XML de Excel.
function escaparXML(valor: unknown): string {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function celdaTexto(valor: unknown): string {
  return `<Cell><Data ss:Type="String">${escaparXML(valor)}</Data></Cell>`;
}

function celdaNumero(valor: number | string): string {
  const numero = Number(valor);
  const seguro = Number.isFinite(numero) ? numero : 0;

  return `<Cell><Data ss:Type="Number">${seguro}</Data></Cell>`;
}

function filaExcel(celdas: string[], encabezado = false): string {
  const estilo = encabezado ? ' ss:StyleID="Encabezado"' : '';
  return `<Row${estilo}>${celdas.join('')}</Row>`;
}

export async function GET(request: NextRequest) {
  try {
    const parametros = request.nextUrl.searchParams;

    const desdeParametro = parametros.get('desde');
    const hastaParametro = parametros.get('hasta');

    const desde =
      desdeParametro && fechaValida(desdeParametro)
        ? desdeParametro
        : '';

    const hasta =
      hastaParametro && fechaValida(hastaParametro)
        ? hastaParametro
        : '';

    if (desdeParametro && !desde) {
      return NextResponse.json(
        { error: 'La fecha desde no es válida.' },
        { status: 400 }
      );
    }

    if (hastaParametro && !hasta) {
      return NextResponse.json(
        { error: 'La fecha hasta no es válida.' },
        { status: 400 }
      );
    }

    if (desde && hasta && desde > hasta) {
      return NextResponse.json(
        {
          error:
            'La fecha desde no puede ser posterior a la fecha hasta.',
        },
        { status: 400 }
      );
    }

    const filtroPagos: {
      status: 'APPROVED';
      paymentDate?: { gte?: Date; lt?: Date };
    } = {
      status: 'APPROVED',
    };

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
        orderBy: {
          paymentDate: 'desc',
        },
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
        orderBy: {
          fecha: 'desc',
        },
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

    const filas: string[] = [];

    filas.push(
      filaExcel(encabezados.map(celdaTexto), true)
    );

    for (const pago of pagos) {
      filas.push(
        filaExcel([
          celdaTexto(fechaPago(pago.paymentDate)),
          celdaTexto('INGRESO'),
          celdaTexto(
            pago.paymentType?.description ?? 'Sin concepto'
          ),
          celdaTexto(pago.player?.id ?? pago.playerId),
          celdaTexto(pago.player?.fullName ?? ''),
          celdaNumero(pago.amount?.toString() ?? 0),
          celdaNumero(0),
          celdaNumero(0),
          celdaTexto(''),
          celdaTexto('APROBADO'),
        ])
      );
    }

    for (const egreso of egresos) {
      filas.push(
        filaExcel([
          celdaTexto(fechaEgreso(egreso.fecha)),
          celdaTexto('EGRESO'),
          celdaTexto(
            egreso.tipoEgreso?.descripcion ?? 'Sin concepto'
          ),
          celdaTexto(''),
          celdaTexto(egreso.responsableEgreso ?? ''),
          celdaNumero(0),
          celdaNumero(egreso.monto?.toString() ?? 0),
          celdaNumero(0),
          celdaTexto(''),
          celdaTexto('REGISTRADO'),
        ])
      );
    }

    // Ordenar por fecha descendente, conservando el encabezado arriba.
    const filasDatos = filas.slice(1).sort((a, b) => {
      const extraerFecha = (fila: string) => {
        const coincidencia = fila.match(
          /<Data ss:Type="String">(\d{4}-\d{2}-\d{2})<\/Data>/
        );
        return coincidencia?.[1] ?? '';
      };

      return extraerFecha(b).localeCompare(extraerFecha(a));
    });

    const contenidoXML = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Peloteros San Antonio FC</Author>
    <Title>Balance financiero</Title>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Arial" ss:Size="10"/>
    </Style>
    <Style ss:ID="Encabezado">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#15803D" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Balance">
    <Table>
      <Column ss:Width="85"/>
      <Column ss:Width="155"/>
      <Column ss:Width="180"/>
      <Column ss:Width="150"/>
      <Column ss:Width="200"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="115"/>
      <Column ss:Width="120"/>
      <Column ss:Width="100"/>
      ${[filas[0], ...filasDatos].join('\n      ')}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

    const fechaArchivo = new Date().toISOString().slice(0, 10);

    return new NextResponse(contenidoXML, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': `attachment; filename="balance-${fechaArchivo}.xls"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exportando balance a Excel:', error);

    return NextResponse.json(
      { error: 'No se pudo exportar el balance a Excel.' },
      { status: 500 }
    );
  }
}
