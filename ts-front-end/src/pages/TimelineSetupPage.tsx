import '../styles/TimelineSetupPage.css';
import { useState } from 'react';
import InformationForm from '../components/InformationForm';
import UploadBox from '../components/UploadBox';
import InstructionsModal from '../components/InstructionModal';
import UserTimelinesSection from '../components/UserTimelinesSection';

const TimelineSetupPage = () => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const toggleModal = () => setIsModalOpen((prev) => !prev);

  return (
    <div className="timeline-page">

      {/* Hero Section */}
      <div className="hero-section">
        <h1>Create Your Academic Timeline</h1>
        <p>Plan your journey smarter. Build it manually or upload your acceptance letter / unofficial transcript.</p>
      </div>

      {/* Main Cards */}
      <div className="cards-container">

        <div className="card glass-card">
          <InformationForm />
        </div>

        <div className="divider-vertical">OR</div>

        <div className="card glass-card">
          <UploadBox toggleModal={toggleModal} />
        </div>

      </div>

      {/* My Timeline Section */}
      <UserTimelinesSection />

      <InstructionsModal isOpen={isModalOpen} toggleModal={toggleModal} />
    </div>
  );
};

export default TimelineSetupPage;