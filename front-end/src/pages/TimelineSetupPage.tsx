import '../css/TimelineSetupPage.css';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Sentry from '@sentry/react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import { parsePdfFile, extractAcceptanceDetails } from '../utils/AcceptanceUtils';
import { api } from '~/frontend/api/http-api-client';
import { Degree } from '~/shared/types/apiTypes';


interface ExtractionDetails {
  degreeConcentration?: string;
  minimumProgramLength?: number;
  extendedCreditProgram?: boolean;
  coopProgram?: boolean;
  deficienciesCourses?: string[];
}

interface ExtractedData {
  results: TranscriptData[];
  details?: ExtractionDetails;
}

interface TimelineSetupPageProps {
  onDataProcessed: (data?: ProcessedData) => void;
}

interface TimelineNavigationState {
  coOp?: boolean;
  credits_Required?: number;
  extendedCredit?: boolean;
  creditDeficiency?: boolean;
}

interface GetDegreesResponse {
  degrees: Degree[];
}

//This page creates an initial timeline using either manually entered information or by parsing an acceptance letter
/**
 * TimelineSetupPage Component - Dual-mode timeline creation page
 *
 * Two creation paths:
 * 1. Manual Form: User selects degree, starting term/year, and program options (Co-op/Extended Credit)
 * 2. PDF Upload: Processes acceptance letter PDFs to auto-extract degree, terms, exemptions, and program info
 *
 * Backend Integration:
 * - Fetches available degrees from server API (/degree/getAllDegrees)
 * - Uses Sentry for error tracking
 *
 * PDF Processing (client-side):
 * - Extracts degree concentration, starting/graduation terms, co-op eligibility
 * - Identifies exempted courses, transfer credits, and credit deficiencies
 * - Validates document is an "Offer of Admission" letter
 *
 * Navigation: Redirects to TimelinePage (/timeline_change) with extracted/selected data
 * Storage: Clears previous timeline data in localStorage before processing
 */
const TimelineSetupPage: React.FC<TimelineSetupPageProps> = ({ onDataProcessed }) => {
  const isFirstRender = useRef<boolean>(true);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isFirstRender.current) {
      onDataProcessed(); // Clear old timeline data on load
      isFirstRender.current = false;
    }
  }, [onDataProcessed]);

  useEffect(() => {
    // get a list of all degrees by name
    // TODO: Add loader while fetching degrees from API
    const getDegrees = async (): Promise<void> => {
      // TODO: Add proper error handling and user feedback for API failures
      try {
        const data = await api.post<GetDegreesResponse>('/degree/getAllDegrees');

        console.log('Degrees:', data);
        setDegrees(data.degrees);
      } catch (err) {
        Sentry.captureException(err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error(errorMessage);
      }
    };
    getDegrees();
  }, []);

  const processFile = (file: File): void => {
    parsePdfFile(file).then((data: string) => {
      const extractedData: ExtractedData = extractAcceptanceDetails(data);
      const transcriptData: TranscriptData[] = extractedData.results;
      const degree: string = extractedData.details?.degreeConcentration?.toLowerCase() || 'Unknown Degree';
      const matched_degree: Degree | undefined = degrees.find(
        (d) => degree.toLowerCase().includes(d.name?.split(' ').slice(1).join(' ').toLowerCase() || ''), // remove first word (BcompsC/Beng/etc.) and match rest
      );
      const credits_Required: number | null | undefined =
        extractedData.details?.minimumProgramLength || matched_degree?.totalCredits;
      const isExtendedCredit: boolean = extractedData.details?.extendedCreditProgram || false;
      const degreeId: string = matched_degree?.id || 'Unknown';

      if (transcriptData.length > 0) {
        localStorage.removeItem('Timeline_Name');
        console.log(transcriptData);
        onDataProcessed({
          transcriptData,
          degreeId,
          isExtendedCredit,
        });

        const navigationState: TimelineNavigationState = {
          coOp: extractedData.details?.coopProgram,
          credits_Required: credits_Required ?? undefined,
          extendedCredit: extractedData.details?.extendedCreditProgram,
          creditDeficiency: (extractedData.details?.deficienciesCourses?.length ?? 0) > 0,
        };

        navigate('/timeline_change', {
          state: navigationState,
        }); // Navigate to TimelinePage
      } else {
        alert('No transcript data extracted. Please ensure the PDF is a valid transcript.');
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="top-down">
        <div className="g-container">
          <InformationForm degrees={degrees} />

          <div className="or-divider">OR</div>

          <div className="upload-container-al">
            <h2>Upload Acceptance Letter</h2>
            <p>Upload your acceptance letter to automatically fill out the required information</p>
            <UploadBox processFile={processFile} />

            <hr className="divider" />

            <p>To upload your unofficial transcript, please click here!</p>
            <button className="upload-transcript-button" onClick={() => navigate('/uploadTranscript')}>
              Upload Transcript
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TimelineSetupPage;
