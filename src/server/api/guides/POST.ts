import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { guides } from '../../db/schema.js';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
  const { title, overview, sections, keyConcepts, summary, readingTime } = req.body;

  if (!title || !sections || !keyConcepts) {
    return res.status(400).json({ error: 'invalid_input', message: 'Missing required guide data.' });
  }

  const shareId = nanoid(10);
  const creatorToken = crypto.randomBytes(24).toString('hex');

  try {
    await db.insert(guides).values({
      shareId,
      creatorToken,
      title,
      overview,
      sections,
      keyConcepts,
      summary,
      readingTime,
    });

    return res.status(201).json({
      shareId,
      creatorToken,
    });
  } catch (err) {
    console.error('[create-guide] Database error:', err);
    return res.status(500).json({ error: 'db_error', message: 'Failed to save study guide.' });
  }
}
