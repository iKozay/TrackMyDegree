import React, { useState } from 'react';
import { Mail, MessageCircle, Info, Shield } from 'react-feather';
import DisclaimerPopup from './DisclaimerPopup';
import '../styles/components/Footer.css';
import { posthog } from 'posthog-js';

interface FooterProps {
  deployment_version?: string;
}

export const Footer: React.FC<FooterProps> = ({deployment_version}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const socialLinks = [
    { icon: Mail, label: 'Contact Us', url: 'mailto:contact@trackmydegree.ca' },
  ];

  return (
    <>
      <footer className={`modern-footer`}>
        <div className="footer-container">
          {/* Main Footer Content */}
          <div className="footer-grid">
            {/* Brand Section */}
            <div className="footer-section">
              <div className="footer-brand">
                <h3>TrackMyDegree 🎓</h3>
                <p className="footer-tagline">
                  Your academic journey, simplified and organized.
                </p>
                <div className="version-badge">Version: {deployment_version}</div>
              </div>
            </div>

            {/* Resources */}
            <div className="footer-section">
              <h4>Resources</h4>
              <ul className="footer-links">
                <li>
                  <button 
                    className="footer-link-button" 
                    onClick={() => setShowDisclaimer(true)}
                  >
                    <Info size={16} />
                    Disclaimer
                  </button>
                </li>
                <li>
                  <a 
                    href="https://www.concordia.ca" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="footer-link"
                  >
                    <Shield size={16} />
                    Concordia University
                  </a>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div className="footer-section">
              <h4>Connect</h4>
              <div className="connect-row">
                <div className="social-links">
                  {socialLinks.map((social) => (
                    <a
                      key={social.label}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      aria-label={social.label}
                    >
                      <social.icon size={20} />
                    </a>
                  ))}
                </div>
                <button
                  className="feedback-button"
                  onClick={() => posthog.displaySurvey('019aae42-7634-0000-52ab-b993e3b2f493')}
                >
                  <MessageCircle size={16} />
                  Submit Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <DisclaimerPopup 
        show={showDisclaimer} 
        onClose={() => setShowDisclaimer(false)} 
      />
    </>
  );
};

export default Footer;