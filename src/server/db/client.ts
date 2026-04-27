import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

// Create SQLite connection
const sqlite = new Database('local.db');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

export async function testConnection(): Promise<boolean> {
  return true;
}

export async function closeConnection(): Promise<void> {
  sqlite.close();
}
