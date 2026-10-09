import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { uploadVoucher } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const [tipos, peloteros] = await Promise.all([
      prisma.tipoEgreso.findMany({
        orderBy: { descripcion: 'asc' },
      }),
      prisma.player.findMany({
        select: {
          id: true,
          fullName: true,
        },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return NextResponse.json({
      tipos,
      peloteros,
    });
  } catch (error) {
    console.error('ERROR CONSULTANDO DATOS DE EGRESOS:', error);

    return NextResponse.json(
      { error: 'No se pudieron cargar los tipos de egreso y peloteros.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedFileId: string | undefined;

  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const idTipEgreso = String(
      formData.get('idTipEgreso') ?? ''
    ).trim();

    const fechaTexto = String(
      formData.get('fecha') ?? ''
    ).trim();

    const montoTexto = String(
      formData.get('monto') ?? ''
    ).trim();

    const responsableId = String(
      formData.get('responsableEgreso') ?? ''
    ).trim();

    const file = formData.get('voucher');

    if (
      !idTipEgreso ||
      !fechaTexto ||
      !montoTexto ||
      !responsableId
    ) {
      return NextResponse.json(
        { error: 'Completa todos los campos obligatorios.' },
        { status: 400 }
      );
    }

    const monto = Number(montoTexto);

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor que cero.' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTexto)) {
      return NextResponse.json(
        { error: 'La fecha no es válida.' },
        { status: 400 }
      );
    }

    const fecha = new Date(`${fechaTexto}T12:00:00.000Z`);

    if (
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== fechaTexto
    ) {
      return NextResponse.json(
        { error: 'La fecha no es válida.' },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Adjunta el voucher del egreso.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El voucher no puede superar los 5 MB.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos JPG, PNG o PDF.' },
        { status: 400 }
      );
    }

    const [tipo, responsable] = await Promise.all([
      prisma.tipoEgreso.findUnique({
        where: { idTipEgreso },
      }),
      prisma.player.findUnique({
        where: { id: responsableId },
        select: { id: true, fullName: true },
      }),
    ]);

    if (!tipo) {
      return NextResponse.json(
        { error: 'La categoría de egreso seleccionada no existe.' },
        { status: 400 }
      );
    }

    if (!responsable) {
      return NextResponse.json(
        { error: 'El responsable seleccionado no existe.' },
        { status: 400 }
      );
    }

    const fechaNombre = fechaTexto
      .split('-')
      .reverse()
      .join('-');

    const desiredName = [
      'EGRESO',
      tipo.descripcion,
      responsable.fullName,
      fechaNombre,
    ].join(' - ');

    const stored = await uploadVoucher(file, desiredName);
    uploadedFileId = stored.key;

    const egreso = await prisma.egreso.create({
      data: {
        id: randomUUID(),
        idTipEgreso: tipo.idTipEgreso,
        fecha,
        monto,
        responsableEgreso: responsable.fullName,
        voucher: stored.url,
        voucherUrl: stored.url,
        voucherFileName: stored.fileName,
        voucherFileType: file.type,
      },
      select: {
        id: true,
        fecha: true,
        monto: true,
        responsableEgreso: true,
        voucherUrl: true,
        voucherFileName: true,
      },
    });

    return NextResponse.json(
      {
        message: 'Egreso registrado correctamente.',
        egreso,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ERROR REGISTRANDO EGRESO:', error);

    return NextResponse.json(
      { error: 'No se pudo registrar el egreso. Revisa los datos e inténtalo nuevamente.' },
      { status: 500 }
    );
  }
}
