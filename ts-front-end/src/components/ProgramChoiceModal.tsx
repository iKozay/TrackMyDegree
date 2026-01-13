import "../styles/coopSequencePlanner.css";
import type { Season } from "../types/coopSequencePlannerTypes";

type OptionMode = { kind: "option"; options: string[] };
type EntryMode = { kind: "entry"; entries: Array<"Fall" | "Winter"> };

type Props = {
  open: boolean;
  programTitle: string;
  mode: OptionMode | EntryMode;
  onClose: () => void;

  // called when user picks an option/entry
  onPick: (payload: { option?: string; entrySeason?: Season }) => void;
};

export function ProgramChoiceModal({ open, programTitle, mode, onClose, onPick }: Props) {
  if (!open) return null;

  const title =
    mode.kind === "option" ? "Select an option" : "Select your entry term";

  const subtitle =
    mode.kind === "option"
      ? `Choose the official co-op option for ${programTitle}.`
      : `Choose the entry term for ${programTitle}.`;

  return (
    <div className="csp-modalOverlay" role="dialog" aria-modal="true">
      <div className="csp-modal">
        <div className="csp-modalHeader">
          <div>
            <div className="csp-modalTitle">{title}</div>
            <div className="csp-modalSubtitle">{subtitle}</div>
          </div>
          <button className="csp-iconBtn" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="csp-form">
          {mode.kind === "option" ? (
            <div className="csp-courseList">
              {mode.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="csp-btn"
                  onClick={() => onPick({ option: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="csp-courseList">
              {mode.entries.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  className="csp-btn"
                  onClick={() => onPick({ entrySeason: entry })}
                >
                  {entry} Entry
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="csp-modalFooter">
          <button className="csp-btn" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
