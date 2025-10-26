import '../css/UploadTranscriptPage.css';
import React from 'react';
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom'; // Import useNavigate from react-router-dom
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import { motion } from 'framer-motion';
import UploadBox from '../components/UploadBox';
import axios from 'axios';
import { degreeMap } from '../utils/transcriptUtils';

//Operates the same way as the UploadAcceptanceLetter.js page but with transcripts
// UploadTranscript Component - Handles file upload, drag-and-drop, and processing of PDF transcripts
/**
 * UploadTranscript Component - Client-side transcript processing page
 *
 * Functionality:
 * - Allows users to upload PDF transcripts via drag-drop or file browser
 * - Processes PDFs entirely on the frontend using PDF.js (no backend communication)
 * - Extracts academic data: terms, courses, degree info, and extended credit status
 * - Groups courses under their respective terms chronologically
 * - Stores processed data in localStorage for persistence
 * - Navigates to TimelinePage (/timeline_change) with extracted transcript data
 * - Passes data to parent component via onDataProcessed callback
 *
 * Note: All transcript processing happens client-side for privacy - no data sent to servers
 */
const REACT_APP_SERVER = process.env.REACT_APP_SERVER || 'http://localhost:8000';

const UploadTranscript = ({ onDataProcessed }) => {
  const navigate = useNavigate(); // Hook to navigate to TimelinePage
  const processFile = async (file) => {
    const formData = new FormData();
    formData.append('transcript', file);

    try {
      const response = await axios.post(`${REACT_APP_SERVER}/transcript/parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data) {
        const parsedData = response.data.data;
        console.log('Parsed Transcript Data:', parsedData);
        if (parsedData?.terms.length || parsedData?.transferCredits.length) {
          // Transform new parsed data to match the old format (matching matchCoursesToTerms output)
          const transcriptData = [];

          // Handle transfer credits as exempted courses
          if (parsedData.transferCredits.length > 0) {
            // Get the earliest year from transfer credits or use a default
            const exemptYear = parsedData.terms[0].year;
            transcriptData.push({
              term: `Exempted ${exemptYear}`,
              courses: parsedData.transferCredits.map((tc) => tc.courseCode.replace(/\s+/g, '')),
              grade: 'EX',
            });
          }

          for (const term of parsedData.terms) {
            const termName = `${term.term} ${term.year}`;
            transcriptData.push({
              term: termName,
              courses: term.courses.map((tc) => tc.courseCode.replace(/\s+/g, '')),
              grade: term.termGPA,
            });
          }

          // Extract degree ID from program history
          let degreeName = `${parsedData.programHistory[parsedData.programHistory.length - 1]?.degreeType}, ${parsedData.programHistory[parsedData.programHistory.length - 1]?.major}`;
          const coop = degreeName.indexOf(' (Co-op)');
          degreeName = coop === -1 ? degreeName : degreeName.slice(0, coop);
          const degreeId = degreeMap[degreeName] || 'UNKN';

          onDataProcessed({
            transcriptData,
            degreeId,
            isExtendedCredit: false,
          });

          // Navigate to timeline_change with the required state
          navigate('/timeline_change', {
            state: { coOp: null, extendedCreditCourses: false },
          }); // Navigate to TimelinePage
        } else {
          alert('There are no courses to show!');
        }
      }
    } catch (err) {
      console.error('Error uploading transcript:', err);
      alert(err.response?.data?.message || err.message || 'Failed to parse transcript. Please try again.');
    }
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="upload-container">
        {/* Instructions Section */}
        <div className="instructions">
          <h3>How to Download Your Transcript</h3>
          <ol>
            <li>
              Go to <strong>Student Center</strong>, and under the <strong>"Academics"</strong> section, click on{' '}
              <em>"View Unofficial Transcript"</em>.
              <br />
              <img src={TransImage} alt="Step 1" className="instruction-image" />
            </li>
            <li>
              Scroll till the end of the transcript and click on the <strong>"Print"</strong> button.
              <br />
              <img src={PrintImage} alt="Step 2" className="instruction-image" />
            </li>
            <li>
              In the <strong>"Print"</strong> prompt, for the <em>"Destination"</em> field, please select{' '}
              <strong>"Save as PDF"</strong>.
              <br />
              <strong>Do not choose "Microsoft Print to PDF".</strong>
              <br />
              <img src={PdfImage} alt="Step 3" className="instruction-image" />
            </li>
          </ol>
        </div>

        {/* Upload Section */}
        <div className="upload-container-al">
          <h2>Upload Transcript</h2>
          <UploadBox processFile={processFile} />
        </div>
      </div>
    </motion.div>
  );
};
UploadTranscript.propTypes = {
  onDataProcessed: PropTypes.func,
};
export default UploadTranscript;
