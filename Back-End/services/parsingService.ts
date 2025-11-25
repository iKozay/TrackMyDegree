import { TranscriptParser } from '@utils/transcriptParser';
import fs from 'node:fs';
import path from 'node:path';

import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';
import { randomUUID } from 'node:crypto';

export async function parseDocument(fileBuffer: Buffer) {
    //Use pdf-parse to detect document type
    const pdfParseData = await pdfParse(fileBuffer);
    const cleanText = pdfParseData.text;
    let data;

    if (!cleanText || cleanText.length === 0) {
        throw new Error('No text extracted from PDF.');
    }

    // Check if the text contains keywords specific to acceptance letters
    if (cleanText.toUpperCase().includes('OFFER OF ADMISSION')) {
        const parser = new AcceptanceLetterParser();
        data = parser.parse(cleanText);
    }
    // Check if the text contains keywords specific to transcripts
    else if (cleanText.toLowerCase().includes('student record')) {
        let tempFilePath: string | null = null;
        // Write buffer to temporary file for Python parser
        tempFilePath = path.join(
            '/tmp',
            `transcript_${Date.now()}_${randomUUID()}.pdf`,
        );
        fs.writeFileSync(tempFilePath, fileBuffer);

        const parser = new TranscriptParser();
        data = await parser.parseFromFile(tempFilePath);
    }
    return data;
}