// BaseModal.tsx
import React from "react";

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
      aria-modal="true"
      role="dialog">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // don't close when clicking inside
      >
        <button className="modal-close" onClick={handleOnClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
