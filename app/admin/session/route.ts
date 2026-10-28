import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, createSession, normalizeRole } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      role: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    role: normalizeRole(session.payload.role),
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
      where: { email },
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

    const role = normalizeRole(admin.role);

    if (!role) {
      return NextResponse.json(
        { error: 'El usuario tiene un rol inválido.' },
        { status: 403 }
      );
    }

    await createSession(admin.id, role);

    return NextResponse.json({
      ok: true,
      message: 'Sesión iniciada correctamente.',
      role,
    });
  } catch (error) {
    console.error('ERROR LOGIN:', error);

    return NextResponse.json(
      { error: 'No se pudo conectar con el servidor.' },
      { status: 500 }
    );
  }
}
