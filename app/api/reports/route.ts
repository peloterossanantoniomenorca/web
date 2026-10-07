import { NextResponse } from 'next/server'; import { getSession } from '@/lib/auth'; import { prisma } from '@/lib/prisma';
export async function GET(){if(!(await getSession()))return NextResponse.json({error:'No autorizado'},{status:401});const payments=await prisma.payment.findMany({include:{player:true},orderBy:{createdAt:'desc'}});return NextResponse.json(payments)}
