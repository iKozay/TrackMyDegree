import { CourseData } from '@controllers/courseController';
import { CoursePoolData } from '@controllers/coursepoolController';
import { DegreeData } from '@shared/degree';
import { ParsedData } from '../types/transcript';
import { PYTHON_SERVICE_BASE_URL } from '@utils/constants';
import axios from 'axios';
import FormData from 'form-data';

export interface ParseDegreeResponse {
  degree: DegreeData;
  course_pool: Array<CoursePoolData>;
  courses: Array<CourseData>;
}

/**
 * Call Python service to scrape degree requirements from a URL
 * @param url - The URL of the degree requirements page to scrape
 * @returns Promise resolving to parsed degree data
 */
export async function parseDegree(url: string): Promise<ParseDegreeResponse> {
  try {
    const response = await axios.get(
      `${PYTHON_SERVICE_BASE_URL}/scrape-degree`,
      {
        params: { url },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to parse degree: ${error}`);
  }
}

/**
 * Call Python service to parse a transcript PDF file
 * @param fileBuffer - Buffer containing the PDF file data
 * @returns Promise resolving to parsed transcript data
 */
export async function parseTranscript(fileBuffer: Buffer): Promise<ParsedData> {
  try {
    // Create form data with the PDF file
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: 'transcript.pdf',
      contentType: 'application/pdf',
    });

    const response = await axios.post(
      `${PYTHON_SERVICE_BASE_URL}/parse-transcript`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(`Failed to parse transcript: ${error}`);
  }
}
