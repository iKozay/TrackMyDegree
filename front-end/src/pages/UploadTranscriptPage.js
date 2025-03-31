import '../css/UploadTranscriptPage.css';
import React, { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from react-router-dom
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import Button from 'react-bootstrap/Button';
import { motion } from 'framer-motion';


// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

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
            }),
          );
        }
        Promise.all(pagesPromises).then((pagesData) => {
          // console.log('Raw PDF text:', text);
          const extractedData = extractTermsCoursesAndSeparators(pagesData);
          const transcriptData = matchTermsWithCourses(extractedData.results);

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
            console.log('transcriptData from PDF:', transcriptData);
            console.log('Degree:', degreeInfo);
            console.log('Degree ID:', degreeId);
            console.log('Ecp', extractedData.ecp);
            navigate('/timeline_change', {
              state: { coOp: null, extendedCreditCourses: extractedData.ecp },
            }); // Navigate to TimelinePage
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
              Go to <strong>Student Center</strong>, and under the{' '}
              <strong>"Academics"</strong> section, click on{' '}
              <em>"View Unofficial Transcript"</em>.
              <br />
              <img
                src={TransImage}
                alt="Step 1"
                className="instruction-image"
              />
            </li>
            <li>
              Scroll till the end of the transcript and click on the{' '}
              <strong>"Print"</strong> button.
              <br />
              <img
                src={PrintImage}
                alt="Step 2"
                className="instruction-image"
              />
            </li>
            <li>
              In the <strong>"Print"</strong> prompt, for the{' '}
              <em>"Destination"</em> field, please select{' '}
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

// Functions to extract terms, courses, and match them
const extractTermsCoursesAndSeparators = (pagesData) => {
  const termRegex =
    /((\s*(Winter|Summer|Fall|Fall\/Winter)\s*\d{4}\s\s)|(\s*(Fall\/Winter)\s*20(\d{2})-(?!\6)\d{2}))/g;
  // Capture department (3-4 letters), course number (3 digits), then a flexible description
  // The grade group is now optional, so it may or may not appear.
  const courseRegex =
    /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z\d{1,2}]{1,3})\s+([A-Za-z\s+\-./(),&]+)\s+([\d.]+)\s+([A-F][\s|+|-]+|PASS|EX|\s)\s+([\d.]+)\b/g;

  // Updated regex for exempted courses
  const exemp_course = /([A-Za-z]{3,4})\s+(\d{3})\s+(.+?)\s+(EX|TRC)\b/g;

  const separatorRegex = /COURSE\s*DESCRIPTION\s*ATTEMPTED\s*GRADE\s*NOTATION/g;
  const extendedCreditRegex = /\s*Extended\s*Credit\s*Program\s*/g;
  let ecp = null;
  const degreeMapping = {
    'Bachelor of Engineering, Aerospace Engineering': 'AERO',
    'Bachelor of Engineering, Aerospace Engineering Option A: Aerodynamics and Propulsion Core': 'AEROA',
    'Bachelor of Engineering, Aerospace Engineering Option B: Aerospace Structures and Materials': 'AEROB',
    'Bachelor of Engineering, Aerospace Engineering Option C: Avionics and Aerospace Systems': 'AEROC',
    'Bachelor of Engineering, Building Engineering': 'BCEE',
    'Bachelor of Engineering, Building Engineering Option A: Building Energy and Environment': 'BCEEA',
    'Bachelor of Engineering, Building Engineering Option B: Building Structures and Construction': 'BCEEB',
    'Bachelor of Engineering, Civil Engineering': 'CIVI',
    'Bachelor of Engineering, Civil Engineering Option A: Civil Infrastructure': 'CIVIA',
    'Bachelor of Engineering, Civil Engineering Option B: Environmental': 'CIVIB',
    'Bachelor of Engineering, Civil Engineering Option C: Construction Engineering and Management': 'CIVIC',
    'Bachelor of Engineering, Computer Engineering': 'COEN',
    'Bachelor of Computer Science, Computer Science': 'CompSci',
    'Bachelor of Engineering, Electrical Engineering': 'ELEC',
    'Bachelor of Engineering, Industrial Engineering': 'INDU',
    'Bachelor of Engineering, Mechanical Engineering': 'MECH',
    'Bachelor of Engineering, Software Engineering': 'SOEN',
  };
  const degreeRegex = /Bachelor of [A-Za-z\s]+,\s*[A-Za-z]+\s[A-Za-z]+/g; // Matches "Bachelor of Software Engineering", etc.
  let degree = null;
  let degreeId = null;

  let results = [];

  let transcript = false;
  pagesData.forEach((pageData) => {
    const { page, text } = pageData;
     
    const degreeMatch = text.match(degreeRegex);
    if (degreeMatch) {
      degree = degreeMatch[0];
      degreeId = degreeMapping[degree];
    }

    // Check if text contains "OFFER OF ADMISSION"
    if (text.match("Student Record")) {
      transcript = true;
    }

    if (!ecp && text.match(extendedCreditRegex)) {
      ecp = true;
    }

    // console.log("text", text);

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
        name: courseMatch[1] + courseMatch[2],
        grade: courseMatch[6],
        page: page,
        type: 'Course',
        position: courseMatch.index,
      });
      console.log('Course:', courseMatch[1] + courseMatch[2]);
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
        name: exemptedMatch[1] + exemptedMatch[2], // e.g. "MATH 201"
        page: page,
        type: 'Exempted Course',
        position: exemptedMatch.index,
        grade: exemptedMatch[4], // e.g. "EX" or "TRC" or "PASS"
      });

      console.log('Exempted Course:', exemptedMatch[1] + exemptedMatch[2]);
    }
  });

  if(!transcript){
    alert("Please choose Offer of Admission");     
    return { results: [] };
  }
  console.log('Degree', degreeId);
  console.log('Extended Credit Program:', ecp);
  // console.log('Raw PDF text:', text);
  return { results, degree, degreeId, ecp };
};

const matchTermsWithCourses = (data) => {
  // First, gather all exempted course codes in a Set
  const exemptedSet = new Set();
  data.forEach((item) => {
    if (item.type === 'Exempted Course') {
      exemptedSet.add(item.name);
    }
  });

  let matchedResults = [];
  let currentTerm = data[0]?.name; // Use optional chaining to safely access `name`
  let terms = [];

  data.sort((a, b) =>
    a.page !== b.page ? a.page - b.page : a.position - b.position,
  );

  data.forEach((item) => {
    if (item && item.type === 'Term' && item.name) {
      // Ensure `item` and `item.name` are defined
      if (!terms.includes(item.name)) {
        terms.push(item.name);
      }
    }

    if (item && item.type === 'Exempted Course' && item.name) {
      matchedResults.push({
        term: 'Exempted 2020', // Force them all into “Exempted 2020”
        course: item.name, // e.g. "MATH 201"
        grade: item.grade, // e.g. "EX" or "TRC" or "PASS"
      });
    }

    // Only add regular courses if they haven't already been marked as exempted
    if (item && item.type === 'Course' && currentTerm && item.name) {
      if (!exemptedSet.has(item.name)) {
        // Check if course is not in exempted set
        matchedResults.push({
          term: currentTerm,
          course: item.name,
          grade: item.grade,
        });
      }
    }

    if (item && item.type === 'Separator') {
      currentTerm = terms.shift() || null;
    }
  });

  console.log('Grouped data: ', matchedResults);
  return matchedResults;
};

export default UploadTranscript;
