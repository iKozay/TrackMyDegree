import React, { useState } from 'react';
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import '../css/InstructionModal.css';

const InstructionsModal = ({ isOpen, toggleModal }) => {
  return (
    isOpen && (
      <div className="modal-overlay">
        <div className="modal-content-instructions">
          <button onClick={toggleModal} className="close-modal-btn">X</button>
          <div className="instructions">
            <h2>How to Download Your Transcript</h2>
            <div className="steps-container">
              <div className="step">
                <p>
                  <strong>Step 1:</strong> Go to <strong>Student Center</strong>, and under the <strong>"Academics"</strong> section, click on <em>"View Unofficial Transcript"</em>.
                </p>
                <img src={TransImage} alt="Step 1" />
              </div>

              <div className="step">
                <p>
                  <strong>Step 2:</strong> Scroll till the end of the transcript and click on the <strong>"Print"</strong> button.
                </p>
                <br/>
                <img src={PrintImage} alt="Step 2" />
              </div>

              <div className="step">
                <p>
                  <strong>Step 3:</strong> In the <strong>"Print"</strong> prompt, for the <em>"Destination"</em> field,
                  select <strong>"Save as PDF"</strong> <br/> <strong>(Do Not Choose "Microsoft Print to PDF")</strong>
                </p>
                <img src={PdfImage} alt="Step 3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default InstructionsModal;


