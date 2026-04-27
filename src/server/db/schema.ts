import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export interface QuizSettings {
  showLeaderboard: boolean;
  showAnswers: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  timeLimitSeconds: number;
  allowRetake: boolean;
  requireName: boolean;
}

export const defaultSettings: QuizSettings = {
  showLeaderboard: true,
  showAnswers: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  timeLimitSeconds: 0,
  allowRetake: true,
  requireName: true,
};

export const quizzes = sqliteTable('quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shareId: text('share_id').notNull().unique(),
  creatorToken: text('creator_token').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  settings: text('settings', { mode: 'json' }).$type<QuizSettings>(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  questionText: text('question_text').notNull(),
  optionA: text('option_a').notNull(),
  optionB: text('option_b').notNull(),
  optionC: text('option_c').notNull(),
  optionD: text('option_d').notNull(),
  correctOption: integer('correct_option').notNull(),
  explanation: text('explanation'),
});

export const attempts = sqliteTable('attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quizId: integer('quiz_id').notNull(),
  participantName: text('participant_name').notNull(),
  score: integer('score').notNull().default(0),
  totalQuestions: integer('total_questions').notNull(),
  timeTakenSeconds: integer('time_taken_seconds').notNull().default(0),
  completedAt: text('completed_at').default(sql`CURRENT_TIMESTAMP`),
});

export const responses = sqliteTable('responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attemptId: integer('attempt_id').notNull(),
  questionId: integer('question_id').notNull(),
  selectedOption: integer('selected_option').notNull(),
  isCorrect: integer('is_correct').notNull(),
});

export const guides = sqliteTable('guides', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shareId: text('share_id').notNull().unique(),
  creatorToken: text('creator_token').notNull(),
  title: text('title').notNull(),
  overview: text('overview'),
  sections: text('sections', { mode: 'json' }).notNull(),
  keyConcepts: text('key_concepts', { mode: 'json' }).notNull(),
  summary: text('summary'),
  readingTime: text('reading_time'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
