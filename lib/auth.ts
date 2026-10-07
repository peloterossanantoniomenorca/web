import { cookies } from 'next/headers'; import { jwtVerify, SignJWT } from 'jose';
const secret=new TextEncoder().encode(process.env.AUTH_SECRET || 'development-only-secret'); const COOKIE='psafc_admin';
export async function createSession(adminId:string){const token=await new SignJWT({sub:adminId,role:'admin'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('8h').sign(secret); (await cookies()).set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*8});}
export async function getSession(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;try{return await jwtVerify(token,secret)}catch{return null}}
export async function clearSession(){(await cookies()).delete(COOKIE)}
