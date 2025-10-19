import React from 'react';
import { FaClipboard } from 'react-icons/fa';
import { Button } from 'react-bootstrap';

const REACT_APP_CLIENT = process.env.REACT_APP_CLIENT || 'localhost:3000'; // Set client URL
export const ShareModal = ({
  open,
  onClose,
  semesterCourses,
  degree_Id,
  credsReq,
  extendedCredit,
  copyToClipboard,
  compressTimeline,
}) => {
  console.log(semesterCourses);
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>
        <p>Share this timeline!</p>
        <div className="url-and-copy-btn">
          <div className="url-box">
            <p
              style={{ fontSize: 'small', marginBottom: 0 }}
            >{`${REACT_APP_CLIENT}/timeline_change?tstring=${compressTimeline(semesterCourses, degree_Id, credsReq, extendedCredit)}`}</p>
          </div>
          <Button
            onClick={copyToClipboard}
            title="Copy to clipboard"
            style={{ color: '#912338', marginLeft: '5px', backgroundColor: 'transparent', border: '1px solid black' }}
          >
            <FaClipboard size={25} />
          </Button>
        </div>
      </div>
    </div>
  );
};
