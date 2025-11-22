import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { ParsedData } from '../types/transcript';

const execAsync = promisify(exec);

// Get __dirname equivalent for both compiled JS and TS source
const getDirname = (): string => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  // Fallback: use process.cwd() and assume we're in Back-End/utils
  // In compiled JS, __dirname will be available
  // This line is unreachable in CommonJS test environment but needed for ES modules
  /* istanbul ignore next */
  return path.join(process.cwd(), 'utils');
};

/**
 * TranscriptParser - A utility class to parse academic transcripts from PDF format
 *
 * This parser extracts program information, semesters, courses, and transfer/exempted courses
 * from transcript PDFs using PyMuPDF-based Python parser for accurate extraction.
 *
 * @example
 * ```typescript
 * const parser = new TranscriptParser();
 * const data = await parser.parseFromFile('/path/to/transcript.pdf');
 * console.log(data.programInfo);
 * console.log(data.semesters);
 * ```
 */
export class TranscriptParser {
  /**
   * Parse a transcript from a PDF file path
   * Uses PyMuPDF-based Python parser for accurate extraction
   */
  async parseFromFile(filePath: string): Promise<ParsedData> {
    try {
      return await this.parseFromFilePython(filePath);
    } catch (error) {
      throw new Error(
        `Failed to parse transcript file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Parse transcript using Python script with PyMuPDF
   */
  private async parseFromFilePython(
    filePath: string,
  ): Promise<ParsedData> {
    const scriptDir = getDirname();
    const backendDir = path.resolve(scriptDir, '..');
    const pythonScriptPath = path.join(
      backendDir,
      'python',
      'transcriptParser.py',
    );

    // Verify script exists
    if (!fs.existsSync(pythonScriptPath)) {
      throw new Error(`Python script not found at: ${pythonScriptPath}`);
    }

    const command = `python3 "${pythonScriptPath}" "${filePath}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('WARNING')) {
        /* istanbul ignore next */ // Difficult to test with promisify(exec) mock - requires specific callback format
        throw new Error(`Python script error: ${stderr}`);
      }

      const result = JSON.parse(stdout);

      return result as ParsedData;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('python3') || error.message.includes('PyMuPDF'))
      ) {
        throw new Error(
          'Python 3 and PyMuPDF are required. Install with: pip install pymupdf',
        );
      }
      throw error;
    }
  }
}

export default TranscriptParser;
