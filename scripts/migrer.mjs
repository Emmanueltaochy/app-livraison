// Applique, dans l'ordre, les fichiers db/migrations/*.sql pas encore passés.
// Lancé automatiquement au démarrage du conteneur (voir Dockerfile) ; rejouable sans risque.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const dossier = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "db", "migrations");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("select pg_advisory_lock(424242)");
  await client.query("create table if not exists migrations (nom text primary key, appliquee_le timestamptz not null default now())");
  const { rows } = await client.query("select nom from migrations");
  const faites = new Set(rows.map((r) => r.nom));

  for (const nom of (await readdir(dossier)).filter((f) => f.endsWith(".sql")).sort()) {
    if (faites.has(nom)) continue;
    const sql = await readFile(path.join(dossier, nom), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into migrations (nom) values ($1)", [nom]);
      await client.query("commit");
      console.log(`migration appliquée : ${nom}`);
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
} finally {
  await client.end();
}
