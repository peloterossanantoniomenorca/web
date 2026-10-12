import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
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

function getFile(form: FormData) {
  const value = form.get('voucher');

  return value instanceof File && value.size > 0
    ? value
    : null;
}

function validateVoucher(file: File | null, method: PaymentMethod) {
  if (method === 'YAPE' && !file) {
    return 'Adjunta el voucher del pago por Yape.';
  }

  if (file && !allowedTypes.includes(file.type)) {
    return 'El voucher debe ser JPG, PNG o PDF.';
  }

  if (file && file.size > 5 * 1024 * 1024) {
    return 'El voucher no puede superar los 5 MB.';
  }

  return null;
}

async function uploadPaymentVoucher(
  file: File | null,
  method: PaymentMethod,
  desiredName: string
) {
  if (method !== 'YAPE' || !file) {
    return {
      voucherUrl: null,
      voucherFileName: null,
      voucherFileType: null,
    };
  }

  const stored = await uploadVoucher(file, desiredName);

  return {
    voucherUrl: stored.url,
    voucherFileName: stored.fileName,
    voucherFileType: file.type,
  };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const mode = String(form.get('mode') || 'individual')
      .trim()
      .toLowerCase();

    const paymentDateValue = String(form.get('paymentDate') || '').trim();
    const pichangaDateValue = String(form.get('pichangaDate') || '').trim();

    const methodValue = String(form.get('paymentMethod') || 'YAPE')
      .trim()
      .toUpperCase();

    if (mode !== 'individual' && mode !== 'multiple') {
      return NextResponse.json(
        { error: 'El modo de registro no es válido.' },
        { status: 400 }
      );
    }

    if (methodValue !== 'YAPE' && methodValue !== 'EFECTIVO') {
      return NextResponse.json(
        { error: 'Selecciona un método de pago válido.' },
        { status: 400 }
      );
    }

    const paymentMethod: PaymentMethod = methodValue;
    const paymentDate = parseDate(paymentDateValue);
    const file = getFile(form);

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'Selecciona una fecha de pago válida.' },
        { status: 400 }
      );
    }

    const voucherError = validateVoucher(file, paymentMethod);

    if (voucherError) {
      return NextResponse.json(
        { error: voucherError },
        { status: 400 }
      );
    }

    /*
     * MODO MÚLTIPLE
     * Un registro independiente por pelotero.
     */
    if (mode === 'multiple') {
      const responsiblePlayerId = String(
        form.get('responsiblePlayerId') || ''
      ).trim();

      let playerIds: string[];

      try {
        const rawPlayerIds = JSON.parse(
          String(form.get('playerIds') || '[]')
        );

        if (
          !Array.isArray(rawPlayerIds) ||
          rawPlayerIds.some(
            (id) => typeof id !== 'string' || !id.trim()
          )
        ) {
          throw new Error('Lista de peloteros inválida.');
        }

        playerIds = [
          ...new Set(rawPlayerIds.map((id: string) => id.trim())),
        ];
      } catch {
        return NextResponse.json(
          { error: 'La lista de peloteros seleccionados no es válida.' },
          { status: 400 }
        );
      }

      if (!playerIds.length) {
        return NextResponse.json(
          { error: 'Selecciona al menos un pelotero.' },
          { status: 400 }
        );
      }

      if (!responsiblePlayerId) {
        return NextResponse.json(
          { error: 'Selecciona al responsable de la recaudación.' },
          { status: 400 }
        );
      }

      const pichangaDate = parseDate(pichangaDateValue);

      if (!pichangaDate) {
        return NextResponse.json(
          { error: 'Selecciona una fecha de pichanga válida.' },
          { status: 400 }
        );
      }

      const [players, responsible, paymentType] = await Promise.all([
        prisma.player.findMany({
          where: {
            id: { in: playerIds },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            fullName: true,
          },
        }),

        prisma.player.findFirst({
          where: {
            id: responsiblePlayerId,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            fullName: true,
          },
        }),

        prisma.paymentType.findFirst({
          where: {
            description: {
              equals: 'Pago cuota por partido',
              mode: 'insensitive',
            },
          },
        }),
      ]);

      if (players.length !== playerIds.length) {
        return NextResponse.json(
          {
            error:
              'Uno o más peloteros seleccionados no están disponibles.',
          },
          { status: 400 }
        );
      }

      if (!responsible) {
        return NextResponse.json(
          {
            error:
              'El responsable seleccionado no está disponible.',
          },
          { status: 400 }
        );
      }

      if (!paymentType) {
        return NextResponse.json(
          {
            error:
              'No existe el concepto "Pago cuota por partido" en la base de datos.',
          },
          { status: 400 }
        );
      }

      // El importe siempre proviene de Supabase, no del formulario.
      const amount = new Prisma.Decimal(
        paymentType.amount.toString()
      );

      if (amount.lessThanOrEqualTo(0)) {
        return NextResponse.json(
          {
            error:
              'El importe configurado para Pago cuota por partido debe ser mayor que cero.',
          },
          { status: 400 }
        );
      }

      const dayEnd = new Date(paymentDate);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      // Comprobar duplicados antes de subir el voucher o crear registros.
      const duplicates = await prisma.payment.findMany({
        where: {
          playerId: { in: playerIds },
          paymentTypeId: paymentType.id,
          paymentDate: {
            gte: paymentDate,
            lt: dayEnd,
          },
        },
        select: {
          playerId: true,
        },
      });

      if (duplicates.length) {
        const duplicatedIds = new Set(
          duplicates.map((payment) => payment.playerId)
        );

        const duplicatedNames = players
          .filter((player) => duplicatedIds.has(player.id))
          .map((player) => player.fullName);

        return NextResponse.json(
          {
            error:
              `Ya existe un registro de este concepto para la fecha seleccionada para: ${duplicatedNames.join(', ')}.`,
          },
          { status: 409 }
        );
      }

      const collectionId = randomUUID();

      // Un solo archivo de voucher para todos los pagos de este grupo.
      const voucher = await uploadPaymentVoucher(
        file,
        paymentMethod,
        [
          'Pago cuota por partido',
          'MULTIPLE',
          formatDateForFile(paymentDate),
          collectionId,
        ].join(' - ')
      );

      // Crear todos los pagos en una sola transacción.
      await prisma.$transaction(async (tx) => {
        await tx.payment.createMany({
          data: players.map((player) => ({
            playerId: player.id,
            paymentTypeId: paymentType.id,
            paymentDate,
            pichangaDate,
            amount,
            paymentMethod,
            voucherUrl: voucher.voucherUrl,
            voucherFileName: voucher.voucherFileName,
            voucherFileType: voucher.voucherFileType,
            status: 'PENDING',
            collectionId,
            collectionResponsibleId: responsible.id,
          })),
        });
      });

      const payments = await prisma.payment.findMany({
        where: { collectionId },
        include: {
          player: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return NextResponse.json(
        {
          collectionId,
          responsible: responsible.fullName,
          paymentType: paymentType.description,
          paymentMethod,
          paymentDate: paymentDate.toISOString(),
          pichangaDate: pichangaDate.toISOString(),
          amountPerPlayer: amount.toString(),
          totalPlayers: payments.length,
          totalAmount: amount
            .mul(payments.length)
            .toFixed(2),
          payments: payments.map((payment) => ({
            id: payment.id,
            player: payment.player.fullName,
            amount: payment.amount?.toString() ?? amount.toString(),
            status: payment.status,
          })),
          message: `Se registraron ${payments.length} pagos correctamente.`,
        },
        { status: 201 }
      );
    }

    /*
     * MODO INDIVIDUAL
     * Mantiene el flujo existente de un pago por pelotero.
     */
    const playerId = String(form.get('playerId') || '').trim();
    const paymentTypeId = String(form.get('paymentTypeId') || '').trim();
    const amountValue = String(form.get('amount') || '').trim();

    if (!playerId || !paymentTypeId) {
      return NextResponse.json(
        {
          error:
            'Selecciona el pelotero y el tipo de pago.',
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
    }

    let amount = new Prisma.Decimal(
      paymentType.amount.toString()
    );

    if (!requierePichanga) {
      if (!/^\d+(\.\d{1,2})?$/.test(amountValue)) {
        return NextResponse.json(
          {
            error:
              'Ingresa un monto válido con hasta dos decimales.',
          },
          { status: 400 }
        );
      }

      const parsedAmount = Number(amountValue);

      if (
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        parsedAmount > 99999999.99
      ) {
        return NextResponse.json(
          {
            error:
              'El monto debe ser mayor que cero y no superar 99,999,999.99.',
          },
          { status: 400 }
        );
      }

      amount = new Prisma.Decimal(parsedAmount.toFixed(2));
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

    const voucher = await uploadPaymentVoucher(
      file,
      paymentMethod,
      [
        paymentType.description,
        player.fullName,
        formatDateForFile(paymentDate),
      ].join(' - ')
    );

    const payment = await prisma.payment.create({
      data: {
        playerId,
        paymentTypeId,
        paymentDate,
        pichangaDate,
        amount,
        paymentMethod,
        voucherUrl: voucher.voucherUrl,
        voucherFileName: voucher.voucherFileName,
        voucherFileType: voucher.voucherFileType,
        status: 'PENDING',
        collectionId: null,
        collectionResponsibleId: null,
      },
    });

    return NextResponse.json(
      {
        id: payment.id,
        player: player.fullName,
        paymentType: paymentType.description,
        amount: payment.amount?.toString() ?? amount.toString(),
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
