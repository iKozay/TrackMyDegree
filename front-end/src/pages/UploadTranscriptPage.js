import '../css/UploadTranscriptPage.css';
import React, { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from react-router-dom
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import Button from 'react-bootstrap/Button';
import { motion } from 'framer-motion';
import { extractTranscriptComponents, matchCoursesToTerms } from '../utils/transcriptUtils';
import UploadBox from '../components/UploadBox';
import { parsePdfFile } from '../utils/AcceptanceUtils';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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
const UploadTranscript = ({ onDataProcessed }) => {
  const navigate = useNavigate(); // Hook to navigate to TimelinePage

  const processFile = (file) => {
    parsePdfFile(file).then((pagesData) => {
      const extractedData = extractTranscriptComponents(pagesData);
      const { terms, courses, separators } = extractedData;
      const transcriptData = matchCoursesToTerms(terms, courses, separators);

      // Extract Degree Info
      const degreeInfo = extractedData.degree || 'Unknown Degree';
      const degreeId = extractedData.degreeId || 'Unknown'; // Map degree to ID
      const isExtendedCredit = extractedData.ecp || false;
      console.log('TRANSCRIPT DATA:', transcriptData);

      if (transcriptData.length > 0) {
        localStorage.setItem('Timeline_Name', null);

        onDataProcessed({
          transcriptData,
          degreeId,
          isExtendedCredit,
        });
        navigate('/timeline_change', {
          state: { coOp: null, extendedCreditCourses: extractedData.ecp },
        }); // Navigate to TimelinePage
      } else {
        alert('There are no courses to show!');
      }
    });
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
        <div className="upload-section">
          <h2>Upload Transcript</h2>
          <UploadBox processFile={processFile} />
        </div>
      </div>
    </motion.div>
  );
};

export default UploadTranscript;
