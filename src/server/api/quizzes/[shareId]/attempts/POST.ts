import type { Request, Response } from 'express';
import { db } from '../../../../db/client.js';
import { quizzes, questions, attempts, responses } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

interface AnswerInput {
  questionId: number;
  selectedOption: number; // 0-3
}

export default async function handler(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const { participantName, answers, timeTakenSeconds } = req.body as {
      participantName: string;
      answers: AnswerInput[];
      timeTakenSeconds: number;
    };

    if (!participantName?.trim()) {
      return res.status(400).json({ error: 'invalid_input', message: 'Participant name is required.' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'invalid_input', message: 'Answers are required.' });
    }

    // Get quiz
    const quiz = await db.select().from(quizzes).where(eq(quizzes.shareId, shareId)).limit(1);
    if (!quiz.length) {
      return res.status(404).json({ error: 'not_found', message: 'Quiz not found.' });
    }

    // Get questions with correct answers
    const qs = await db.select().from(questions).where(eq(questions.quizId, quiz[0].id));
    const questionMap = new Map(qs.map((q) => [q.id, q]));

    // Score the attempt
    let score = 0;

    const gradedAnswers = answers.map((a) => {
      const q = questionMap.get(a.questionId);
      const isCorrect = q ? a.selectedOption === q.correctOption : false;
      if (isCorrect) score++;
      return {
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        isCorrect: isCorrect ? 1 : 0,
        correctOption: q?.correctOption ?? -1,
        explanation: q?.explanation ?? null,
      };
    });

    // Insert attempt
    const attemptResult = await db.insert(attempts).values({
      quizId: quiz[0].id,
      participantName: participantName.trim().slice(0, 255),
      score,
      totalQuestions: qs.length,
      timeTakenSeconds: timeTakenSeconds ?? 0,
    }).returning({ id: attempts.id });

    const attemptId = attemptResult[0].id;

    // Insert responses
    if (gradedAnswers.length > 0) {
      await db.insert(responses).values(
        gradedAnswers.map((a) => ({
          attemptId,
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          isCorrect: a.isCorrect,
        }))
      );
    }

    const percentage = Math.round((score / qs.length) * 100);

    // Build full review data (question text + options + correct answer + explanation)
    const review = gradedAnswers.map((a) => {
      const q = questionMap.get(a.questionId);
      return {
        questionId: a.questionId,
        questionText: q?.questionText ?? '',
        options: [q?.optionA ?? '', q?.optionB ?? '', q?.optionC ?? '', q?.optionD ?? ''],
        selectedOption: a.selectedOption,
        correctOption: a.correctOption,
        isCorrect: a.isCorrect === 1,
        explanation: a.explanation,
      };
    });

    return res.status(201).json({
      attemptId,
      score,
      totalQuestions: qs.length,
      percentage,
      gradedAnswers,
      review,
    });
  } catch (error) {
    console.error('[POST /api/quizzes/:shareId/attempts]', error);
    return res.status(500).json({ error: 'server_error', message: String(error) });
  }
}
