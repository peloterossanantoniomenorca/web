import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function GET() {
  const session = await getSession();

  return NextResponse.json({
    authenticated: Boolean(session),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Correo o contraseña inválidos.' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    const admin = await prisma.admin.findUnique({
      where: {
        email,
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos.' },
        { status: 401 }
      );
    }

    await createSession(admin.id);

    return NextResponse.json({
      ok: true,
      message: 'Sesión iniciada correctamente.',
    });
  } catch (error) {
    console.error('ERROR LOGIN:', error);

    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor.' },
      { status: 500 }
    );
  }
}
