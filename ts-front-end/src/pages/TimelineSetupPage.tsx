import '../styles/TimelineSetupPage.css';
import { useState } from 'react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import InstructionsModal from '../components/InstructionModal';

// This page creates an initial timeline using either manually entered information or by parsing an acceptance letter or a transcript
const TimelineSetupPage= () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleModal = () => setIsModalOpen((prev) => !prev);

  return (
    <div>
      <div className="top-down">
        <div className="g-container">
          <InformationForm />

          <div className="or-divider">OR</div>

          <div className="upload-container-al">
          
            <UploadBox />

            <hr className="divider" />

            <p>Click here to see a guide on how to get the unofficial transcript!</p>
            <button onClick={toggleModal} className="open-modal-btn">
              How to Download Your Transcript
            </button>
          </div>
        </div>
      </div>
    <InstructionsModal isOpen={isModalOpen} toggleModal={toggleModal} />
    </div>
  );
};

export default TimelineSetupPage;
