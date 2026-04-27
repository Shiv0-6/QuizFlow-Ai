import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { quizzes, questions, defaultSettings } from '../../db/schema.js';
import type { QuizSettings } from '../../db/schema.js';
import { ensureSchema } from '../../db/migrate.js';
import crypto from 'crypto';

let schemaReady = false;

interface QuestionInput {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

function generateId(len: number) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

export default async function handler(req: Request, res: Response) {
  // Ensure schema is ready (idempotent — safe to call multiple times)
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }

  try {
    const { title, description, questions: qs, settings } = req.body as {
      title: string;
      description?: string;
      questions: QuestionInput[];
      settings?: Partial<QuizSettings>;
    };

    if (!title || !qs || !Array.isArray(qs) || qs.length === 0) {
      return res.status(400).json({ error: 'invalid_input', message: 'Title and at least one question are required.' });
    }

    for (const q of qs) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || typeof q.correct !== 'number') {
        return res.status(400).json({ error: 'invalid_question', message: 'Each question needs text, 4 options, and a correct index.' });
      }
    }

    const mergedSettings: QuizSettings = { ...defaultSettings, ...(settings ?? {}) };

    const shareId = generateId(8);
    const creatorToken = generateId(32);

    const result = await db.insert(quizzes).values({
      shareId,
      creatorToken,
      title: title.slice(0, 255),
      description: description ?? null,
      settings: mergedSettings,
    }).returning({ id: quizzes.id });

    const quizId = result[0].id;

    const questionRows = qs.map((q, i) => ({
      quizId,
      orderIndex: i,
      questionText: q.question,
      optionA: q.options[0],
      optionB: q.options[1],
      optionC: q.options[2],
      optionD: q.options[3],
      correctOption: q.correct,
      explanation: q.explanation ?? null,
    }));

    await db.insert(questions).values(questionRows);

    return res.status(201).json({
      shareId,
      creatorToken,
      quizUrl: `/quiz/${shareId}`,
      resultsUrl: `/results/${shareId}?token=${creatorToken}`,
    });
  } catch (error) {
    console.error('[POST /api/quizzes]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
