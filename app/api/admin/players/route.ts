import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { playerSchema } from '@/lib/validations';

export async function POST(req: Request) {
  if (!(await getSession())) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401 }
    );
  }

  const parsed = playerSchema.safeParse(
    await req.json()
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.' },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const player = await prisma.player.create({
    data: {
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
      photoUrl: data.photoUrl || null,
    },
  });

  return NextResponse.json(player, {
    status: 201,
  });
}
