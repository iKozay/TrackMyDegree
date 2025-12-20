import { parseTranscript } from '../utils/pythonUtilsApi';
import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';


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
        return await parseTranscript(fileBuffer);
    }else{
        throw new Error ('Uploaded PDF is neither a valid transcript nor an acceptance letter.')
    }

}