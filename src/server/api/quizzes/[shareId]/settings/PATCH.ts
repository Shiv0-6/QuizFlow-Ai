import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { quizzes } from '../../../../db/schema.js';
import type { QuizSettings } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const { settings, creatorToken } = req.body as { settings: QuizSettings; creatorToken: string };

    if (!creatorToken) {
      return res.status(401).json({ error: 'unauthorized', message: 'Creator token required.' });
    }

    const quiz = await db.select().from(quizzes)
      .where(and(eq(quizzes.shareId, shareId), eq(quizzes.creatorToken, creatorToken)))
      .limit(1);

    if (!quiz.length) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found or invalid token.' });
    }

    await db.update(quizzes).set({ settings }).where(eq(quizzes.shareId, shareId));

    return res.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/quizzes/:shareId/settings]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
