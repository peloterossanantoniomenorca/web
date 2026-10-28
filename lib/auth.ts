import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE = 'psafc_admin';
export type AppRole = 'PELOTERO' | 'ADMIN' | 'ENCARGADO';

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET no está configurado');
  return new TextEncoder().encode(value);
}

export async function createSession(adminId: string, role: AppRole = 'ADMIN') {
  const token = await new SignJWT({ sub: adminId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const result = await jwtVerify(token, getSecret());
    return result;
  } catch {
    return null;
  }
}

export function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null;
  const role = value.toUpperCase();
  if (role === 'ADMIN' || role === 'PELOTERO' || role === 'ENCARGADO') return role;
  return null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
