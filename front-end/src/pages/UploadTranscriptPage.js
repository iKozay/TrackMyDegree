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

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

//Operates the same way as the UploadAcceptanceLetter.js page but with transcripts
// UploadTranscript Component - Handles file upload, drag-and-drop, and processing of PDF transcripts
const UploadTranscript = ({ onDataProcessed }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [output, setOutput] = useState('');
  const fileInputRef = useRef(null); // Reference for the file input
  const navigate = useNavigate(); // Hook to navigate to TimelinePage
    // Handle drag-and-drop events over the upload box
  const handleDragOver = (e) => {
    e.preventDefault();
    e.target.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.target.classList.remove('dragover');
  };
    // Handle file selection via the file input via the "Browse" button
  const handleDrop = (e) => {
    e.preventDefault();
    e.target.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setFileName(`File Selected: ${file.name}`);
      setSelectedFile(file);
    } else {
      alert('Please drop a valid PDF file.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFileName(`File Selected: ${file.name}`);
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file.');
    }
  };
    /*
    * Process the selected PDF file to extract transcript data
    * @param {File} file - The PDF file to process
    * Uses extractTranscriptComponents to get terms, courses, separators, degree, and ecp
    * Uses matchCoursesToTerms to group courses under their respective terms
    * Stores the transcript data, degree ID, and extended credit info in localStorage
    * Navigates to TimelinePage with the extracted data
    * */
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
            }); // Send grouped data to parent
            // console.log('transcriptData from PDF:', transcriptData);
            // console.log('Degree:', degreeInfo);
            // console.log('Degree ID:', degreeId);
            // console.log('Ecp', extractedData.ecp);
            navigate('/timeline_change', {
              state: { coOp: null, extendedCreditCourses: extractedData.ecp },
            }); // Navigate to TimelinePage
          } else {
            setOutput(`<h3>There are no courses to show!</h3>`);
          }
          // console.log(degreeId);
        });
      });
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = () => {
    if (!selectedFile) {
      alert('Please choose a file to upload!');
      return;
    }
    processFile(selectedFile);
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName('No file chosen');
    setOutput('');
    // Reset the file input by clearing its value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // This clears the file input field
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
        <div className="upload-section">
          <h2>Upload Transcript</h2>
          <div className="upload-box" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <p>Drag and Drop file</p>
            or
            <label htmlFor="file-upload">Browse</label>
            <input
              type="file"
              id="file-upload"
              accept="application/pdf"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <p className="file-name">{fileName}</p>
          </div>

          <div className="button-group">
            <Button variant="danger" onClick={handleCancel}>
              {' '}
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {' '}
              Submit{' '}
            </Button>
          </div>

          <div id="output" dangerouslySetInnerHTML={{ __html: output }}></div>
        </div>
      </div>
    </motion.div>
  );
};

export default UploadTranscript;
