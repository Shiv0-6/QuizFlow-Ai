import type { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

function getSecret(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
    const match = envFile.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

export default async function handler(req: Request, res: Response) {
  const apiKey = getSecret('OPENROUTER_API_KEY');

  if (!apiKey) {
    return res.status(503).json({
      error: 'no_api_key',
      message: 'OpenRouter API key is not configured.',
    });
  }

  const { text } = req.body as { text: string };

  if (!text || typeof text !== 'string' || text.trim().length < 30) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Please provide at least 30 characters of text to generate a study guide from.',
    });
  }

  const client = new OpenAI({
    apiKey: String(apiKey),
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://quizflow.ai',
      'X-Title': 'QuizFlow AI',
    },
  });

  const systemPrompt = `You are an expert AI tutor specialized in distilling complex, long-form content (like PDF notes) into high-impact, structured study guides.
  
Goal:
- Take extensive text (potentially many pages) and condense it into a clear 1-2 page equivalent summary.
- Organize information into logical blocks and sections.
- Focus on "must-know" information, definitions, and relationships between concepts.
- Use engaging, educational language.

Rules:
- Return ONLY a valid JSON object.
- Avoid markdown formatting outside of the JSON values.`;

  const userPrompt = `Generate a comprehensive study guide from this text/topic:

"""
${text.slice(0, 4000)}
"""

Return ONLY a JSON object with this exact structure:
{
  "title": "Title of the topic",
  "overview": "A brief 2-3 sentence overview of the topic",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Detailed explanation for this section (markdown supported for bold/italics/lists)"
    }
  ],
  "keyConcepts": ["Concept 1", "Concept 2", "..."],
  "summary": "Final wrap-up summary",
  "estimatedReadingTime": "X mins"
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'openai/gpt-3.5-turbo', // Faster and good for text generation
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = (completion.choices[0]?.message?.content ?? '').trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch {
      console.error('[generate-study-guide] Raw response:', raw);
      return res.status(500).json({ error: 'parse_error', message: 'Failed to parse AI response. Please try again.' });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[generate-study-guide] OpenRouter error:', message);
    return res.status(500).json({ error: 'generation_failed', message: 'Failed to generate study guide. Please try again.' });
  }
}
