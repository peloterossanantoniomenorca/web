import { NextResponse } from 'next/server'; import { prisma } from '@/lib/prisma';
export async function GET(){const players=await prisma.player.findMany({where:{status:'ACTIVE'},select:{id:true,fullName:true},orderBy:{fullName:'asc'}});return NextResponse.json(players)}
