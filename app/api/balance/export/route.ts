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

function celdaNumero(valor: number): string {
  const seguro = Number.isFinite(valor) ? valor : 0;

  return `<Cell><Data ss:Type="Number">${seguro.toFixed(2)}</Data></Cell>`;
}

function filaExcel(celdas: string[], encabezado = false): string {
  const estilo = encabezado ? ' ss:StyleID="Encabezado"' : '';
  return `<Row${estilo}>${celdas.join('')}</Row>`;
}

function normalizarNombre(
  nombre: string | null | undefined
): string {
  return (nombre ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function numero(valor: unknown): number {
  const resultado = Number(valor ?? 0);
  return Number.isFinite(resultado) ? resultado : 0;
}

type FilaBalance = {
  fecha: string;
  concepto: string;
  descripcion: string;
  idPelotero: string;
  nombrePelotero: string;
  montoCobrado: number;
  montoPagado: number;
  pendiente: number;
  medioPago: string;
  estado: string;
};

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

    const [pagos, egresos, peloteros] = await Promise.all([
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
              amount: true,
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

      prisma.player.findMany({
        select: {
          id: true,
          fullName: true,
        },
      }),
    ]);

    // Índice de peloteros para identificar al responsable de un egreso.
    const peloterosPorNombre = new Map<
      string,
      { id: string; fullName: string }
    >();

    for (const pelotero of peloteros) {
      const clave = normalizarNombre(pelotero.fullName);

      if (clave && !peloterosPorNombre.has(clave)) {
        peloterosPorNombre.set(clave, pelotero);
      }
    }

    const filasDatos: FilaBalance[] = [];

    // =========================
    // INGRESOS APROBADOS
    // =========================
    for (const pago of pagos) {
      const descripcion =
        pago.paymentType?.description ?? 'Sin concepto';

      const esCuotaPartido =
        normalizarNombre(descripcion) ===
        normalizarNombre('Pago cuota por partido');

      const montoPagado = numero(pago.amount);

      // Cuota por partido: utiliza el importe configurado.
      // Otros ingresos: el monto cobrado es igual al pagado.
      const montoCobrado = esCuotaPartido
        ? numero(pago.paymentType?.amount)
        : montoPagado;

      // Nunca mostrar un pendiente negativo.
      const pendiente = Math.max(
        0,
        montoCobrado - montoPagado
      );

      filasDatos.push({
        fecha: fechaPago(pago.paymentDate),
        concepto: 'INGRESO',
        descripcion,
        idPelotero: pago.player?.id ?? pago.playerId ?? '',
        nombrePelotero: pago.player?.fullName ?? '',
        montoCobrado,
        montoPagado,
        pendiente,

        // El modelo actual no confirma un campo de medio de pago
        // para ingresos; por eso se deja vacío.
        medioPago: '',

        estado: 'APROBADO',
      });
    }

    // =========================
    // EGRESOS
    // =========================
    for (const egreso of egresos) {
      const responsable = egreso.responsableEgreso ?? '';

      const pelotero = peloterosPorNombre.get(
        normalizarNombre(responsable)
      );

      filasDatos.push({
        fecha: fechaEgreso(egreso.fecha),
        concepto: 'EGRESO',
        descripcion:
          egreso.tipoEgreso?.descripcion ?? 'Sin concepto',

        // Se asigna el ID si el responsable coincide con un pelotero.
        idPelotero: pelotero?.id ?? '',
        nombrePelotero: responsable,

        montoCobrado: 0,
        montoPagado: numero(egreso.monto),
        pendiente: 0,

        // Todos los egresos utilizan YAPE.
        medioPago: 'YAPE',

        // Todos los egresos deben aparecer como APROBADO.
        estado: 'APROBADO',
      });
    }

    // Orden descendente por fecha.
    filasDatos.sort((a, b) =>
      b.fecha.localeCompare(a.fecha)
    );

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

    const filasXML = [
      filaExcel(encabezados.map(celdaTexto), true),

      ...filasDatos.map((fila) =>
        filaExcel([
          celdaTexto(fila.fecha),
          celdaTexto(fila.concepto),
          celdaTexto(fila.descripcion),
          celdaTexto(fila.idPelotero),
          celdaTexto(fila.nombrePelotero),
          celdaNumero(fila.montoCobrado),
          celdaNumero(fila.montoPagado),
          celdaNumero(fila.pendiente),
          celdaTexto(fila.medioPago),
          celdaTexto(fila.estado),
        ])
      ),
    ];

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
      ${filasXML.join('\n      ')}
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
        'Content-Type':
          'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition':
          `attachment; filename="balance-${fechaArchivo}.xls"`,
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
