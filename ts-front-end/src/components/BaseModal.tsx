// BaseModal.tsx
import React, { useEffect, useRef } from "react";
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleOnClose = () => {
    onClose(false, "");
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal?.();
    } else {
      dialog.close?.();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      handleOnClose();
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        handleOnClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("click", handleBackdropClick);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("click", handleBackdropClick);
    };
  }, [handleOnClose]);

  return (
    <dialog ref={dialogRef} className="modal-backdrop">
      <div className="modal-content">
        <button className="modal-close" onClick={handleOnClose} aria-label="Close modal">
          ×
        </button>
        {children}
      </div>
    </dialog>
  );
};
