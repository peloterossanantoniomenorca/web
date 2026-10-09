import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado no válido' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Pago no encontrado' },
        { status: 404 }
      );
    }

    // Al rechazar, solo cambia el estado.
    if (status === 'REJECTED') {
      const updated = await prisma.payment.update({
        where: { id },
        data: { status: 'REJECTED' },
      });

      return NextResponse.json({
        success: true,
        payment: updated,
      });
    }

    // Guardamos la aprobación. El pago NO se elimina.
    await prisma.payment.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Si no hay voucher, el pago sigue aprobado.
    if (!payment.voucherUrl) {
      return NextResponse.json({
        success: true,
        message: 'Pago aprobado; no había voucher para eliminar.',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          error:
            'El pago fue aprobado, pero faltan las variables de Supabase para eliminar el voucher.',
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Extraemos la ruta del archivo dentro del bucket vouchers.
    let filePath: string;

    try {
      const url = new URL(payment.voucherUrl);
      const marker = '/storage/v1/object/';
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        throw new Error('URL de almacenamiento no reconocida');
      }

      const storagePath = url.pathname
        .slice(markerIndex + marker.length)
        .replace(/^(public|sign|authenticated)\//, '');

      const bucketPrefix = 'vouchers/';

      if (!storagePath.startsWith(bucketPrefix)) {
        throw new Error('El voucher no pertenece al bucket vouchers');
      }

      filePath = decodeURIComponent(
        storagePath.slice(bucketPrefix.length)
      );

      if (!filePath || filePath.startsWith('/')) {
        throw new Error('Ruta del voucher no válida');
      }
    } catch {
      return NextResponse.json(
        {
          error:
            'El pago fue aprobado, pero no se pudo identificar la ruta del voucher.',
        },
        { status: 500 }
      );
    }

    const { error } = await supabase.storage
      .from('vouchers')
      .remove([filePath]);

    if (error) {
      return NextResponse.json(
        {
          error:
            'El pago fue aprobado, pero no se pudo eliminar el archivo del voucher.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pago aprobado y voucher eliminado del almacenamiento.',
    });
  } catch (error) {
    console.error('Error procesando pago:', error);

    return NextResponse.json(
      { error: 'Error interno al procesar el pago.' },
      { status: 500 }
    );
  }
}
