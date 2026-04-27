/**
 * GET /api/quizzes/:shareId/questions/:questionId/check
 *
 * Returns the correct answer + explanation for a single question.
 * Called immediately after the user selects an option, so the UI can
 * reveal the correct option in real-time (when showAnswers is enabled).
 *
 * No auth required — the correct answer is public knowledge once the
 * quiz is being taken. The quiz creator controls visibility via the
 * `showAnswers` setting, which the frontend respects.
 */
import type { Request, Response } from 'express';
import { db } from '../../../../../../db/client.js';
import { questions, quizzes } from '../../../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  const { shareId, questionId } = req.params;
  const qId = parseInt(questionId, 10);

  if (isNaN(qId)) {
    return res.status(400).json({ error: 'invalid_id', message: 'Invalid question ID.' });
  }

  try {
    // Verify the quiz exists
    const [quiz] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.shareId, shareId))
      .limit(1);

    if (!quiz) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found.' });
    }

    // Fetch the question (must belong to this quiz)
    const [question] = await db
      .select({
        id: questions.id,
        correctOption: questions.correctOption,
        explanation: questions.explanation,
      })
      .from(questions)
      .where(and(eq(questions.id, qId), eq(questions.quizId, quiz.id)))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: 'not_found', message: 'Question not found.' });
    }

    return res.json({
      questionId: question.id,
      correctOption: question.correctOption,
      explanation: question.explanation ?? null,
    });
  } catch (error) {
    console.error('[GET /api/quizzes/:shareId/questions/:questionId/check]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
