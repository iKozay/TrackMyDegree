import { Request, Response } from 'express';
import { TranscriptParser } from '@utils/transcriptParser';
import HTTP from '@utils/httpCodes';
import type { ParsePDFResponse } from '../types/transcript';
import multer from 'multer';

import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';
import { ParsedData } from '../types/parsedData';

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Controller for handling transcript parsing operations
 */
class PDFParsingController {
  /**
   * Parse uploaded transcript PDF
   * @route POST /api/upload/parse
   */
  async parseDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Step 1: Use pdf-parse to get clean text with correct reading order
      const pdfParseData = await pdfParse(req.file.buffer);
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
        const parser = new TranscriptParser();
        data = await parser.parse(req.file.buffer, cleanText);
      } else {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message:
            'Uploaded PDF is neither a valid transcript nor an acceptance letter.',
        });
        return;
      }
      const response: ParsePDFResponse = {
        success: true,
        message: 'Document parsed successfully',
        data: formatData(data),
      };

      res.status(HTTP.OK).json(response);
    } catch (error) {
      res.status(HTTP.SERVER_ERR).json({
        success: false,
        message: 'Failed to parse transcript',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

//temporary function to fit the format that the front end expect
//To be removed when the timeline logic is moved to the back end
function formatData(parsedData: ParsedData) {
  let details = {};
  let programInfo = parsedData.programInfo;
  if (programInfo)
    details = {
      degreeConcentration: programInfo.degree,
      coopProgram: programInfo.isCoop || false,
      extendedCreditProgram: programInfo.isExtendedCreditProgram || false,
      startingTerm: programInfo.firstTerm || null,
      expectedGraduationTerm: programInfo.lastTerm || null,
      minimumProgramLength:
        programInfo.minimumProgramLength?.toString() || null,
    };

  const extractedCourses: {
    term: string;
    courses: string[];
    grade: string | null;
  }[] = [];
  if (!parsedData.coursesTaken?.length) {
    let terms = generateTerms(programInfo?.firstTerm, programInfo?.lastTerm);
    terms.forEach((term: string) => {
      extractedCourses.push({
        term: term.trim(),
        courses: [],
        grade: null,
      });
    });
  } else {
    for (const semester of parsedData.coursesTaken) {
      extractedCourses.push({
        term: semester.term,
        courses: semester.courses.map((t) => t.code),
        grade: null,
      });
    }
  }
  if (parsedData.transferedCourses && parsedData.transferedCourses.length > 0) {
    extractedCourses.push({
      term: 'transfer credits',
      courses: parsedData.transferedCourses,
      grade: null,
    });
  }
  if (parsedData.deficiencyCourses && parsedData.deficiencyCourses.length > 0) {
    extractedCourses.push({
      term: 'deficiency',
      courses: parsedData.deficiencyCourses,
      grade: null,
    });
  }
  if (parsedData.exemptedCourses && parsedData.exemptedCourses.length > 0) {
    extractedCourses.push({
      term: 'exemptions',
      courses: parsedData.exemptedCourses,
      grade: null,
    });
  }
  return { extractedCourses, details };
}
function generateTerms(
  startTerm: string | undefined,
  endTerm: string | undefined,
) {
  const terms = ['Winter', 'Summer', 'Fall'];
  if (!startTerm || typeof startTerm !== 'string') return [];
  const startYear = Number.parseInt(startTerm.split(' ')[1]); // Extracting the year
  const startSeason = startTerm.split(' ')[0]; // Extracting the season
  let endYear, endSeason;
  if (!endTerm || typeof endTerm !== 'string') {
    endYear = startYear + 2;
    endSeason = startSeason;
  } else {
    endYear = Number.parseInt(endTerm.split(' ')[1]); // Extracting the year
    endSeason = endTerm.split(' ')[0]; // Extracting the season
  }

  const resultTerms = [];

  let currentYear = startYear;
  let currentSeasonIndex = terms.indexOf(startSeason); // Find index of start season in the list

  // Loop to generate all terms from start to end
  while (
    currentYear < endYear ||
    (currentYear === endYear && currentSeasonIndex <= terms.indexOf(endSeason))
  ) {
    const term = `${terms[currentSeasonIndex]} ${currentYear}`;
    resultTerms.push(term);

    // Move to the next season
    currentSeasonIndex++;

    if (currentSeasonIndex === terms.length) {
      currentSeasonIndex = 0;
      currentYear++;
    }
  }
  // console.log("terms:", resultTerms)
  return resultTerms;
}

const pdfParsingController = new PDFParsingController();
export const uploadMiddleware = upload.single('file');
export default pdfParsingController;
