/**
 * Datos de prueba para el esquema MVP (migraciones SQL en src/database/migrations).
 * Ejecutar después de: pnpm db:migrate
 */
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const DEMO_PASSWORD = 'password123';

const CLUBS = [
  {
    id: 'a0000001-0001-4001-8001-000000000001',
    name: 'Pádel Center Palermo',
    city: 'CABA',
    zone: 'Palermo',
    address: 'Av. Libertador 4100',
    phone: '+54 11 4000-0001',
  },
  {
    id: 'a0000001-0001-4001-8001-000000000002',
    name: 'Club Deportivo Norte',
    city: 'Vicente López',
    zone: 'Zona Norte',
    address: 'Av. del Libertador 6000',
    phone: '+54 11 4000-0002',
  },
] as const;

const USERS = [
  {
    id: 'b0000001-0001-4001-8001-000000000001',
    email: 'juan@example.com',
    name: 'Juan Pérez',
    role: 'PLAYER',
    nickname: 'JuanP',
    city: 'CABA',
    zone: 'Palermo',
    level: 3.5,
  },
  {
    id: 'b0000001-0001-4001-8001-000000000002',
    email: 'maria@example.com',
    name: 'María García',
    role: 'PLAYER',
    nickname: 'MariaG',
    city: 'CABA',
    zone: 'Palermo',
    level: 3.0,
  },
  {
    id: 'b0000001-0001-4001-8001-000000000003',
    email: 'admin@padely.com',
    name: 'Admin Padely',
    role: 'CLUB_ADMIN',
    nickname: 'Admin',
    city: 'CABA',
    zone: 'Palermo',
    level: 4.0,
  },
] as const;

function databaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL no está definida.');
  }
  try {
    const url = new URL(raw);
    url.searchParams.delete('schema');
    return url.toString();
  } catch {
    return raw;
  }
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl() });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    const { rows } = await pool.query<{ ok: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS ok`,
    );
    if (!rows[0]?.ok) {
      throw new Error('La tabla users no existe. Ejecuta primero: pnpm db:migrate');
    }

    console.log('🌱 Seed MVP (Sequelize / SQL)...');

    for (const club of CLUBS) {
      await pool.query(
        `INSERT INTO clubs (id, name, city, zone, address, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           city = EXCLUDED.city,
           zone = EXCLUDED.zone,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           updated_at = NOW()`,
        [club.id, club.name, club.city, club.zone, club.address, club.phone],
      );
    }
    console.log(`✅ ${CLUBS.length} clubes`);

    for (const user of USERS) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5::user_role)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           updated_at = NOW()`,
        [user.id, user.email, passwordHash, user.name, user.role],
      );

      await pool.query(
        `INSERT INTO players (user_id, nickname, city, zone, level, position)
         VALUES ($1, $2, $3, $4, $5, 'ambos')
         ON CONFLICT (user_id) DO UPDATE SET
           nickname = EXCLUDED.nickname,
           city = EXCLUDED.city,
           zone = EXCLUDED.zone,
           level = EXCLUDED.level,
           updated_at = NOW()`,
        [user.id, user.nickname, user.city, user.zone, user.level],
      );
    }
    console.log(`✅ ${USERS.length} usuarios + perfiles player`);
    console.log(`   Contraseña demo: ${DEMO_PASSWORD}`);
    console.log('   Emails: juan@example.com, maria@example.com, admin@padely.com');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
