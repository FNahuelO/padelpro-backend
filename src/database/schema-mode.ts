import type { Pool } from 'pg';

export type DbSchemaMode = 'prisma' | 'mvp';

export async function detectDbSchemaMode(pool: Pool): Promise<DbSchemaMode> {
  const { rows } = await pool.query<{ prisma: boolean }>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
    ) AS prisma`,
  );
  return rows[0]?.prisma ? 'prisma' : 'mvp';
}
