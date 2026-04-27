import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { quizzes, questions, defaultSettings } from '../../../db/schema.js';
import { eq, asc } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { shareId } = req.params;

    const quiz = await db.select().from(quizzes).where(eq(quizzes.shareId, shareId)).limit(1);
    if (!quiz.length) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found.' });
    }

    const qs = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quiz[0].id))
      .orderBy(asc(questions.orderIndex));

    const settings = { ...defaultSettings, ...(quiz[0].settings ?? {}) };

    // Shuffle questions if setting enabled
    let orderedQs = [...qs];
    if (settings.shuffleQuestions) {
      orderedQs = orderedQs.sort(() => Math.random() - 0.5);
    }

    // Return questions WITHOUT correct answers (for quiz-taking)
    const sanitized = orderedQs.map((q) => {
      const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
      if (settings.shuffleOptions) {
        // Shuffle but track new correct index
        const indexed = opts.map((o, i) => ({ o, i })).sort(() => Math.random() - 0.5);
        return {
          id: q.id,
          question: q.questionText,
          options: indexed.map((x) => x.o),
          // Don't expose correct answer here — handled server-side on submit
        };
      }
      return {
        id: q.id,
        question: q.questionText,
        options: opts,
      };
    });

    return res.json({
      shareId: quiz[0].shareId,
      title: quiz[0].title,
      description: quiz[0].description,
      questionCount: qs.length,
      questions: sanitized,
      settings,
      createdAt: quiz[0].createdAt,
    });
  } catch (error) {
    console.error('[GET /api/quizzes/:shareId]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
