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

export default async function handler(req: Request, res: Response) {
  const apiKey = getSecret('OPENROUTER_API_KEY') || getSecret('OPENAI_API_KEY');
  const placeholderKey = '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';

  if (!apiKey || apiKey === placeholderKey) {
    return res.status(503).json({
      error: 'no_api_key',
      message: 'You are using a placeholder API key. Please replace it with your personal key from openrouter.ai in the .env file.',
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
- Analyze the entire provided text and identify ALL major topics, sub-topics, and key concepts.
- Organize these into logical sections. **IMPORTANT: Do not skip any significant topics found in the text.**
- Distill the information for each topic into a clear, concise format suitable for quick revision, but ensure full coverage of the source material.
- Focus on definitions, core principles, and relationships between concepts.
- Use engaging, educational language.

Rules:
- Return ONLY a valid JSON object.
- Avoid markdown formatting outside of the JSON values.`;

  const userPrompt = `Generate a comprehensive and complete study guide from this text/topic. Ensure that every single topic and important sub-point mentioned in the text is included as a section in the guide:

"""
${text.slice(0, 50000)}
"""

Return ONLY a JSON object with this exact structure:
{
  "title": "Title of the topic",
  "overview": "A brief 2-3 sentence overview of the topic",
  "sections": [
    {
      "heading": "Section Heading (Topic Name)",
      "content": "Comprehensive yet concise explanation for this topic (markdown supported for bold/italics/lists). Ensure all sub-points of this topic are covered."
    }
  ],
  "keyConcepts": ["Concept 1", "Concept 2", "... (Include all key terms/definitions)"],
  "summary": "Final wrap-up summary",
  "estimatedReadingTime": "X mins"
}`;

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
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch {
      console.error('[generate-study-guide] Raw response:', raw);
      return res.status(500).json({ error: 'parse_error', message: 'Failed to parse AI response. Please try again.' });
    }
  } catch (err: unknown) {
    console.error('[generate-study-guide] OpenRouter Error Details:', JSON.stringify(err, null, 2));
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'generation_failed', message: `Failed to generate study guide: ${message}` });
  }
}
