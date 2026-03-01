import { CourseData } from '@controllers/courseController';
import { CoursePoolData } from '@controllers/coursepoolController';
import { DegreeData } from '@shared/degree';
import { ParsedData } from '../types/transcript';
import { PYTHON_SERVICE_BASE_URL } from '@utils/constants';
import axios from 'axios';
import FormData from 'form-data';

export interface ParseDegreeResponse {
  degree: DegreeData;
  coursePools: Array<CoursePoolData>;
}

/**
 * Call Python service to get names of all supported degrees for scraping
 * @returns Promise resolving to parsed degree data
 */
export async function getDegreeNames(): Promise<string[]> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_BASE_URL}/degree-names`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to get degree names: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to get degree names: ${error.message || error}`);
  }
}

/**
 * Call Python service to scrape degree requirements based on degree name
 * @param name - The name of the degree to scrape
 * @returns Promise resolving to parsed degree data
 */
export async function parseDegree(name: string): Promise<ParseDegreeResponse> {
  try {
    const response = await axios.get(
      `${PYTHON_SERVICE_BASE_URL}/scrape-degree`,
      {
        params: { name },
      },
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to parse degree: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to parse degree: ${error.message || error}`);
  }
}

/**
 * Call Python service to scrape all degree defined in python_utils
 * @returns Promise resolving to parsed degree data
 */
export async function parseAllDegrees(): Promise<ParseDegreeResponse[]> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_BASE_URL}/scrape-all-degrees`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to parse all degrees: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to parse all degrees: ${error.message || error}`);
  }
}

/**
 * Call Python service to get all courses scraped from Concordia website
 * @returns Promise resolving to parsed course data
 */
export async function getAllCourses(): Promise<CourseData[]> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_BASE_URL}/get-all-courses`);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to get all courses: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to get all courses: ${error.message || error}`);
  }
}

export async function getCourseSchedule(subject: string, catalog: string): Promise<CourseData[]> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_BASE_URL}/get-course-schedule`, {
      params: { subject, catalog }
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to get course schedule: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to get course schedule: ${error.message || error}`);
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
  } catch (error: any) {
    if (error.response) {
      const status = error.response?.status;
      const data = error.response?.data;
      throw new Error(`Failed to parse transcript: status=${status}, data=${JSON.stringify(data)}, message=${error.message}`);
    }
    throw new Error(`Failed to parse transcript: ${error.message || error}`);
  }
}
