import React, { useMemo, useState } from "react";
import type { SequenceTerm, TermType } from "../types/coopSequencePlannerTypes";
import "../styles/coopSequencePlanner.css";

type Props = {
  open: boolean;
  term: SequenceTerm | null;
  onClose: () => void;
  onSave: (updated: SequenceTerm) => void;
};

export function EditTermModal({ open, term, onClose, onSave }: Props) {
  const [localType, setLocalType] = useState<TermType>("Academic");
  const [courses, setCourses] = useState<string[]>([]);
  const [coopLabel, setCoopLabel] = useState<string>("");

  // Initialize when term changes
  React.useEffect(() => {
    if (!term) return;
    setLocalType(term.type);
    if (term.type === "Academic") {
      setCourses(term.courses);
      setCoopLabel("");
    } else {
      setCourses([]);
      setCoopLabel(term.coopLabel);
    }
  }, [term]);

  const title = useMemo(() => {
    if (!term) return "";
    return `Edit Term - ${term.season} ${term.year}`;
  }, [term]);

  if (!open || !term) return null;

  const handleTypeChange = (value: TermType) => {
    setLocalType(value);
    // keep current inputs; we’ll adapt on save
  };

  const save = () => {
    if (localType === "Academic") {
      const cleaned = courses
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      onSave({
        ...term,
        type: "Academic",
        courses: cleaned.length ? cleaned : [],
      } as SequenceTerm);
    } else {
      const label = coopLabel.trim() || "Co-op Work Term";
      onSave({
        ...term,
        type: "Co-op",
        coopLabel: label,
      } as SequenceTerm);
    }
  };

  return (
    <div className="csp-modalOverlay" role="dialog" aria-modal="true">
      <div className="csp-modal csp-modalWide">
        <div className="csp-modalHeader">
          <div>
            <div className="csp-modalTitle">{title}</div>
            <div className="csp-modalSubtitle">Modify term type, courses, or co-op position information</div>
          </div>
          <button className="csp-iconBtn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="csp-form">
          <label className="csp-label">Term Type</label>
          <select
            className="csp-select"
            value={localType}
            onChange={(e) => handleTypeChange(e.target.value as TermType)}
          >
            <option value="Academic">Academic</option>
            <option value="Co-op">Co-op</option>
          </select>

          {localType === "Academic" ? (
            <>
              <div className="csp-rowBetween">
                <div className="csp-label" style={{ marginTop: 16 }}>
                  Courses
                </div>
                <button
                  className="csp-btn csp-btnSmall"
                  onClick={() => setCourses((prev) => [...prev, ""])}
                  type="button"
                >
                  Add Course
                </button>
              </div>

              <div className="csp-courseList">
                {courses.map((c, idx) => (
                  <div className="csp-courseRow" key={idx}>
                    <input
                      className="csp-input"
                      value={c}
                      placeholder="Course code (e.g., COMP 248)"
                      onChange={(e) => {
                        const v = e.target.value;
                        setCourses((prev) => prev.map((x, i) => (i === idx ? v : x)));
                      }}
                    />
                    <button
                      className="csp-iconBtn"
                      onClick={() => setCourses((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove course"
                      type="button"
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <label className="csp-label" style={{ marginTop: 16 }}>
                Co-op Label
              </label>
              <input
                className="csp-input"
                value={coopLabel}
                placeholder="e.g., Co-op Work Term I"
                onChange={(e) => setCoopLabel(e.target.value)}
              />
            </>
          )}
        </div>

        <div className="csp-modalFooter">
          <button className="csp-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="csp-btn csp-btnPrimary" onClick={save}>
            Update Term
          </button>
        </div>
      </div>
    </div>
  );
}
