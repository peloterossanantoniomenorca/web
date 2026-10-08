import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE = 'psafc_admin';

function getSecret() {
  const value = process.env.AUTH_SECRET;

  if (!value) {
    throw new Error('AUTH_SECRET no está configurado');
  }

  return new TextEncoder().encode(value);
}

export async function createSession(adminId: string) {
  const token = await new SignJWT({
    sub: adminId,
    role: 'admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());

  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    return await jwtVerify(token, getSecret());
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
