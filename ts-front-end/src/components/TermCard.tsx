import type { SequenceTerm } from "../types/coopSequencePlannerTypes";
import "../styles/coopSequencePlanner.css";

type Props = {
  term: SequenceTerm;
  onClick: () => void;
};

export function TermCard({ term, onClick }: Props) {
  const isAcademic = term.type === "Academic";
  const badgeText = isAcademic ? "Academic" : "Co-op";

  return (
    <button
      className={`csp-termCard ${isAcademic ? "csp-academic" : "csp-coop"}`}
      onClick={onClick}
      type="button"
    >
      <div className="csp-termHeader">
        <div className="csp-termTitle">
          <span className="csp-termIcon">{isAcademic ? "🎓" : "💼"}</span>
          <div>
            <div className="csp-termName">
              {term.season} {term.year}
            </div>
            <div className="csp-termSub">Term {term.termNumber}</div>
          </div>
        </div>
        <span className={`csp-pill ${isAcademic ? "csp-pillAcademic" : "csp-pillCoop"}`}>
          {badgeText}
        </span>
      </div>

      <div className="csp-termBody">
        {isAcademic ? (
          <ul className="csp-courseUl">
            {term.courses.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        ) : (
          <div className="csp-coopLabel">{term.coopLabel}</div>
        )}
      </div>
    </button>
  );
}

export function AddTermCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button className="csp-termCard csp-addCard" onClick={onAdd} type="button">
      <div className="csp-addPlus">＋</div>
      <div className="csp-addText">Add Term</div>
    </button>
  );
}
