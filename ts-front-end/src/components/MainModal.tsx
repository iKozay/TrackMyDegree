// MainModal.tsx
import React from "react";
import { BaseModal } from "./BaseModal";
import { AddModal } from "./AddModal";
import { InsightsModal } from "./InsightsModal";
import { SaveTimelineModal } from "./SaveTimelineModal";
import type { CourseCode, CourseMap, Pool } from "../types/timeline.types";
import { CoopValidationModal } from "./CoopValidationModal";

type MainModalProps = {
  open: boolean;
  type: string;
  pools: Pool[];
  courses: CourseMap;
  timelineName: string;
  onSave: (timelineName: string) => void;
  onAdd: (courseId: CourseCode, type: string) => void;
  onClose: (open: boolean, type: string) => void;
};

export const MainModal: React.FC<MainModalProps> = ({
  open,
  type,
  pools,
  courses,
  timelineName,
  onSave,
  onAdd,
  onClose,
}) => {
  if (!open) return null;

  const renderContent = () => {
    switch (type) {
      case "insights":
        return (
          <InsightsModal
            open={open}
            pools={pools}
            courses={courses}
            onClose={() => onClose(false, type)}
          />
        );
      case "exemption":
        return <AddModal type="exemption" onAdd={onAdd} />;
      case "deficiency":
        return <AddModal type="deficiency" onAdd={onAdd} />;
      case "save":
        return (
          <SaveTimelineModal
            timelineName={timelineName}
            onSave={onSave}
            onClose={() => onClose(false, type)}
          />
        );
      case "coop":
        return <CoopValidationModal />;
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
