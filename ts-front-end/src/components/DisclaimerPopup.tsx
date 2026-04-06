import React from 'react';
import { Info, Shield } from 'react-feather';

interface DisclaimerPopupProps {
  show: boolean;
  onClose: () => void;
}

export const DisclaimerPopup: React.FC<DisclaimerPopupProps> = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <dialog
      className="modal-overlay"
      open
      aria-modal="true"
      onCancel={onClose}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        border: 'none',
        maxWidth: '100%',
        maxHeight: '100%',
        width: '100%',
        height: '100%',
      }}
    >
      <button
        aria-label="Close disclaimer"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'default',
        }}
      />
      <div
        className="modal-content"
        role="document"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="modal-header">
          <h3>
            <Info size={24} />
            Important Disclaimer
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.5rem',
              borderRadius: '4px'
            }}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="disclaimer-content">
            <div className="disclaimer-icon">
              <Shield size={48} />
            </div>
            <div className="disclaimer-text">
                <br></br>
                <p>
                TrackMyDegree🎓 can make mistakes. Please check the important information. Note that this website is an
                independent helper tool and is not affiliated with Concordia University. It is designed to provide
                supplementary assistance and should not be solely relied upon for academic or administrative decisions.
                </p>
              <p className="disclaimer-warning">
                <strong>Important:</strong> Do not rely solely on this tool for academic decisions. 
                Always consult with academic advisors and official university documentation.
              </p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button 
            className="acknowledge-button"
            onClick={onClose}
          >
            I Understand
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default DisclaimerPopup;
