import '../css/UploadTranscriptPage.css';
import React, { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from react-router-dom
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import Button from 'react-bootstrap/Button';
import { motion } from 'framer-motion';
import {
  extractTranscriptComponents,
  matchCoursesToTerms,
} from '../utils/transcriptUtils';
import UploadBox from "../components/UploadBox";

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

const UploadTranscript = ({ onDataProcessed }) => {
  const navigate = useNavigate(); // Hook to navigate to TimelinePage


  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const typedArray = new Uint8Array(e.target.result);
      pdfjs.getDocument(typedArray).promise.then((pdf) => {
        let pagesPromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagesPromises.push(
            pdf.getPage(i).then(async (page) => {
              return page.getTextContent().then((textContentPage) => {
                return {
                  page: i,
                  text: textContentPage.items.map((item) => item.str).join(' '),
                };
              });
            }),
          );
        }
        Promise.all(pagesPromises).then((pagesData) => {
          const extractedData = extractTranscriptComponents(pagesData);
          const { terms, courses, separators } = extractedData;
          const transcriptData = matchCoursesToTerms(terms, courses, separators);

          // Extract Degree Info
          const degreeInfo = extractedData.degree || 'Unknown Degree';
          const degreeId = extractedData.degreeId || 'Unknown'; // Map degree to ID
          const isExtendedCredit = extractedData.ecp || false;

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
      });
    };

    reader.readAsArrayBuffer(file);
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
