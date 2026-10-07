import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Correo o contraseña inválidos.',
        },
        {
          status: 400,
        }
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
        {
          error: 'Credenciales incorrectas.',
        },
        {
          status: 401,
        }
      );
    }

    const validPassword = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        {
          error: 'Credenciales incorrectas.',
        },
        {
          status: 401,
        }
      );
    }

    await createSession(admin.id);

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        error: 'No se pudo iniciar sesión.',
      },
      {
        status: 500,
      }
    );
  }
}
