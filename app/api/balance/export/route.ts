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

// Las fechas de pichanga son fechas de calendario: no deben convertirse
// a la zona horaria de Lima porque eso puede restar un día.
function inicioUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function siguienteDiaUTC(fecha: string): Date {
  const resultado = inicioUTC(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

function inicioLima(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-05:00`);
}

function siguienteDiaLima(fecha: string): Date {
  const resultado = inicioLima(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + 1);
  return resultado;
}

// La API de pagos guarda paymentDate como fecha de calendario a medianoche UTC.
// Se extrae directamente YYYY-MM-DD para evitar cualquier cambio de día por zona horaria.
function fechaPago(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function fechaLima(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

function fechaSoloDate(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
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

function celdaNumero(valor: number, estilo?: string): string {
  const seguro = Number.isFinite(valor) ? valor : 0;
  const atributo = estilo ? ` ss:StyleID="${estilo}"` : '';
  return `<Cell${atributo}><Data ss:Type="Number">${seguro.toFixed(2)}</Data></Cell>`;
}

function filaExcel(celdas: string[], encabezado = false): string {
  const estilo = encabezado ? ' ss:StyleID="Encabezado"' : '';
  return `<Row${estilo}>${celdas.join('')}</Row>`;
}

function normalizarNombre(nombre: string | null | undefined): string {
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
  fechaPago: string;
  fechaPichanga: string;
  concepto: string;
  descripcion: string;
  idPelotero: string;
  nombrePelotero: string;
  montoCobrado: number;
  montoPagado: number;
  pendiente: number;
  medioPago: string;
  estado: string;
  esEgreso: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const parametros = request.nextUrl.searchParams;
    const desdeParametro = parametros.get('desde');
    const hastaParametro = parametros.get('hasta');
    const desde = desdeParametro && fechaValida(desdeParametro) ? desdeParametro : '';
    const hasta = hastaParametro && fechaValida(hastaParametro) ? hastaParametro : '';

    if (desdeParametro && !desde) {
      return NextResponse.json({ error: 'La fecha desde no es válida.' }, { status: 400 });
    }
    if (hastaParametro && !hasta) {
      return NextResponse.json({ error: 'La fecha hasta no es válida.' }, { status: 400 });
    }
    if (desde && hasta && desde > hasta) {
      return NextResponse.json(
        { error: 'La fecha desde no puede ser posterior a la fecha hasta.' },
        { status: 400 }
      );
    }

    // Ingresos: paymentDate se guarda como fecha de calendario a medianoche UTC;
    // los filtros usan límites UTC para que no se desplace el día.
    const filtroPagos: {
      status: 'APPROVED';
      paymentDate?: { gte?: Date; lt?: Date };
    } = { status: 'APPROVED' };

    if (desde) {
      filtroPagos.paymentDate = {
        ...filtroPagos.paymentDate,
        gte: inicioUTC(desde),
      };
    }
    if (hasta) {
      filtroPagos.paymentDate = {
        ...filtroPagos.paymentDate,
        lt: siguienteDiaUTC(hasta),
      };
    }

    // Egresos: el filtro usa la fecha de registro en hora de Lima.
    const filtroEgresos: { fecha?: { gte?: Date; lt?: Date } } = {};
    if (desde) {
      filtroEgresos.fecha = {
        ...filtroEgresos.fecha,
        gte: inicioLima(desde),
      };
    }
    if (hasta) {
      filtroEgresos.fecha = {
        ...filtroEgresos.fecha,
        lt: siguienteDiaLima(hasta),
      };
    }

    // Solo asistencias confirmadas: asistio debe ser true.
    // Se filtran las fechas de pichanga como fechas de calendario (UTC).
    const filtroAsistencias: {
      asistio: boolean;
      fechaPichanga?: { gte?: Date; lt?: Date };
    } = { asistio: true };
    if (desde) {
      filtroAsistencias.fechaPichanga = {
        ...filtroAsistencias.fechaPichanga,
        gte: inicioUTC(desde),
      };
    }
    if (hasta) {
      filtroAsistencias.fechaPichanga = {
        ...filtroAsistencias.fechaPichanga,
        lt: siguienteDiaUTC(hasta),
      };
    }

    // Buscar cuotas aprobadas por fecha de pichanga, no por fecha de pago.
    const filtroCuotasAprobadas: {
      status: 'APPROVED';
      pichangaDate?: { gte?: Date; lt?: Date };
    } = { status: 'APPROVED' };
    if (desde) {
      filtroCuotasAprobadas.pichangaDate = {
        ...filtroCuotasAprobadas.pichangaDate,
        gte: inicioUTC(desde),
      };
    }
    if (hasta) {
      filtroCuotasAprobadas.pichangaDate = {
        ...filtroCuotasAprobadas.pichangaDate,
        lt: siguienteDiaUTC(hasta),
      };
    }

    const [pagos, egresos, peloteros, asistencias, cuotasAprobadas, tipoCuota] =
      await Promise.all([
        prisma.payment.findMany({
          where: filtroPagos,
          include: {
            player: { select: { id: true, fullName: true } },
            paymentType: { select: { description: true, amount: true } },
          },
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.egreso.findMany({
          where: filtroEgresos,
          include: { tipoEgreso: { select: { descripcion: true } } },
          orderBy: { fecha: 'desc' },
        }),
        prisma.player.findMany({ select: { id: true, fullName: true } }),
        prisma.asistencia.findMany({
          where: filtroAsistencias,
          include: { player: { select: { id: true, fullName: true } } },
          orderBy: { fechaPichanga: 'desc' },
        }),
        prisma.payment.findMany({
          where: filtroCuotasAprobadas,
          include: { paymentType: { select: { description: true } } },
        }),
        prisma.paymentType.findFirst({
          where: {
            description: { equals: 'Pago cuota por partido', mode: 'insensitive' },
          },
          select: { amount: true },
        }),
      ]);

    const peloterosPorNombre = new Map<string, { id: string; fullName: string }>();
    for (const pelotero of peloteros) {
      const clave = normalizarNombre(pelotero.fullName);
      if (clave && !peloterosPorNombre.has(clave)) {
        peloterosPorNombre.set(clave, pelotero);
      }
    }

    // La fecha se normaliza sin convertirla a la zona horaria de Lima.
    const cuotasPagadas = new Set<string>();
    for (const pago of cuotasAprobadas) {
      const descripcion = pago.paymentType?.description ?? '';
      const fecha = pago.pichangaDate ? fechaSoloDate(pago.pichangaDate) : '';
      if (
        normalizarNombre(descripcion) === normalizarNombre('Pago cuota por partido') &&
        fecha
      ) {
        cuotasPagadas.add(`${pago.playerId}|${fecha}`);
      }
    }

    const filasDatos: FilaBalance[] = [];

    // Ingresos aprobados.
    for (const pago of pagos) {
      const descripcion = pago.paymentType?.description ?? 'Sin concepto';
      const esCuotaPartido =
        normalizarNombre(descripcion) === normalizarNombre('Pago cuota por partido');
      const montoPagado = numero(pago.amount);
      const montoCobrado = esCuotaPartido
        ? numero(pago.paymentType?.amount)
        : montoPagado;

      filasDatos.push({
        fechaPago: fechaPago(pago.paymentDate),
        fechaPichanga:
          esCuotaPartido && pago.pichangaDate
            ? fechaSoloDate(pago.pichangaDate)
            : '',
        concepto: 'INGRESO',
        descripcion,
        idPelotero: pago.player?.id ?? pago.playerId ?? '',
        nombrePelotero: pago.player?.fullName ?? '',
        montoCobrado,
        montoPagado,
        pendiente: Math.max(0, montoCobrado - montoPagado),
        medioPago: pago.paymentMethod ?? '',
        estado: 'APROBADO',
        esEgreso: false,
      });
    }

    // Añadir solo peloteros con asistencia confirmada y sin cuota aprobada.
    const montoCuota = numero(tipoCuota?.amount);
    for (const asistencia of asistencias) {
      if (!asistencia.player || asistencia.asistio !== true) continue;

      const fecha = fechaSoloDate(asistencia.fechaPichanga);
      const clave = `${asistencia.playerId}|${fecha}`;
      if (cuotasPagadas.has(clave)) continue;

      filasDatos.push({
        fechaPago: '',
        fechaPichanga: fecha,
        concepto: 'INGRESO',
        descripcion: 'Pago cuota por partido',
        idPelotero: asistencia.player.id,
        nombrePelotero: asistencia.player.fullName,
        montoCobrado: montoCuota,
        montoPagado: 0,
        pendiente: montoCuota,
        medioPago: '',
        estado: 'POR PAGAR',
        esEgreso: false,
      });
    }

    // Egresos: MONTO PAGADO en rojo, medio de pago YAPE y estado APROBADO.
    for (const egreso of egresos) {
      const responsable = egreso.responsableEgreso ?? '';
      const pelotero = peloterosPorNombre.get(normalizarNombre(responsable));
      const montoPagado = numero(egreso.monto);

      filasDatos.push({
        fechaPago: fechaLima(egreso.fecha),
        fechaPichanga: '',
        concepto: 'EGRESO',
        descripcion: egreso.tipoEgreso?.descripcion ?? 'Sin concepto',
        idPelotero: pelotero?.id ?? '',
        nombrePelotero: responsable,
        montoCobrado: 0,
        montoPagado,
        pendiente: 0,
        medioPago: 'YAPE',
        estado: 'APROBADO',
        esEgreso: true,
      });
    }

    filasDatos.sort((a, b) => {
      const fechaA = a.fechaPago || a.fechaPichanga;
      const fechaB = b.fechaPago || b.fechaPichanga;
      return fechaB.localeCompare(fechaA);
    });

    const encabezados = [
      'FECHA DE PAGO',
      'FECHA DE PICHANGA',
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
          celdaTexto(fila.fechaPago),
          celdaTexto(fila.fechaPichanga),
          celdaTexto(fila.concepto),
          celdaTexto(fila.descripcion),
          celdaTexto(fila.idPelotero),
          celdaTexto(fila.nombrePelotero),
          celdaNumero(fila.montoCobrado),
          celdaNumero(fila.montoPagado, fila.esEgreso ? 'EgresoRojo' : undefined),
          // Solo pendientes mayores que cero se pintan en rojo.
          celdaNumero(
            fila.pendiente,
            fila.pendiente > 0 ? 'PendienteRojo' : undefined
          ),
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
    <Style ss:ID="EgresoRojo">
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#FF0000" ss:Bold="1"/>
    </Style>
    <Style ss:ID="PendienteRojo">
      <Font ss:FontName="Arial" ss:Size="10" ss:Color="#FF0000" ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Balance">
    <Table>
      <Column ss:Width="100"/>
      <Column ss:Width="115"/>
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
