import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { guides } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  const { shareId } = req.params;

  try {
    const guide = await db.query.guides.findFirst({
      where: eq(guides.shareId, shareId),
    });

    if (!guide) {
      return res.status(404).json({ error: 'not_found', message: 'Guide not found.' });
    }

    return res.json({
      title: guide.title,
      overview: guide.overview,
      sections: guide.sections,
      keyConcepts: guide.keyConcepts,
      summary: guide.summary,
      readingTime: guide.readingTime,
    });
  } catch (err) {
    console.error('[get-guide] Database error:', err);
    return res.status(500).json({ error: 'db_error', message: 'Failed to load study guide.' });
  }
}
