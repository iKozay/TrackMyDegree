import React from "react";
import "../css/Journey.css";
import courseImg from "../images/courselistpage.png";
import acceptanceImg from "../images/uploadAcceptanceletter.png";
import timelineImg from "../images/timelinepage.png";
import graduationImg from "../images/graduation.png";

const steps = [
  { 
    img: courseImg, 
    title: "Explore Courses", 
    description: "Browse all Concordia courses.",
    number: "01"
  },
  { 
    img: acceptanceImg, 
    title: "Upload Transcript", 
    description: "Upload your acceptance letter to start planning.",
    number: "02"
  },
  { 
    img: timelineImg, 
    title: "Build Timeline", 
    description: "Visualize your degree progress.",
    number: "03"
  },
  { 
    img: graduationImg, 
    title: "Graduate!", 
    description: "Stay on track and achieve your goals.",
    number: "04"
  },
];

const JourneySection: React.FC = () => {
  return (
    <section className="journey-section">
      <div className="journey-header">
        <span className="journey-label">Your Path</span>
        <h2 className="journey-title">Your Degree Journey</h2>
        <p className="journey-subtitle">From exploration to graduation, we guide you every step of the way</p>
      </div>
      
      <div className="journey-path">
        {steps.map((step, index) => (
          <div key={index} className={`journey-step step-${index}`}>
            <div className="step-number">{step.number}</div>
            
            <div className="step-card">
              <div className="step-img-container">
                <img src={step.img} alt={step.title} className="step-img" />
                <div className="img-glow"></div>
              </div>
              
              <div className="step-content">
                <h4 className="step-title">{step.title}</h4>
                <p className="step-description">{step.description}</p>
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div className="connector">
                <div className="connector-line"></div>
                <div className="connector-dot"></div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="journey-decoration">
        <div className="decoration-circle decoration-circle-1"></div>
        <div className="decoration-circle decoration-circle-2"></div>
        <div className="decoration-circle decoration-circle-3"></div>
      </div>
    </section>
  );
};

export default JourneySection;
