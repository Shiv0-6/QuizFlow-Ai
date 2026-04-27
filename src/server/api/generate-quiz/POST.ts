import type { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

function getSecret(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
    const match = envFile.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default async function handler(req: Request, res: Response) {
  const apiKey = getSecret('OPENROUTER_API_KEY');
  const placeholderKey = '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';

  if (!apiKey || apiKey === placeholderKey) {
    return res.status(503).json({
      error: 'no_api_key',
      message: 'You are using a placeholder API key. Please replace it with your personal key from openrouter.ai in the .env file.',
    });
  }

  const { text, count = 5 } = req.body as { text: string; count?: number };

  if (!text || typeof text !== 'string' || text.trim().length < 30) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Please provide at least 30 characters of text to generate a quiz from.',
    });
  }

  const questionCount = Math.min(Math.max(Number(count) || 10, 3), 20);

  // OpenAI SDK works with OpenRouter by swapping the base URL
  const client = new OpenAI({
    apiKey: String(apiKey),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://quizflow.ai',
      'X-Title': 'QuizFlow AI',
    },
  });

  const systemPrompt = `You are an expert quiz generator. Given a passage of text, you extract key concepts and create clear, educational multiple-choice questions.

Rules:
- Generate exactly ${questionCount} questions
- **Ensure the questions cover ALL major topics and sub-topics found in the text.**
- Each question must have exactly 4 answer options
- Only one option is correct
- The correct field is the 0-based index of the correct option
- Explanations should be concise (1-2 sentences) and educational
- Questions should test genuine understanding, not trivial recall
- Vary question difficulty: mix easy, medium, and hard questions
- Return ONLY a valid JSON array, no markdown, no extra text, no code fences`;

  const userPrompt = `Generate ${questionCount} multiple-choice quiz questions from this text. Ensure the questions are distributed across all the different topics mentioned in the text:

"""
${text.slice(0, 50000)}
"""

Return ONLY a JSON array with this exact structure (no markdown, no code fences):
[
  {
    "id": 1,
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correct": 0,
    "explanation": "..."
  }
]`;

  try {
    const completion = await client.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = (completion.choices[0]?.message?.content ?? '').trim();

    // Strip markdown code fences if model wraps response in them
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[generate-quiz] Raw response:', raw);
      return res.status(500).json({ error: 'parse_error', message: 'Failed to parse AI response. Please try again.' });
    }

    // Handle both { questions: [...] } and direct array responses
    const questions: QuizQuestion[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>).questions)
      ? ((parsed as Record<string, unknown>).questions as QuizQuestion[])
      : [];

    if (!questions.length) {
      return res.status(500).json({ error: 'empty_response', message: 'AI returned no questions. Please try again.' });
    }

    // Validate and sanitize
    const validated = questions
      .filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct === 'number' &&
          q.correct >= 0 &&
          q.correct <= 3
      )
      .map((q, i) => ({ ...q, id: i + 1 }));

    if (!validated.length) {
      return res.status(500).json({ error: 'invalid_questions', message: 'AI returned malformed questions. Please try again.' });
    }

    return res.json({ questions: validated });
  } catch (err: unknown) {
    console.error('[generate-quiz] OpenRouter Error Details:', JSON.stringify(err, null, 2));
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('401') || message.includes('Unauthorized')) {
      return res.status(401).json({ error: 'invalid_api_key', message: 'Invalid OpenRouter API key. Please check your key in Settings.' });
    }
    if (message.includes('429')) {
      return res.status(429).json({ error: 'rate_limit', message: 'Rate limit reached. Please try again in a moment.' });
    }

    return res.status(500).json({ error: 'generation_failed', message: `Failed to generate quiz: ${message}` });
  }
}
