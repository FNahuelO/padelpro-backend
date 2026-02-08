import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear usuarios de prueba
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'juan@example.com' },
      update: {},
      create: {
        email: 'juan@example.com',
        password: hashedPassword,
        name: 'Juan Pérez',
        rating: 1200,
        weeklyPoints: 50,
        location: 'Madrid, España',
        sports: ['Pádel', 'Tenis'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado derecho',
        matchType: 'Competitivo',
        preferredPlayTime: 'Tarde',
      },
    }),
    prisma.user.upsert({
      where: { email: 'maria@example.com' },
      update: {},
      create: {
        email: 'maria@example.com',
        password: hashedPassword,
        name: 'María García',
        rating: 1100,
        weeklyPoints: 40,
        location: 'Barcelona, España',
        sports: ['Pádel'],
        preferredHand: 'Izquierda',
        courtPosition: 'Lado izquierdo',
        matchType: 'Amistoso',
        preferredPlayTime: 'Mañana',
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@example.com' },
      update: {},
      create: {
        email: 'carlos@example.com',
        password: hashedPassword,
        name: 'Carlos López',
        rating: 1050,
        weeklyPoints: 30,
        sports: ['Pádel', 'Pickleball'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado derecho',
        matchType: 'Competitivo',
        preferredPlayTime: 'Noche',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@example.com' },
      update: {},
      create: {
        email: 'ana@example.com',
        password: hashedPassword,
        name: 'Ana Martínez',
        rating: 1150,
        weeklyPoints: 45,
        location: 'Valencia, España',
        sports: ['Tenis', 'Pickleball'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado izquierdo',
        matchType: 'Amistoso',
        preferredPlayTime: 'Tarde',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Crear clubs
  const clubs = await Promise.all([
    prisma.club.upsert({
      where: { id: 'club-1' },
      update: {},
      create: {
        id: 'club-1',
        name: 'Club Tenis Palermo',
        address: 'Av. Libertador 4100, CABA',
        description: 'Club de tenis con canchas de polvo de ladrillo',
        plan: 'PLUS',
      },
    }),
    prisma.club.upsert({
      where: { id: 'club-2' },
      update: {},
      create: {
        id: 'club-2',
        name: 'Club Deportivo Norte',
        address: 'Av. del Libertador 6000, CABA',
        description: 'Club con múltiples canchas y promociones',
        plan: 'BASIC',
      },
    }),
    prisma.club.upsert({
      where: { id: 'club-3' },
      update: {},
      create: {
        id: 'club-3',
        name: 'Tenis Club Sur',
        address: 'Av. Corrientes 5000, CABA',
        description: 'Club moderno con canchas sintéticas',
        plan: 'PLUS',
      },
    }),
  ]);

  console.log(`✅ Created ${clubs.length} clubs`);

  // Crear canchas
  await Promise.all([
    prisma.court.createMany({
      data: [
        { clubId: clubs[0].id, name: 'Cancha 1', surface: 'Polvo de ladrillo' },
        { clubId: clubs[0].id, name: 'Cancha 2', surface: 'Polvo de ladrillo' },
        { clubId: clubs[1].id, name: 'Cancha Central', surface: 'Césped' },
        { clubId: clubs[2].id, name: 'Cancha A', surface: 'Sintética' },
        { clubId: clubs[2].id, name: 'Cancha B', surface: 'Sintética' },
      ],
      skipDuplicates: true,
    }),
  ]);

  console.log('✅ Created courts');

  // Crear promociones para clubs PLUS
  await Promise.all([
    prisma.clubPromotion.createMany({
      data: [
        {
          clubId: clubs[0].id,
          dayOfWeek: 1, // Lunes
          startHour: 10,
          endHour: 16,
          bonusPoints: 15,
          priority: 1,
        },
        {
          clubId: clubs[0].id,
          dayOfWeek: 2, // Martes
          startHour: 10,
          endHour: 16,
          bonusPoints: 15,
          priority: 1,
        },
        {
          clubId: clubs[2].id,
          dayOfWeek: 3, // Miércoles
          startHour: 11,
          endHour: 15,
          bonusPoints: 20,
          priority: 2,
        },
      ],
      skipDuplicates: true,
    }),
  ]);

  console.log('✅ Created club promotions');

  // Crear disponibilidades de ejemplo
  await Promise.all([
    prisma.availability.createMany({
      data: [
        { userId: users[0].id, dayOfWeek: 1, startHour: 10, endHour: 18 },
        { userId: users[0].id, dayOfWeek: 3, startHour: 14, endHour: 20 },
        { userId: users[1].id, dayOfWeek: 1, startHour: 12, endHour: 18 },
        { userId: users[1].id, dayOfWeek: 5, startHour: 10, endHour: 16 },
        { userId: users[2].id, dayOfWeek: 2, startHour: 10, endHour: 16 },
        { userId: users[3].id, dayOfWeek: 1, startHour: 10, endHour: 18 },
      ],
      skipDuplicates: true,
    }),
  ]);

  console.log('✅ Created availabilities');

  // Crear solicitudes de amistad de ejemplo
  await Promise.all([
    prisma.friendRequest.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: users[0].id,
          toUserId: users[1].id,
        },
      },
      update: {},
      create: {
        fromUserId: users[0].id,
        toUserId: users[1].id,
        status: 'ACCEPTED',
      },
    }),
    prisma.friendRequest.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: users[2].id,
          toUserId: users[0].id,
        },
      },
      update: {},
      create: {
        fromUserId: users[2].id,
        toUserId: users[0].id,
        status: 'ACCEPTED',
      },
    }),
  ]);

  console.log('✅ Created friend requests');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
