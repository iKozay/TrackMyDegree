// MainModal.tsx
import React from "react";
import { BaseModal } from "./BaseModal";
import { ManageModal } from "./ManageModal";
import { InsightsModal } from "./InsightsModal";
import { SaveTimelineModal } from "./SaveTimelineModal";
import type { CourseCode, CourseMap } from "../types/timeline.types";
import { CoopValidationModal } from "./CoopValidationModal";
import { type CoursePoolData } from "@trackmydegree/shared";
import { canAddCourse } from "../utils/timelineUtils";
import { toast } from "react-toastify";

type MainModalProps = {
  open: boolean;
  type: string;
  pools: CoursePoolData[];
  courses: CourseMap;
  timelineName: string;
  onSave: (timelineName: string) => void;
  onAdd: (courseId: CourseCode, type: string) => void;
  onRemove: (courseId: CourseCode, type: string) => void;
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
  onRemove,
  onClose,
}) => {
  if (!open) return null;

  const handleAdd = (courseId: CourseCode, type: string) => {
    const result = canAddCourse(courseId, type, courses, pools);

    switch (result) {
      case "already_exists":
        toast.info(`${courseId} is already in the pool`);
        return;
      case "course_not_found":
        toast.error(`${courseId} not part of degree requirements`);
        return;
      case "invalid_type":
        toast.error("Invalid type");
        return;
    }

    onAdd(courseId, type);
    toast.success(`${courseId} added to the pool!`);
  };

  const handleRemove = (courseId: CourseCode, type: string) => {
    onRemove(courseId, type);
    toast.success(`${courseId} removed from the pool!`);
  };

  const renderContent = () => {
    switch (type) {
      case "insights":
        return (
          <InsightsModal
            open={open}
            pools={pools}
            courses={courses}
            onClose={() => onClose(false, type)}
            onOpenDegreeAudit={() => onClose(false, "degree-audit")}
          />
        );
      case "exemption":
        return (
          <ManageModal
            type="exemption"
            courses={courses}
            pools={pools}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        );
      case "deficiency":
        return (
          <ManageModal
            type="deficiency"
            courses={courses}
            pools={pools}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        );
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
