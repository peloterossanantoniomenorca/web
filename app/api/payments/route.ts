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

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const playerId = String(form.get('playerId') || '');
    const paymentTypeId = String(form.get('paymentTypeId') || '');
    const paymentDateValue = String(form.get('paymentDate') || '');
    const pichangaDateValue = String(form.get('pichangaDate') || '');
    const file = form.get('voucher');

    const paymentDate = parseDate(paymentDateValue);
    const pichangaDate = parseDate(pichangaDateValue);

    if (
      !playerId ||
      !paymentTypeId ||
      !paymentDate ||
      !pichangaDate ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: 'Completa todos los campos obligatorios.' },
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

    if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'Archivo no permitido. Usa JPG, PNG o PDF de hasta 5 MB.',
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo seleccionado está vacío.' },
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

    // El voucher se guarda en Supabase Storage.
    const stored = await uploadVoucher(file);

    // El monto se toma de PaymentType, nunca del formulario del navegador.
    const payment = await prisma.payment.create({
      data: {
        playerId,
        paymentTypeId,
        paymentDate,
        pichangaDate,
        amount: paymentType.amount,
        voucherUrl: stored.url,
        voucherFileName: file.name,
        voucherFileType: file.type,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        id: payment.id,
        player: player.fullName,
        paymentType: paymentType.description,
        amount: payment.amount?.toString() ?? paymentType.amount.toString(),
        paymentDate: payment.paymentDate.toISOString(),
        pichangaDate: payment.pichangaDate?.toISOString() ?? null,
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
