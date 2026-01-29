// BaseModal.tsx
import React from "react";
import "../styles/components/BaseModal.css";

type BaseModalProps = {
  open: boolean;
  onClose: (open: boolean, type: string) => void;
  children: React.ReactNode;
};

export const BaseModal: React.FC<BaseModalProps> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;

  const handleOnClose = () => {
    onClose(false, "");
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleOnClose}
      role="presentation">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // don't close when clicking inside
        role="presentation"
      >
        <button className="modal-close" onClick={handleOnClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
};