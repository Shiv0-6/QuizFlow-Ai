import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { quizzes, attempts } from '../../../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { defaultSettings } from '../../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { shareId } = req.params;

    const quiz = await db.select().from(quizzes).where(eq(quizzes.shareId, shareId)).limit(1);
    if (!quiz.length) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found.' });
    }

    const settings = { ...defaultSettings, ...(quiz[0].settings ?? {}) };

    // Only expose leaderboard if the setting is enabled
    if (!settings.showLeaderboard) {
      return res.json({ enabled: false, entries: [] });
    }

    const allAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.quizId, quiz[0].id))
      .orderBy(desc(attempts.score));

    // Top 10, sorted by score desc then time asc
    const sorted = [...allAttempts].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    }).slice(0, 10);

    return res.json({
      enabled: true,
      totalAttempts: allAttempts.length,
      entries: sorted.map((a, i) => ({
        rank: i + 1,
        participantName: a.participantName,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: Math.round((a.score / a.totalQuestions) * 100),
        timeTakenSeconds: a.timeTakenSeconds,
      })),
    });
  } catch (error) {
    console.error('[GET /api/quizzes/:shareId/leaderboard]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
