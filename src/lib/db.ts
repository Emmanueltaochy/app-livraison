import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const globalPourPool = globalThis as unknown as { pool?: Pool };

function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("Variable d'environnement manquante : DATABASE_URL (voir README)");
  // Réutilisé entre les rechargements à chaud en développement.
  globalPourPool.pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  return globalPourPool.pool;
}

export async function requete<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await pool().query<T>(sql, params);
  return rows;
}

export async function une<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  return (await requete<T>(sql, params))[0] ?? null;
}

export async function transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("begin");
    const r = await fn(c);
    await c.query("commit");
    return r;
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}
