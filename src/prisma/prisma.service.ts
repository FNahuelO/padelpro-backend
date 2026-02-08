import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.seedIfEmpty();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async seedIfEmpty() {
    const userCount = await this.user.count();
    if (userCount > 0) {
      this.logger.log('📦 Base de datos ya tiene datos, omitiendo seed.');
      return;
    }

    this.logger.log('🌱 Base de datos vacía, ejecutando seed...');

    try {
      const hashedPassword = await bcrypt.hash('password123', 10);

      // Crear usuarios de prueba
      const users = await Promise.all([
        this.user.upsert({
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
        this.user.upsert({
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
        this.user.upsert({
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
        this.user.upsert({
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

      this.logger.log(`✅ Creados ${users.length} usuarios`);

      // Crear clubs
      const clubs = await Promise.all([
        this.club.upsert({
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
        this.club.upsert({
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
        this.club.upsert({
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

      this.logger.log(`✅ Creados ${clubs.length} clubs`);

      // Crear canchas
      await this.court.createMany({
        data: [
          { clubId: clubs[0].id, name: 'Cancha 1', surface: 'Polvo de ladrillo' },
          { clubId: clubs[0].id, name: 'Cancha 2', surface: 'Polvo de ladrillo' },
          { clubId: clubs[1].id, name: 'Cancha Central', surface: 'Césped' },
          { clubId: clubs[2].id, name: 'Cancha A', surface: 'Sintética' },
          { clubId: clubs[2].id, name: 'Cancha B', surface: 'Sintética' },
        ],
        skipDuplicates: true,
      });

      this.logger.log('✅ Canchas creadas');

      // Crear promociones para clubs PLUS
      await this.clubPromotion.createMany({
        data: [
          {
            clubId: clubs[0].id,
            dayOfWeek: 1,
            startHour: 10,
            endHour: 16,
            bonusPoints: 15,
            priority: 1,
          },
          {
            clubId: clubs[0].id,
            dayOfWeek: 2,
            startHour: 10,
            endHour: 16,
            bonusPoints: 15,
            priority: 1,
          },
          {
            clubId: clubs[2].id,
            dayOfWeek: 3,
            startHour: 11,
            endHour: 15,
            bonusPoints: 20,
            priority: 2,
          },
        ],
        skipDuplicates: true,
      });

      this.logger.log('✅ Promociones de clubs creadas');

      // Crear disponibilidades de ejemplo
      await this.availability.createMany({
        data: [
          { userId: users[0].id, dayOfWeek: 1, startHour: 10, endHour: 18 },
          { userId: users[0].id, dayOfWeek: 3, startHour: 14, endHour: 20 },
          { userId: users[1].id, dayOfWeek: 1, startHour: 12, endHour: 18 },
          { userId: users[1].id, dayOfWeek: 5, startHour: 10, endHour: 16 },
          { userId: users[2].id, dayOfWeek: 2, startHour: 10, endHour: 16 },
          { userId: users[3].id, dayOfWeek: 1, startHour: 10, endHour: 18 },
        ],
        skipDuplicates: true,
      });

      this.logger.log('✅ Disponibilidades creadas');

      // Crear solicitudes de amistad de ejemplo
      await Promise.all([
        this.friendRequest.upsert({
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
        this.friendRequest.upsert({
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

      this.logger.log('✅ Solicitudes de amistad creadas');
      this.logger.log('🎉 Seed completado!');
    } catch (error) {
      this.logger.error('❌ Error ejecutando seed:', error);
    }
  }
}
