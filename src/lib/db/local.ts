import fs from "node:fs";
import path from "node:path";
import type { BaseDoc, Collection } from "../types";
import { COLLECTIONS } from "../types";
import type { Store } from "./store";

type Data = Record<Collection, BaseDoc[]>;

// Runtime data, not a build input: keep Turbopack from tracing it into the bundle.
const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/**
 * Used when DATABASE_URL is not set: documents are kept in memory and in data/db.json.
 */
export class LocalStore implements Store {
  mode = "local" as const;
  private data: Data;

  constructor() {
    this.data = Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as Data;
    if (fs.existsSync(DB_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<Data>;
      for (const c of COLLECTIONS) this.data[c] = saved[c] ?? [];
    }
  }

  private persist() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, DB_FILE);
  }

  async list<T extends BaseDoc>(c: Collection): Promise<T[]> {
    return this.data[c].map((d) => structuredClone(d)) as T[];
  }

  async get<T extends BaseDoc>(c: Collection, id: string): Promise<T | null> {
    const d = this.data[c].find((x) => x.id === id);
    return d ? (structuredClone(d) as T) : null;
  }

  async insert<T extends BaseDoc>(c: Collection, doc: T): Promise<T> {
    this.data[c].push(structuredClone(doc));
    this.persist();
    return doc;
  }

  async update<T extends BaseDoc>(c: Collection, id: string, patch: Partial<T>): Promise<T> {
    const i = this.data[c].findIndex((x) => x.id === id);
    if (i < 0) throw new Error(`${c}/${id} not found`);
    const next = { ...this.data[c][i], ...structuredClone(patch), id, updatedAt: new Date().toISOString() };
    this.data[c][i] = next;
    this.persist();
    return structuredClone(next) as T;
  }

  async remove(c: Collection, id: string): Promise<void> {
    this.data[c] = this.data[c].filter((x) => x.id !== id);
    this.persist();
  }
}
