import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Calcula weekKey "YYYY-WNN" para una fecha.
 */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const weekYear = d.getUTCFullYear();
  return `${weekYear}-W${weekNo.toString().padStart(2, '0')}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

async function main() {
  console.log('🌱 Seeding database (MVP Padely)...');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const now = new Date();
  const currentWeekKey = getWeekKey(now);
  const currentWeekStart = getWeekStart(now);

  // ─── Crear clubs ───
  const clubs = await Promise.all([
    prisma.club.upsert({
      where: { id: 'club-1' },
      update: { isActive: true },
      create: {
        id: 'club-1',
        name: 'Pádel Center Palermo',
        address: 'Av. Libertador 4100, CABA',
        description: 'El mejor centro de pádel de Palermo con 6 canchas de cristal',
        zone: 'Palermo',
        isActive: true,
        plan: 'PLUS',
      },
    }),
    prisma.club.upsert({
      where: { id: 'club-2' },
      update: { isActive: true },
      create: {
        id: 'club-2',
        name: 'Club Deportivo Norte',
        address: 'Av. del Libertador 6000, Vicente López',
        description: 'Club con canchas de pádel y tenis en zona norte',
        zone: 'Zona Norte',
        isActive: true,
        plan: 'BASIC',
      },
    }),
  ]);

  console.log(`✅ Created ${clubs.length} clubs`);

  // ─── Crear canchas ───
  await prisma.court.deleteMany({});
  await prisma.court.createMany({
    data: [
      { clubId: 'club-1', name: 'Cancha 1', surface: 'Cristal' },
      { clubId: 'club-1', name: 'Cancha 2', surface: 'Cristal' },
      { clubId: 'club-1', name: 'Cancha 3', surface: 'Cristal' },
      { clubId: 'club-2', name: 'Cancha Central', surface: 'Muro' },
      { clubId: 'club-2', name: 'Cancha 2', surface: 'Muro' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created courts');

  // ─── Crear usuarios con mainClubId ───
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'juan@example.com' },
      update: { mainClubId: 'club-1' },
      create: {
        email: 'juan@example.com',
        password: hashedPassword,
        name: 'Juan Pérez',
        rating: 1250,
        mainClubId: 'club-1',
        location: 'Palermo, CABA',
        sports: ['Pádel'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado derecho',
        matchType: 'Competitivo',
        preferredPlayTime: 'Tarde',
      },
    }),
    prisma.user.upsert({
      where: { email: 'maria@example.com' },
      update: { mainClubId: 'club-1' },
      create: {
        email: 'maria@example.com',
        password: hashedPassword,
        name: 'María García',
        rating: 1180,
        mainClubId: 'club-1',
        location: 'Belgrano, CABA',
        sports: ['Pádel'],
        preferredHand: 'Izquierda',
        courtPosition: 'Lado izquierdo',
        matchType: 'Competitivo',
        preferredPlayTime: 'Mañana',
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@example.com' },
      update: { mainClubId: 'club-1' },
      create: {
        email: 'carlos@example.com',
        password: hashedPassword,
        name: 'Carlos López',
        rating: 1100,
        mainClubId: 'club-1',
        sports: ['Pádel'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado derecho',
        matchType: 'Competitivo',
        preferredPlayTime: 'Noche',
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@example.com' },
      update: { mainClubId: 'club-2' },
      create: {
        email: 'ana@example.com',
        password: hashedPassword,
        name: 'Ana Martínez',
        rating: 1200,
        mainClubId: 'club-2',
        location: 'Vicente López',
        sports: ['Pádel'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado izquierdo',
        matchType: 'Amistoso',
        preferredPlayTime: 'Tarde',
      },
    }),
    prisma.user.upsert({
      where: { email: 'martin@example.com' },
      update: { mainClubId: 'club-1' },
      create: {
        email: 'martin@example.com',
        password: hashedPassword,
        name: 'Martín Rodríguez',
        rating: 1300,
        mainClubId: 'club-1',
        location: 'Palermo, CABA',
        sports: ['Pádel'],
        preferredHand: 'Derecha',
        courtPosition: 'Lado derecho',
        matchType: 'Competitivo',
        preferredPlayTime: 'Tarde',
      },
    }),
    prisma.user.upsert({
      where: { email: 'lucia@example.com' },
      update: { mainClubId: 'club-2' },
      create: {
        email: 'lucia@example.com',
        password: hashedPassword,
        name: 'Lucía Fernández',
        rating: 1050,
        mainClubId: 'club-2',
        location: 'Olivos',
        sports: ['Pádel'],
        preferredHand: 'Izquierda',
        courtPosition: 'Lado izquierdo',
        matchType: 'Amistoso',
        preferredPlayTime: 'Mañana',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ─── Crear promociones (horarios valle) ───
  await prisma.clubPromotion.deleteMany({});
  await prisma.clubPromotion.createMany({
    data: [
      {
        clubId: 'club-1',
        dayOfWeek: 1, // Lunes
        startHour: 10,
        endHour: 16,
        bonusPoints: 15,
        priority: 1,
      },
      {
        clubId: 'club-1',
        dayOfWeek: 2, // Martes
        startHour: 10,
        endHour: 16,
        bonusPoints: 15,
        priority: 1,
      },
      {
        clubId: 'club-1',
        dayOfWeek: 3, // Miércoles
        startHour: 10,
        endHour: 16,
        bonusPoints: 15,
        priority: 1,
      },
      {
        clubId: 'club-2',
        dayOfWeek: 4, // Jueves
        startHour: 9,
        endHour: 14,
        bonusPoints: 20,
        priority: 2,
      },
    ],
  });

  console.log('✅ Created club promotions (valley hours)');

  // ─── Crear disponibilidades vinculadas a club ───
  await prisma.availability.deleteMany({});
  await prisma.availability.createMany({
    data: [
      // Juan - disponible en club-1 varios días
      { userId: users[0].id, clubId: 'club-1', dayOfWeek: 1, startHour: 10, endHour: 20 },
      { userId: users[0].id, clubId: 'club-1', dayOfWeek: 3, startHour: 14, endHour: 22 },
      { userId: users[0].id, clubId: 'club-1', dayOfWeek: 5, startHour: 18, endHour: 22 },
      // María - disponible en club-1
      { userId: users[1].id, clubId: 'club-1', dayOfWeek: 1, startHour: 9, endHour: 18 },
      { userId: users[1].id, clubId: 'club-1', dayOfWeek: 3, startHour: 14, endHour: 20 },
      // Carlos - disponible en club-1
      { userId: users[2].id, clubId: 'club-1', dayOfWeek: 1, startHour: 10, endHour: 18 },
      { userId: users[2].id, clubId: 'club-1', dayOfWeek: 3, startHour: 16, endHour: 22 },
      // Ana - disponible en club-2
      { userId: users[3].id, clubId: 'club-2', dayOfWeek: 4, startHour: 9, endHour: 18 },
      { userId: users[3].id, clubId: 'club-2', dayOfWeek: 5, startHour: 16, endHour: 22 },
      // Martín - disponible en club-1
      { userId: users[4].id, clubId: 'club-1', dayOfWeek: 1, startHour: 14, endHour: 22 },
      { userId: users[4].id, clubId: 'club-1', dayOfWeek: 3, startHour: 14, endHour: 22 },
      { userId: users[4].id, clubId: 'club-1', dayOfWeek: 5, startHour: 18, endHour: 22 },
      // Lucía - disponible en club-2
      { userId: users[5].id, clubId: 'club-2', dayOfWeek: 4, startHour: 10, endHour: 16 },
    ],
  });

  console.log('✅ Created availabilities');

  // ─── Crear PointsEvents de ejemplo (semana actual) ───
  await prisma.pointsEvent.deleteMany({});
  await prisma.pointsEvent.createMany({
    data: [
      { playerId: users[0].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[0].id, clubId: 'club-1', type: 'VALLEY_BONUS', points: 15, weekKey: currentWeekKey },
      { playerId: users[1].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[2].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[2].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[4].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[4].id, clubId: 'club-1', type: 'VALLEY_BONUS', points: 15, weekKey: currentWeekKey },
      { playerId: users[4].id, clubId: 'club-1', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[3].id, clubId: 'club-2', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[5].id, clubId: 'club-2', type: 'PLAYED_MATCH', points: 10, weekKey: currentWeekKey },
      { playerId: users[5].id, clubId: 'club-2', type: 'VALLEY_BONUS', points: 20, weekKey: currentWeekKey },
    ],
  });

  console.log('✅ Created points events');

  // ─── Crear WeeklyPoints actualizados ───
  await prisma.weeklyPoints.deleteMany({});
  await prisma.weeklyPoints.createMany({
    data: [
      { userId: users[0].id, clubId: 'club-1', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 25 },
      { userId: users[1].id, clubId: 'club-1', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 10 },
      { userId: users[2].id, clubId: 'club-1', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 20 },
      { userId: users[4].id, clubId: 'club-1', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 35 },
      { userId: users[3].id, clubId: 'club-2', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 10 },
      { userId: users[5].id, clubId: 'club-2', weekStartDate: currentWeekStart, weekKey: currentWeekKey, points: 30 },
    ],
  });

  console.log('✅ Created weekly points');

  // ─── Crear premios ───
  await prisma.prize.deleteMany({});
  await prisma.prize.createMany({
    data: [
      {
        clubId: 'club-1',
        title: '1 hora de cancha gratis',
        description: 'Para el ganador del ranking semanal',
        position: 1,
        isActive: true,
      },
      {
        clubId: 'club-1',
        title: 'Pack de pelotas Head',
        description: 'Para el segundo del ranking semanal',
        position: 2,
        isActive: true,
      },
      {
        clubId: 'club-2',
        title: '50% descuento en cancha',
        description: 'Para el ganador del ranking semanal',
        position: 1,
        isActive: true,
      },
    ],
  });

  console.log('✅ Created prizes');

  // ─── Crear solicitudes de amistad de ejemplo (Fase 2, mantenemos datos) ───
  await prisma.friendRequest.deleteMany({});
  await prisma.friendRequest.createMany({
    data: [
      { fromUserId: users[0].id, toUserId: users[1].id, status: 'ACCEPTED' },
      { fromUserId: users[2].id, toUserId: users[0].id, status: 'ACCEPTED' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created friend requests');

  console.log('🎉 Seeding completed! (MVP Padely)');
  console.log(`📅 Current weekKey: ${currentWeekKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
