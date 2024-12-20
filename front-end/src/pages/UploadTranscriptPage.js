import React, { useState } from 'react';
import '../css/UploadTranscriptPage.css';
import { pdfjs } from 'react-pdf';

// Set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UploadTranscript = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('No file chosen');
  const [output, setOutput] = useState('');

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
      // Use pdf.js to parse the PDF (example: https://github.com/mozilla/pdf.js/)
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
          const matchedData = matchTermsWithCourses(extractedData);

          if (matchedData.length > 0) {
            setOutput(
              `<h3>Matched Terms and Courses:</h3>
              <ul>${matchedData
                .map((item) => `<li>Term: ${item.term}, Course: ${item.course}, Grade: ${item.grade}</li>`)
                .join('')}</ul>`
            );
          } else {
            setOutput(`<h3>There are no courses to show!</h3>`);
          }
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
  };

  return (
    <div className="container">
      <h2>Upload Transcript</h2>

      <div
        className="upload-box"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag and Drop file</p>
        <p>or</p>
        <label htmlFor="file-upload">Browse</label>
        <input
          type="file"
          id="file-upload"
          accept="application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p className="file-name">{fileName}</p>
      </div>

      <div className="button-group">
        <button className="cancel-button" onClick={handleCancel}>
          Cancel
        </button>
        <button className="submit-button" onClick={handleSubmit}>
          Submit
        </button>
      </div>

      <div id="output" dangerouslySetInnerHTML={{ __html: output }}></div>
    </div>
  );
};

// Functions to extract terms, courses, and match them
const extractTermsCoursesAndSeparators = (pagesData) => {
  const termRegex = /((\s*(Winter|Summer|Fall)\s*\d{4}\s\s)|(\s*(Fall\/Winter)\s*20(\d{2})-(?!\6)\d{2}))/g;
  const courseRegex = /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z]{2,3}|\d{2,3}|[A-Za-z]+)\s+([A-Za-z\s\&\-\+\.\/\(\)\,\'\']+)\s+([\d\.]+)\s+([A-F\+\-]+|PASS|EX)\s+([\d\.]+)/g;
  const exemp_course = /([A-Za-z]{3,4})\s+(\d{3})\s+([A-Za-z\s]+)\s+EX/g;
  const separatorRegex = /COURSE\s*DESCRIPTION\s*ATTEMPTED\s*GRADE\s*NOTATION/g;

  let results = [];

  pagesData.forEach((pageData) => {
    const { page, text } = pageData;

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

  return results;
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

  return matchedResults;
};

export default UploadTranscript;