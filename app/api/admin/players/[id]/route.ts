import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  if (!(await getSession())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await req.json();

  if (!['ACTIVE', 'INACTIVE'].includes(body.status)) {
    return NextResponse.json(
      { error: 'Estado inválido' },
      { status: 400 }
    );
  }

  const player = await prisma.player.update({
    where: { id },
    data: {
      status: body.status,
    },
  });

  return NextResponse.json(player);
}
