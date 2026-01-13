import type { ProgramId } from "../types/coopSequencePlannerTypes";
import { COOP_PROGRAMS } from "../mock/coopPrograms";
import "../styles/coopSequencePlanner.css";

type Props = {
  onSelectProgram: (programId: ProgramId) => void;
};

export function ProgramGrid({ onSelectProgram }: Props) {
  return (
    <div className="container py-4">
      <div className="csp-page">
        <h2 className="mb-2 csp-pageTitle" style={{ margin: 0 }}>
          Co-op Sequence Planner
        </h2>
        <p className="text-muted csp-pageSubtitle">
          Select your program to generate your official co-op sequence.
        </p>

        <div className="csp-programGrid">
          {COOP_PROGRAMS.map((p) => (
            <button
              key={p.id}
              className="csp-programCard"
              onClick={() => onSelectProgram(p.id)}
              type="button"
            >
              <div className="csp-programHeader">
                <h5 className="csp-programTitle">{p.title}</h5>
              </div>

              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                {p.subtitle}
              </p>
            </button>
          ))}
        </div>

        <div className="card mt-4">
          <div className="card-body">
            <h6 className="mb-2">About Co-op Sequences</h6>
            <p className="mb-0 text-muted" style={{ fontSize: 14 }}>
              Generate the official sequence, customize terms, validate (coming soon), and download your plan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
