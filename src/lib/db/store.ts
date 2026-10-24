import type { BaseDoc, Collection } from "../types";

export type StorageMode = "postgres" | "local";

/** Minimal document store used by the whole app. Every backend implements it. */
export interface Store {
  mode: StorageMode;
  list<T extends BaseDoc>(collection: Collection): Promise<T[]>;
  get<T extends BaseDoc>(collection: Collection, id: string): Promise<T | null>;
  insert<T extends BaseDoc>(collection: Collection, doc: T): Promise<T>;
  update<T extends BaseDoc>(collection: Collection, id: string, patch: Partial<T>): Promise<T>;
  remove(collection: Collection, id: string): Promise<void>;
}
