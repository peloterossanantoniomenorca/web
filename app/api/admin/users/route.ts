import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, normalizeRole } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAdmin() {
  const session = await getSession();
  return Boolean(session && normalizeRole(session.payload.role) === 'ADMIN');
}

// Listar usuarios: solo ADMIN
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción.' },
        { status: 403 }
      );
    }

    const users = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('ERROR LISTANDO USUARIOS:', error);

    return NextResponse.json(
      { error: 'No se pudo cargar la lista de usuarios.' },
      { status: 500 }
    );
  }
}

// Crear usuario: solo ADMIN
export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = normalizeRole(body.role);

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Ingresa un correo electrónico válido.' },
        { status: 400 }
      );
    }

    if (password.length < 10 || password.length > 72) {
      return NextResponse.json(
        { error: 'La contraseña debe tener entre 10 y 72 caracteres.' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'Selecciona un rol válido.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe una cuenta con ese correo electrónico.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.admin.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });

    return NextResponse.json(
      { ok: true, message: 'Usuario creado correctamente.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('ERROR CREANDO USUARIO:', error);

    return NextResponse.json(
      { error: 'No se pudo crear el usuario. Verifica los datos e inténtalo nuevamente.' },
      { status: 500 }
    );
  }
}
