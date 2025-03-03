import '../css/UploadTranscriptPage.css';
import React, { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom';  // Import useNavigate from react-router-dom
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import Button from 'react-bootstrap/Button';
import {motion} from "framer-motion"

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadTranscript = ({ onDataProcessed }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [output, setOutput] = useState('');
  const fileInputRef = useRef(null); // Reference for the file input
  const navigate = useNavigate(); // Hook to navigate to TimelinePage

  const handleDragOver = (e) => {
    e.preventDefault();
    e.target.classList.add('dragover');
  };

  const handleDragLeave = (e) => {
    e.target.classList.remove('dragover');
  };

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

  const processFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const typedArray = new Uint8Array(e.target.result);
      pdfjs.getDocument(typedArray).promise.then((pdf) => {
        let pagesPromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          pagesPromises.push(
            pdf.getPage(i).then((page) => {
              return page.getTextContent().then((textContentPage) => {
                return {
                  page: i,
                  text: textContentPage.items.map((item) => item.str).join(' '),
                };
              });
            })
          );
        }
        Promise.all(pagesPromises).then((pagesData) => {
          const extractedData = extractTermsCoursesAndSeparators(pagesData);
          const transcriptData = matchTermsWithCourses(extractedData.results);

          // Extract Degree Info
          const degreeInfo = extractedData.degree || "Unknown Degree";
          const degreeId = extractedData.degreeId || "Unknown"; // Map degree to ID
          const creditsRequired = extractedData.creditsRequired;

          if (transcriptData.length > 0) {
            localStorage.setItem('Timeline_Name', null);
            onDataProcessed({
              transcriptData,
              degreeId,
              creditsRequired
            }); // Send grouped data to parent
            navigate('/timeline_change'); // Navigate to TimelinePage
          } else {
            setOutput(`<h3>There are no courses to show!</h3>`);
          }
          console.log(degreeId);
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
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.7 }}
  >
    <div className="upload-container">
      {/* Instructions Section */}
      <div className="instructions">
        <h3>How to Download Your Transcript</h3>
        <ol>
          <li>
            Go to <strong>Student Center</strong>, and under the <strong>"Academics"</strong> section, click on <em>"View Unofficial Transcript"</em>.
            <br />
            <img src={TransImage} alt="Step 1" className="instruction-image" />
          </li>
          <li>
            Scroll till the end of the transcript and click on the <strong>"Print"</strong> button.
            <br />
            <img src={PrintImage} alt="Step 2" className="instruction-image" />
          </li>
          <li>
            In the <strong>"Print"</strong> prompt, for the <em>"Destination"</em> field, please select <strong>"Save as PDF"</strong>.
            <br /><strong>Do not choose "Microsoft Print to PDF".</strong>
            <br />
            <img src={PdfImage} alt="Step 3" className="instruction-image" />
          </li>
        </ol>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <h2>Upload Transcript</h2>
        <div
          className="upload-box"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
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
          <Button variant="danger" onClick={handleCancel}> Cancel</Button>         
          <Button variant="primary" onClick={handleSubmit}> Submit </Button> 
        </div>

        <div id="output" dangerouslySetInnerHTML={{ __html: output }}></div>
      </div>
    </div>
    </motion.div>
  );
};

// Functions to extract terms, courses, and match them
const extractTermsCoursesAndSeparators = (pagesData) => {
  const termRegex = /((\s*(Winter|Summer|Fall)\s*\d{4}\s\s)|(\s*(Fall\/Winter)\s*20(\d{2})-(?!\6)\d{2}))/g;
  const courseRegex = /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z]{2,3}|\d{2,3}|[A-Za-z]+)\s+([A-Za-z\s\&\-\+\.\/\(\)\,\'\']+)\s+([\d\.]+)\s+([A-F\+\-]+|PASS|EX)\s+([\d\.]+)/g;
  const exemp_course = /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z\s]+)\s+EX/g;
  const separatorRegex = /COURSE\s*DESCRIPTION\s*ATTEMPTED\s*GRADE\s*NOTATION/g;
  const creditsRequiredRegex = /Min\. Credits Required\s*:\s*(\d+\.\d{2})/;
  const degreeMapping = {
    "Bachelor of Engineering, Aerospace Engineering": "D1",
    "Bachelor of Engineering, Computer Engineering": "D2",
    "Bachelor of Engineering, Electrical Engineering": "D3",
    "Bachelor of Engineering, Mechanical Engineering": "D4",
    "Bachelor of Engineering, Software Engineering": "D5",
  };
  const degreeRegex = /Bachelor of [A-Za-z\s]+,\s*[A-Za-z\s]+/g; // Matches "Bachelor of Software Engineering", etc.
  let degree = null;
  let degreeId = null;
  let creditsRequired = null;

  let results = [];

  pagesData.forEach((pageData) => {
    const { page, text } = pageData;


    const creditsRequiredmatch = text.match(creditsRequiredRegex);
    if (creditsRequiredmatch && creditsRequiredmatch[1] && creditsRequired === null) {
      creditsRequired = parseFloat(creditsRequiredmatch[1]);
    }

    if (!degree) {
      const degreeMatch = text.match(degreeRegex);
      if (degreeMatch) {
        degree = degreeMatch[0];
        degreeId = degreeMapping[degree];
      }
    }


    let termMatch;
    while ((termMatch = termRegex.exec(text)) !== null) {
      results.push({
        name: termMatch[0].trim(),
        page: page,
        type: 'Term',
        position: termMatch.index,
      });
    }

    let courseMatch;
    while ((courseMatch = courseRegex.exec(text)) !== null) {
      results.push({
        name: courseMatch[1] + ' ' + courseMatch[2],
        grade: courseMatch[6],
        page: page,
        type: 'Course',
        position: courseMatch.index,
      });
    }

    let separatorMatch;
    while ((separatorMatch = separatorRegex.exec(text)) !== null) {
      results.push({
        name: separatorMatch[0],
        page: page,
        type: 'Separator',
        position: separatorMatch.index,
      });
    }

    let exemptedMatch;
    while ((exemptedMatch = exemp_course.exec(text)) !== null) {
      results.push({
        name: exemptedMatch[1] + ' ' + exemptedMatch[2],
        page: page,
        type: 'Exempted Course',
        position: exemptedMatch.index,
      });
    }
  });
  console.log('Degree' , degreeId);
  return { results, degree, degreeId, creditsRequired };
};

const matchTermsWithCourses = (data) => {
  let matchedResults = [];
  let currentTerm = data[0]?.name; // Use optional chaining to safely access `name`
  let terms = [];

  data.sort((a, b) => (a.page !== b.page ? a.page - b.page : a.position - b.position));

  data.forEach((item) => {
    if (item && item.type === 'Term' && item.name) {  // Ensure `item` and `item.name` are defined
      if (!terms.includes(item.name)) {
        terms.push(item.name);
      }
    }

    if (item && item.type === 'Exempted Course' && item.name) {  // Ensure `item` and `item.name` are defined
      matchedResults.push({
        term: 'Exempted',
        course: item.name,
        grade: 'EX',
      });
    }

    if (item && item.type === 'Course' && currentTerm && item.name) {  // Ensure `item` and `currentTerm` and `item.name` are defined
      matchedResults.push({
        term: currentTerm,
        course: item.name,
        grade: item.grade,
      });
    }

    if (item && item.type === 'Separator') {
      currentTerm = terms.shift() || null;
    }
  });

  console.log('Grouped data: ', matchedResults);
  return matchedResults;
};


export default UploadTranscript;