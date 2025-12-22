import '../css/TimelineSetupPage.css';
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Sentry from '@sentry/react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import { api } from '../api/http-api-client';
import InstructionsModal from '../components/InstructionModal';

//This page creates an initial timeline using either manually entered information or by parsing an acceptance letter or a transcript
/**
 * TimelineSetupPage Component - Dual-mode timeline creation page
 *
 * Two creation paths:
 * 1. Manual Form: User selects degree, starting term/year, and program options (Co-op/Extended Credit)
 * 2. PDF Upload: Processes acceptance letter or transcript PDFs to auto-extract degree, terms, exemptions, and program info
 *
 * Backend Integration:
 * - Fetches available degrees from server API (/degree/getAllDegrees)
 * - Uses Sentry for error tracking
 * - PDF Parsing: Uploads files to server API (/upload/parse) for data extraction
 *
 * Navigation: Redirects to TimelinePage (/timeline_change) with extracted/selected data
 * Storage: Clears previous timeline data in localStorage before processing
 */
const TimelineSetupPage = ({ onDataProcessed }) => {
  const isFirstRender = useRef(true);
  const [degrees, setDegrees] = useState();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  useEffect(() => {
    if (isFirstRender.current) {
      onDataProcessed(); // Clear old timeline data on load
      isFirstRender.current = false;
    }
  }, [onDataProcessed]);


  useEffect(() => {
    // get a list of all degrees by name
    const getDegrees = async () => {
      try {
        const degrees = await api.get('/degree');
        console.log('Degrees:', degrees);
        setDegrees(degrees);
      } catch (err) {
        alert('Error fetching degrees from server. Please try again later.');
        Sentry.captureException(err);
        console.error(err.message);
      }
    };
    getDegrees();
  }, []);

  const processFile = async (file) => {
    localStorage.setItem('Timeline_Name', null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post(`/upload/parse`, formData);
      const parsedData = response.data?.data || response.data;
      
      // Check if we have the new unified structure
      if (!parsedData.programInfo && !parsedData.semesters) {
        return;
      }

      if (!degrees || degrees.length === 0) {
        alert('Error fetching degrees from server. Please try again later.');
        return;
      }

      // Extract program info
      const programInfo = parsedData.programInfo || {};
      
      // Match extracted degree with available degrees
      const degreeName = programInfo.degree?.toLowerCase() || 'Unknown Degree';
      //remove first two words from degree name from server and match the rest of the name with parsed degree
      //ex: degree.name from server = "Beng in Software Engineering", remove "Beng in" and check if parsed degree includes "Software Engineering"
      const matched_degree = degrees.find((d)=>degreeName.includes(d.name.split(' ').slice(2).join(' ').toLowerCase()))
      if (!matched_degree) {
        alert(
          `The extracted degree "${programInfo.degree || 'Unknown'}" does not match any available degrees in our system.`,
        );
        return;
      }

      // Convert new structure to old format for compatibility
      // Build extractedCourses from semesters, exemptedCourses, deficiencyCourses, and transferedCourses
      const extractedCourses = [];
      
      // Add exempted courses
      if (parsedData.exemptedCourses && parsedData.exemptedCourses.length > 0) {
        extractedCourses.push({
          term: 'Exempted',
          courses: parsedData.exemptedCourses,
        });
      }
      
      // Add deficiency courses
      if (parsedData.deficiencyCourses && parsedData.deficiencyCourses.length > 0) {
        extractedCourses.push({
          term: 'Deficiencies',
          courses: parsedData.deficiencyCourses,
        });
      }
      
      // Add transfered courses
      if (parsedData.transferedCourses && parsedData.transferedCourses.length > 0) {
        extractedCourses.push({
          term: 'Transfered Courses',
          courses: parsedData.transferedCourses,
        });
      }
      
      // Add semesters (convert courses from {code, grade?} to just code strings)
      if (parsedData.semesters && parsedData.semesters.length > 0) {
        parsedData.semesters.forEach((semester) => {
          const courseCodes = semester.courses.map(c => 
            typeof c === 'string' ? c : c.code
          ).filter(Boolean);
          
          if (courseCodes.length > 0 || semester.term) {
            extractedCourses.push({
              term: semester.term,
              courses: courseCodes,
            });
          }
        });
      }

      if (!extractedCourses || extractedCourses.length === 0) {
        alert('No Course Extracted From the Document.');
        return; //maybe don't return and let the user proceed with an empty timeline?
      }

      //send the processed data to the TimelinePage
      onDataProcessed({
        transcriptData: extractedCourses,
        degreeId: matched_degree._id,
        isExtendedCredit: programInfo.isExtendedCreditProgram || false,
        credits_Required: programInfo.minimumProgramLength || matched_degree?.totalCredits,
      });
      navigate('/timeline_change', {
        state: {
          coOp: programInfo.isCoop || false,
          credits_Required: programInfo.minimumProgramLength || matched_degree?.totalCredits,
          extendedCredit: programInfo.isExtendedCreditProgram || false,
          creditDeficiency: parsedData.deficiencyCourses?.length > 0 || false,
        },
      }); // Navigate to TimelinePage
    } catch (error) {
      console.error('Error processing transcript file:', error);
      alert(error.message || 'An error occurred while processing the file.');
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
