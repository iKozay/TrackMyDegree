import '../css/TimelineSetupPage.css';
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Sentry from '@sentry/react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import axios from 'axios';
import InstructionsModal from '../components/InstructionModal';

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
const REACT_APP_SERVER = process.env.REACT_APP_SERVER || 'http://localhost:8000';

const TimelineSetupPage = ({ onDataProcessed }) => {
  const isFirstRender = useRef(true);
  const [degrees, setDegrees] = useState([]);
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  useEffect(() => {
    if (isFirstRender.current) {
      onDataProcessed(); // Clear old timeline data on load
      isFirstRender.current = false;
    }
  }, [onDataProcessed]);
  // get a list of all degrees by name
  // TODO: Add loader while fetching degrees from API
  const getDegrees = async () => {
    // TODO: Add proper error handling and user feedback for API failures
    try {
      const response = await fetch(`${REACT_APP_SERVER}/degree/getAllDegrees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const jsonData = await response.json();
      setDegrees(jsonData.degrees);
    } catch (err) {
      Sentry.captureException(err);
      console.error(err.message);
    }
  };

  useEffect(() => {
    getDegrees();
  }, []);

  const processFile = async (file) => {
    localStorage.setItem('Timeline_Name', null);
    const formData = new FormData();
    formData.append('transcript', file);
    try {
      const response = await axios.post(`${REACT_APP_SERVER}/transcript/parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (!response.data.success || !response.data.data) {
        console.error('Document parsing failed:', response.data.message);
        return null;
      }
      const { extractedCourses, details } = response.data.data;

      if (!extractedCourses && !details) return;
      if (degrees.length === 0) await getDegrees(); //try fetching degrees again
      if (degrees.length === 0) {
        //if still no degrees, show error and return
        alert('Error fetching degrees from server. Please try again later.');
        return;
      }

      // Match extracted degree with available degrees
      const degree = details.degreeConcentration?.toLowerCase() || 'Unknown Degree';
      const matched_degree = degrees.find(
        (d) => degree.toLowerCase().includes(d.name.split(' ').slice(1).join(' ').toLowerCase()), // remove first word (BcompsC/Beng/etc.) and match rest
      );

      if (!matched_degree) {
        alert(
          `The extracted degree "${details.degreeConcentration}" does not match any available degrees in our system.`,
        );
        return;
      }

      if (!(extractedCourses.length && extractedCourses.length > 0)) {
        alert('No Course Extracted From the Document.');
        return; //maybe don't return and let the user proceed with an empty timeline?
      }

      //send the processed data to the TimelinePage
      onDataProcessed({
        transcriptData: extractedCourses,
        degreeId: matched_degree.id,
        isExtendedCredit: details.extendedCreditProgram || false,
        credits_Required: details.minimumProgramLength || matched_degree?.totalCredits,
      });
      navigate('/timeline_change', {
        state: {
          coOp: details.coopProgram,
          credits_Required: details.minimumProgramLength || matched_degree?.totalCredits,
          extendedCredit: details.extendedCreditProgram,
          creditDeficiency: details.deficienciesCourses?.length > 0,
        },
      }); // Navigate to TimelinePage
    } catch (error) {
      console.error('Error processing transcript file:', error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="top-down">
        <div className="g-container">
          <InformationForm degrees={degrees} />

          <div className="or-divider">OR</div>

          <div className="upload-container-al">
            <h2>Upload Acceptance Letter or Unofficial Transcript </h2>
            <p>
              Upload your acceptance letter or your unofficial transcript to automatically fill out the required
              information
            </p>
            <UploadBox processFile={processFile} />

            <hr className="divider" />

            <p>Click here to get see a guide on how to get the unofficial transcript!</p>
            <button onClick={toggleModal} className="open-modal-btn">
              How to Download Your Transcript
            </button>
          </div>
        </div>
      </div>
      <InstructionsModal isOpen={isModalOpen} toggleModal={toggleModal} />
    </motion.div>
  );
};
TimelineSetupPage.propTypes = {
  onDataProcessed: PropTypes.func,
};

export default TimelineSetupPage;
