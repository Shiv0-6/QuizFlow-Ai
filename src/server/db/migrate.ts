import { db } from './client.js';
import { sql } from 'drizzle-orm';

export async function ensureSchema(): Promise<void> {
  try {
    // ── quizzes ──────────────────────────────────────────────────────────
    db.run(sql`
      CREATE TABLE IF NOT EXISTS quizzes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        share_id     TEXT NOT NULL UNIQUE,
        creator_token TEXT NOT NULL,
        title        TEXT NOT NULL,
        description  TEXT,
        settings     TEXT,
        created_at   TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    try {
      db.run(sql`ALTER TABLE quizzes ADD COLUMN settings TEXT`);
    } catch {}

    // ── questions ────────────────────────────────────────────────────────
    db.run(sql`
      CREATE TABLE IF NOT EXISTS questions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id        INTEGER NOT NULL,
        order_index    INTEGER NOT NULL DEFAULT 0,
        question_text  TEXT NOT NULL,
        option_a       TEXT NOT NULL,
        option_b       TEXT NOT NULL,
        option_c       TEXT NOT NULL,
        option_d       TEXT NOT NULL,
        correct_option INTEGER NOT NULL,
        explanation    TEXT
      )
    `);

    // ── attempts ─────────────────────────────────────────────────────────
    db.run(sql`
      CREATE TABLE IF NOT EXISTS attempts (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_id           INTEGER NOT NULL,
        participant_name  TEXT NOT NULL,
        score             INTEGER NOT NULL DEFAULT 0,
        total_questions   INTEGER NOT NULL,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        completed_at      TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── responses ────────────────────────────────────────────────────────
    db.run(sql`
      CREATE TABLE IF NOT EXISTS responses (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id       INTEGER NOT NULL,
        question_id      INTEGER NOT NULL,
        selected_option  INTEGER NOT NULL,
        is_correct       INTEGER NOT NULL
      )
    `);

    // ── guides ───────────────────────────────────────────────────────────
    db.run(sql`
      CREATE TABLE IF NOT EXISTS guides (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        share_id        TEXT NOT NULL UNIQUE,
        creator_token   TEXT NOT NULL,
        title           TEXT NOT NULL,
        overview        TEXT,
        sections        TEXT NOT NULL,
        key_concepts    TEXT NOT NULL,
        summary         TEXT,
        reading_time    TEXT,
        created_at      TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[DB] Schema ready');
  } catch (error) {
    console.error('[DB] Schema migration error:', error);
  }
}
