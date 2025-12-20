import { TranscriptParser } from '@utils/transcriptParser';
import fs from 'node:fs';
import path from 'node:path';

import { promisify } from 'node:util';
import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';
import { randomUUID } from 'node:crypto';


export async function parseFile(fileBuffer: Buffer) {
    //Use pdf-parse to detect document type
    const pdfParseData = await pdfParse(fileBuffer);
    const cleanText = pdfParseData.text;
  
    if (!cleanText || cleanText.length === 0) {
        throw new Error('No text extracted from PDF.');
    }

    // Check if the text contains keywords specific to acceptance letters
    if (cleanText.toLowerCase().includes('offer of admission')) {
        const parser = new AcceptanceLetterParser();
       return parser.parse(cleanText);
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

    
        try{
            const parser = new TranscriptParser();
            return await parser.parseFromFile(tempFilePath);
        }finally {
        // Clean up temporary file
            try {
                const unlinkAsync = promisify(fs.unlink);
                await unlinkAsync(tempFilePath);
            } catch (cleanupError) {
                // Log but don't throw - cleanup errors shouldn't affect the response
                console.error('Failed to cleanup temp file:', cleanupError);
            }
        }

    }else{
        throw new Error ('Uploaded PDF is neither a valid transcript nor an acceptance letter.')
    }

}