import type { Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single('file');

export default async function handler(req: Request, res: Response) {
  // Use a promise to handle the multer upload middleware
  const fileData: any = await new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) reject(err);
      else resolve((req as any).file);
    });
  });

  if (!fileData) {
    return res.status(400).json({ error: 'no_file', message: 'Please upload a PDF file.' });
  }

  if (fileData.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'invalid_type', message: 'Only PDF files are supported.' });
  }

  try {
    const pdfInstance = new PDFParse({ data: fileData.buffer });
    const data = await pdfInstance.getText();
    const text = data.text.trim();
    console.log(`[pdf-extraction] Extracted ${text.length} characters.`);

    if (text.length < 50) {
      return res.status(400).json({ 
        error: 'insufficient_text', 
        message: 'The PDF seems to have too little text. It might be a scanned image or empty.' 
      });
    }

    // Return the extracted text so the frontend can put it in the textarea or use it directly
    return res.json({ text });
  } catch (err) {
    console.error('[pdf-extraction] Error:', err);
    return res.status(500).json({ error: 'extraction_failed', message: 'Failed to extract text from PDF.' });
  }
}
