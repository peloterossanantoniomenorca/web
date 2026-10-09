import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadVoucher } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

type PaymentMethod = 'YAPE' | 'EFECTIVO';

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function formatDateForFile(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}-${month}-${year}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const playerId = String(form.get('playerId') || '').trim();
    const paymentTypeId = String(form.get('paymentTypeId') || '').trim();
    const paymentDateValue = String(form.get('paymentDate') || '').trim();
    const pichangaDateValue = String(form.get('pichangaDate') || '').trim();

    const methodValue = String(form.get('paymentMethod') || 'YAPE')
      .trim()
      .toUpperCase();

    if (methodValue !== 'YAPE' && methodValue !== 'EFECTIVO') {
      return NextResponse.json(
        { error: 'Selecciona un método de pago válido.' },
        { status: 400 }
      );
    }

    const paymentMethod: PaymentMethod = methodValue;

    const fileValue = form.get('voucher');

    const file =
      fileValue instanceof File && fileValue.size > 0
        ? fileValue
        : null;

    const paymentDate = parseDate(paymentDateValue);

    // Estos campos siempre son obligatorios.
    if (!playerId || !paymentTypeId || !paymentDate) {
      return NextResponse.json(
        {
          error:
            'Selecciona el pelotero, el tipo de pago y una fecha de pago válida.',
        },
        { status: 400 }
      );
    }

    const [player, paymentType] = await Promise.all([
      prisma.player.findFirst({
        where: {
          id: playerId,
          status: 'ACTIVE',
        },
      }),

      prisma.paymentType.findUnique({
        where: {
          id: paymentTypeId,
        },
      }),
    ]);

    if (!player) {
      return NextResponse.json(
        { error: 'El pelotero seleccionado no está disponible.' },
        { status: 400 }
      );
    }

    if (!paymentType) {
      return NextResponse.json(
        { error: 'El tipo de pago seleccionado no existe.' },
        { status: 400 }
      );
    }

    // Solo "Pago cuota por partido" requiere fecha de pichanga.
    const requierePichanga =
      paymentType.description.trim().toLowerCase() ===
      'pago cuota por partido';

    let pichangaDate: Date | null = null;

    if (requierePichanga) {
      pichangaDate = parseDate(pichangaDateValue);

      if (!pichangaDate) {
        return NextResponse.json(
          { error: 'Selecciona una fecha de pichanga válida.' },
          { status: 400 }
        );
      }

      if (pichangaDate < paymentDate) {
        return NextResponse.json(
          {
            error:
              'La fecha de pichanga no puede ser anterior a la fecha del pago.',
          },
          { status: 400 }
        );
      }
    }

    // Solo los pagos por Yape necesitan voucher.
    if (paymentMethod === 'YAPE' && !file) {
      return NextResponse.json(
        { error: 'Adjunta el voucher del pago por Yape.' },
        { status: 400 }
      );
    }

    // Validar el archivo solamente si se adjuntó uno.
    if (file) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'El voucher debe ser JPG, PNG o PDF.' },
          { status: 400 }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'El voucher no puede superar los 5 MB.' },
          { status: 400 }
        );
      }
    }

    const dayEnd = new Date(paymentDate);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const duplicate = await prisma.payment.findFirst({
      where: {
        playerId,
        paymentTypeId,
        paymentDate: {
          gte: paymentDate,
          lt: dayEnd,
        },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            'Este pelotero ya tiene registrado ese tipo de pago para la fecha seleccionada.',
        },
        { status: 409 }
      );
    }

    let voucherUrl: string | null = null;
    let voucherFileName: string | null = null;
    let voucherFileType: string | null = null;

    // Subir el voucher a Google Drive únicamente para Yape.
    if (paymentMethod === 'YAPE' && file) {
      const desiredName = [
        paymentType.description,
        player.fullName,
        formatDateForFile(paymentDate),
      ].join(' - ');

      const stored = await uploadVoucher(file, desiredName);

      voucherUrl = stored.url;
      voucherFileName = stored.fileName;
      voucherFileType = file.type;
    }

    const payment = await prisma.payment.create({
      data: {
        playerId,
        paymentTypeId,
        paymentDate,
        pichangaDate,
        amount: paymentType.amount,
        paymentMethod,
        voucherUrl,
        voucherFileName,
        voucherFileType,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        id: payment.id,
        player: player.fullName,
        paymentType: paymentType.description,
        amount:
          payment.amount?.toString() ?? paymentType.amount.toString(),
        paymentDate: payment.paymentDate.toISOString(),
        pichangaDate: payment.pichangaDate?.toISOString() ?? null,
        paymentMethod: payment.paymentMethod,
        voucherFileName: payment.voucherFileName,
        status: payment.status,
        message: 'Pago registrado correctamente.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('ERROR REGISTRANDO PAGO:', error);

    return NextResponse.json(
      {
        error:
          'No pudimos registrar el pago. Por favor, verifica los datos e intenta nuevamente.',
      },
      { status: 500 }
    );
  }
}
