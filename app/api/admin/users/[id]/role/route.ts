import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin() {
  const session = await getSession();
  return Boolean(session && normalizeRole(session.payload.role) === 'ADMIN');
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const role = normalizeRole(body.role);

    if (!id || !role) {
      return NextResponse.json(
        { error: 'El usuario o el rol indicado no es válido.' },
        { status: 400 }
      );
    }

    const target = await prisma.admin.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: 'No se encontró el usuario.' },
        { status: 404 }
      );
    }

    const session = await getSession();
    const currentAdminId = session?.payload.sub;

    // Impedir que el administrador quite su propio rol de ADMIN.
    if (target.id === currentAdminId && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No puedes quitarte tu propio rol de administrador.' },
        { status: 400 }
      );
    }

    // Evitar que el sistema se quede sin administradores.
    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await prisma.admin.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Debe existir al menos un administrador.' },
          { status: 400 }
        );
      }
    }

    await prisma.admin.update({
      where: { id },
      data: { role },
    });

    return NextResponse.json({
      ok: true,
      message: 'Rol actualizado correctamente.',
    });
  } catch (error) {
    console.error('ERROR ACTUALIZANDO ROL:', error);

    return NextResponse.json(
      { error: 'No se pudo actualizar el rol.' },
      { status: 500 }
    );
  }
}
