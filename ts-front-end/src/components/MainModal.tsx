// MainModal.tsx
import React from "react";
import { BaseModal } from "./BaseModal";
import { AddModal } from "./AddModal";
import { InsightsModal } from "./InsightsModal";
import type { CourseCode, CourseMap, Pool } from "../types/timeline.types";

type MainModalProps = {
  open: boolean;
  type: string;
  pools: Pool[];
  courses: CourseMap;
  onAdd: (courseId: CourseCode, type: string) => void;
  onClose: (open: boolean, type: string) => void;
};

export const MainModal: React.FC<MainModalProps> = ({
  open,
  type,
  pools,
  courses,
  onAdd,
  onClose,
}) => {
  if (!open) return null;

  const renderContent = () => {
    switch (type) {
      case "insights":
        return <InsightsModal open={open} pools={pools} courses={courses} onClose={() => onClose(false, type)} />;
      case "exemption":
        return <AddModal open={open} type="exemption" onAdd={onAdd} onClose={() => onClose(false, type)} />;
      case "deficiency":
        return <AddModal open={open} type="deficiency" onAdd={onAdd} onClose={() => onClose(false, type)} />;
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
