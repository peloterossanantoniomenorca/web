import { PrismaClient, PlayerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const players: Array<[string, string, number, string]> = [
  ['Carlos', 'García', 1, 'Portero'],
  ['Juan', 'Pérez', 2, 'Defensa'],
  ['Miguel', 'López', 3, 'Defensa'],
  ['Pedro', 'Martínez', 4, 'Centrocampista'],
  ['Luis', 'Rodríguez', 5, 'Centrocampista'],
  ['Diego', 'Fernández', 6, 'Delantero'],
];

async function main() {
  for (const [firstName, lastName, jerseyNumber, position] of players) {
    await prisma.player.upsert({
      where: { id: `seed-${jerseyNumber}` },
      update: {},
      create: {
        id: `seed-${jerseyNumber}`,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        jerseyNumber,
        position,
        status: PlayerStatus.ACTIVE,
        photoUrl:
          'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=600&q=80',
      },
    });
  }

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  console.log(`Admin seeded: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
