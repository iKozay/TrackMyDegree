import Button from 'react-bootstrap/Button';
import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

const UploadBox = ({ processFile }) => {
  const [fileName, setFileName] = useState('No file chosen');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
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
    validateAndSetFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (file && file.type === 'application/pdf') {
      setFileName(`File Selected: ${file.name}`);
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file.');
      setFileName('No file chosen');
      setSelectedFile(null);
    }
  };
  const handleSubmit = () => {
    if (!selectedFile) {
      alert('Please choose a file to upload!');
      return;
    }
    processFile(selectedFile);
    alert('File uploaded Successfully!');
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName('No file chosen');
    // Reset the file input by clearing its value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // This clears the file input field
    }
  };

  return (
    <>
      <div
        className="upload-box-al upload-box"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>Drag and Drop file</p>
        or
        <label htmlFor="file-upload" className="file-label">
          Browse
        </label>
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

      <Button variant="danger" onClick={handleCancel}>
        {' '}
        Cancel
      </Button>
      <button className="create-button" onClick={handleSubmit}>
        Create Timeline
      </button>
    </>
  );
};
UploadBox.propTypes = {
  processFile: PropTypes.func.isRequired,
};
export default UploadBox;

/*   <div className="button-group">
        <Button variant="danger" onClick={handleCancel}>
            {' '}
            Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
            {' '}
            Submit{' '}
        </Button>
    </div>*/
