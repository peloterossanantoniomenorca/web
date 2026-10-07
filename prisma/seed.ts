import { PrismaClient, PlayerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const players = [
 ['Juan','Pérez',10,'Delantero'],['Carlos','Rodríguez',7,'Extremo'],['Luis','García',9,'Delantero'],['Miguel','Torres',1,'Arquero'],['Diego','Ramírez',4,'Defensa'],['Andrés','Flores',8,'Mediocampista'],['José','Vargas',5,'Defensa'],['Marco','Castillo',11,'Extremo'],['Daniel','Rojas',6,'Mediocampista'],['Fernando','Mendoza',3,'Defensa']
];
async function main(){
 for(const [firstName,lastName,jerseyNumber,position] of players){await prisma.player.upsert({where:{id:`seed-${jerseyNumber}`},update:{},create:{id:`seed-${jerseyNumber}`,firstName,lastName,fullName:`${firstName} ${lastName}`,jerseyNumber:Number(jerseyNumber),position:String(position),status:PlayerStatus.ACTIVE,photoUrl:`https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80`}})}
 const email=process.env.ADMIN_EMAIL || 'admin@example.com'; const password=process.env.ADMIN_PASSWORD || 'ChangeMe123!';
 const passwordHash=await bcrypt.hash(password,12); await prisma.admin.upsert({where:{email},update:{passwordHash},create:{email,passwordHash}});
 console.log(`Admin seeded: ${email}`);
}
main().finally(()=>prisma.$disconnect());
