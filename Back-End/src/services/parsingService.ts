import { parseTranscript } from '../utils/pythonUtilsApi';
import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';
import { ParsedData } from '../types/transcript';


export async function parseFile(fileBuffer: Buffer) {
    //Use pdf-parse to detect document type
    const pdfParseData = await pdfParse(fileBuffer);
    const cleanText = pdfParseData.text;
  
    if (!cleanText || cleanText.trim().length === 0) {
        throw new Error('No text extracted from PDF.');
    }

    // Check if the text contains keywords specific to acceptance letters
    if (cleanText.toLowerCase().includes('offer of admission')) {
        const parser = new AcceptanceLetterParser();
       return parser.parse(cleanText);
    }
    // Check if the text contains keywords specific to transcripts
    else if (cleanText.toLowerCase().includes('student record')) {
        const transcript: ParsedData = await parseTranscript(fileBuffer);
        const normalizedTranscript = normalizeCWTCourses(transcript);
        return normalizedTranscript;
    }else{
        throw new Error ('Uploaded PDF is neither a valid transcript nor an acceptance letter.')
    }

}

function normalizeCWTCourses(transcript: ParsedData): ParsedData {
    // Convert CWTE and CWTC to CWT in course codes
    const cwtCourseCodeRegex = /CWT[EC]?\s*\d{3}/i;

    if (transcript.semesters) {
        for (const semester of transcript.semesters) {
            for (const course of semester.courses) {
                if (cwtCourseCodeRegex.test(course.code)) {
                    course.code = course.code.replace(/CWT[EC]?/i, 'CWT').replaceAll(/\s+/g, '');
                }
            }
        }
    }
    return transcript;
}