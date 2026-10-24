import { Pool } from "pg";
import type { BaseDoc, Collection } from "../types";
import { COLLECTIONS } from "../types";
import type { Store } from "./store";

/**
 * Azure Database for PostgreSQL backend. Each collection is a table holding the
 * document as JSONB, which keeps admin-built custom form fields schema-free.
 */
export class PostgresStore implements Store {
  mode = "postgres" as const;
  private pool: Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    const sslDisabled =
      process.env.PGSSL === "disable" || /sslmode=disable/.test(connectionString);
    this.pool = new Pool({
      connectionString: connectionString.replace(/[?&]sslmode=[^&]*/, ""),
      ssl: sslDisabled ? false : { rejectUnauthorized: false },
      max: 10,
    });
    this.ready = this.migrate();
  }

  private table(c: Collection) {
    return `emr_${c}`;
  }

  private async migrate() {
    for (const c of COLLECTIONS) {
      await this.pool.query(
        `CREATE TABLE IF NOT EXISTS ${this.table(c)} (
           id TEXT PRIMARY KEY,
           data JSONB NOT NULL,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
           updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`
      );
    }
  }

  async list<T extends BaseDoc>(c: Collection): Promise<T[]> {
    await this.ready;
    const r = await this.pool.query(`SELECT data FROM ${this.table(c)} ORDER BY created_at`);
    return r.rows.map((row) => row.data as T);
  }

  async get<T extends BaseDoc>(c: Collection, id: string): Promise<T | null> {
    await this.ready;
    const r = await this.pool.query(`SELECT data FROM ${this.table(c)} WHERE id = $1`, [id]);
    return (r.rows[0]?.data as T) ?? null;
  }

  async insert<T extends BaseDoc>(c: Collection, doc: T): Promise<T> {
    await this.ready;
    await this.pool.query(
      `INSERT INTO ${this.table(c)} (id, data, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
      [doc.id, JSON.stringify(doc), doc.createdAt, doc.updatedAt]
    );
    return doc;
  }

  async update<T extends BaseDoc>(c: Collection, id: string, patch: Partial<T>): Promise<T> {
    await this.ready;
    const current = await this.get<T>(c, id);
    if (!current) throw new Error(`${c}/${id} not found`);
    const next = { ...current, ...patch, id, updatedAt: new Date().toISOString() } as T;
    await this.pool.query(
      `UPDATE ${this.table(c)} SET data = $2, updated_at = $3 WHERE id = $1`,
      [id, JSON.stringify(next), next.updatedAt]
    );
    return next;
  }

  async remove(c: Collection, id: string): Promise<void> {
    await this.ready;
    await this.pool.query(`DELETE FROM ${this.table(c)} WHERE id = $1`, [id]);
  }
}
