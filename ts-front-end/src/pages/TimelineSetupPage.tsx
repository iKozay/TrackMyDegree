import '../styles/TimelineSetupPage.css';
import { useState } from 'react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import InstructionsModal from '../components/InstructionModal';

// This page creates an initial timeline using either manually entered information or by parsing an acceptance letter or a transcript
const TimelineSetupPage = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleModal = () => setIsModalOpen((prev) => !prev);

  return (
    <div className="timeline-setup-page">
      <section className="timeline-setup-shell">
        <header className="timeline-setup-header">
          <p className="timeline-setup-eyebrow">Plan Your Degree Path</p>
          <h1>Build Your Timeline</h1>
          <p className="timeline-setup-subtitle">
            Start manually or upload a document. Both paths generate the same editable timeline.
          </p>
        </header>

        <div className="top-down">
          <div className="g-container">
            <div className="setup-card manual-card">
              <InformationForm />
            </div>

            <div className="or-divider" aria-hidden="true">
              <span>OR</span>
            </div>

            <div className="setup-card upload-card">
              <div className="upload-container-al">
                <UploadBox />

                <hr className="divider" />

                <p className="transcript-help-copy">
                  Need help finding your transcript file first?
                </p>
                <button onClick={toggleModal} className="open-modal-btn">
                  How to Download Your Transcript
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <InstructionsModal isOpen={isModalOpen} toggleModal={toggleModal} />
    </div>
  );
};

export default TimelineSetupPage;
