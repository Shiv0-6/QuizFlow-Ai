import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { quizzes, questions, attempts } from '../../../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const { token } = req.query as { token?: string };

    // Get quiz and verify creator token
    const quiz = await db.select().from(quizzes).where(eq(quizzes.shareId, shareId)).limit(1);
    if (!quiz.length) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found.' });
    }

    if (!token || token !== quiz[0].creatorToken) {
      return res.status(403).json({ error: 'forbidden', message: 'Invalid or missing creator token.' });
    }

    // Get all attempts
    const allAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.quizId, quiz[0].id))
      .orderBy(desc(attempts.completedAt));

    // Get questions for context
    const qs = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quiz[0].id))
      .orderBy(asc(questions.orderIndex));

    const totalAttempts = allAttempts.length;
    const avgScore = totalAttempts
      ? Math.round(allAttempts.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / totalAttempts)
      : 0;
    const highScore = totalAttempts ? Math.max(...allAttempts.map((a) => a.score)) : 0;

    return res.json({
      quiz: {
        shareId: quiz[0].shareId,
        title: quiz[0].title,
        description: quiz[0].description,
        questionCount: qs.length,
        createdAt: quiz[0].createdAt,
      },
      stats: {
        totalAttempts,
        avgScore,
        highScore,
        totalQuestions: qs.length,
      },
      attempts: allAttempts.map((a) => ({
        id: a.id,
        participantName: a.participantName,
        score: a.score,
        totalQuestions: a.totalQuestions,
        percentage: Math.round((a.score / a.totalQuestions) * 100),
        timeTakenSeconds: a.timeTakenSeconds,
        completedAt: a.completedAt,
      })),
    });
  } catch (error) {
    console.error('[GET /api/quizzes/:shareId/results]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
