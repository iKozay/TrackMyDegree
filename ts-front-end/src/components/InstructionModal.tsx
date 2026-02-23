import { useState } from "react";
import PrintImage from '../images/Print_image.png';
import PdfImage from '../images/Pdf_image.png';
import TransImage from '../images/Transc_image.png';
import '../styles/components/InstructionModal.css';

interface InstructionsModalProps {
  isOpen: boolean;
  toggleModal: () => void;
}

const steps = [
  {
    img: TransImage,
    title: "Go to Student Center",
    description:
      'Under the "Academics" section click "View Unofficial Transcript".',
    number: "01"
  },
  {
    img: PrintImage,
    title: "Click Print",
    description:
      "Scroll to the bottom of the transcript and click the Print button.",
    number: "02"
  },
  {
    img: PdfImage,
    title: "Save as PDF",
    description:
      'Select "Save as PDF" as destination (Do NOT choose Microsoft Print to PDF).',
    number: "03"
  }
];

const InstructionsModal: React.FC<InstructionsModalProps> = ({
  isOpen,
  toggleModal
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % steps.length);

  const prevSlide = () =>
    setCurrentIndex((prev) =>
      prev === 0 ? steps.length - 1 : prev - 1
    );

  return (
    <div className="modal-overlay">
      <div className="modal-content-carousel">

        <button onClick={toggleModal} className="close-modal-btn">
          ×
        </button>

        <div className="carousel-body">

        <div className="carousel-header">
          <span className="carousel-label">Guide</span>
          <h2>Download Your Transcript</h2>
        </div>

        <div className="carousel-container">

          <button className="nav-btn left" onClick={prevSlide}>
            ‹
          </button>

          <div className="carousel-slide">
            <div className="step-number">{steps[currentIndex].number}</div>

            <div className="carousel-card">
              <div className="img-wrapper">
                <img
                  src={steps[currentIndex].img}
                  alt={steps[currentIndex].title}
                />
                <div className="img-glow"></div>
              </div>

              <div className="carousel-content">
                <h3>{steps[currentIndex].title}</h3>
                <p>{steps[currentIndex].description}</p>
              </div>
            </div>
          </div>

          <button className="nav-btn right" onClick={nextSlide}>
            ›
          </button>

        </div>

        <div className="dots">
          {steps.map((_, index) => (
            <span
              key={`dot-${index}`}
              role="button"
              tabIndex={0}
              className={`dot ${index === currentIndex ? "active" : ""}`}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => setCurrentIndex(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setCurrentIndex(index);
              }}
            />
          ))}
        </div>


        </div>

      </div>
    </div>
  );
};

export default InstructionsModal;