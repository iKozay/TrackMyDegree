// MainModal.tsx
import React from "react";
import { BaseModal } from "./BaseModal";

type MainModalProps = {
  open: boolean;
  type: string;
  onClose: (open: boolean, type: string) => void;
};

export const MainModal: React.FC<MainModalProps> = ({
  open,
  type,
  onClose,
}) => {
  if (!open) return null;

  // TODO : We can reuse a modal AddModal for deficieny/exemption..
  const renderContent = () => {
    switch (type) {
      case "insights":
        return (
          <div>
            <h2>Insights modal</h2>
            {/* TODO: add insights content */}
          </div>
        );

      case "exemption":
        return (
          <div>
            <h2>Exemption modal</h2>
            {/* TODO: add exemption content */}
          </div>
        );
      case "save":
        return (
          <div>
            <h2>Save modal</h2>
            {/* TODO: add Save content */}
          </div>
        );

      // add more types here
      default:
        return (
          <div>
            <h2>Unknown modal</h2>
          </div>
        );
    }
  };

  return (
    <BaseModal open={open} onClose={onClose}>
      {renderContent()}
    </BaseModal>
  );
};
