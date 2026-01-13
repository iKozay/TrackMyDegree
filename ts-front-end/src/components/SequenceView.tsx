import { useMemo, useState } from "react";
import type { GeneratedSequence, SequenceTerm } from "../types/coopSequencePlannerTypes";
import { computeCoopCount, computeNextTermSeasonYear, getLastTerm } from "../utils/cspGenerateSequence";
import { downloadJson } from "../utils/cspDownload";
import { TermCard, AddTermCard } from "./TermCard";
import { EditTermModal } from "./EditTermModal";
import { ConfirmModal } from "./ConfirmModal";
import { DownloadPromptModal } from "./DownloadPromptModal";
import "../styles/coopSequencePlanner.css";

type Props = {
  sequence: GeneratedSequence;
  onBackToPrograms: () => void;
  onUpdateSequence: (next: GeneratedSequence) => void;
  onClearAll: () => void;
};

function isLoggedIn(): boolean {
  // Replace later with your real auth logic (token, session, etc.)
  return Boolean(localStorage.getItem("authToken"));
}

export function SequenceView({ sequence, onBackToPrograms, onUpdateSequence, onClearAll }: Props) {
  const [editTerm, setEditTerm] = useState<SequenceTerm | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [downloadPrompt, setDownloadPrompt] = useState(false);

  const coopCount = useMemo(() => computeCoopCount(sequence.currentTerms), [sequence.currentTerms]);

  const stats = useMemo(() => {
    const total = sequence.currentTerms.length;
    const coop = coopCount;
    const academic = total - coop;
    return { total, academic, coop };
  }, [sequence.currentTerms.length, coopCount]);

  const markDirtyChange = (nextTerms: SequenceTerm[]) => {
    // Any modifications remove validation (as you requested)
    onUpdateSequence({
      ...sequence,
      validated: false,
      currentTerms: nextTerms,
    });
  };

  const handleValidate = () => {
    onUpdateSequence({
      ...sequence,
      validated: true, // stub validation
    });
  };

  const handleDownload = () => {
    if (!sequence.validated) {
      setDownloadPrompt(true);
      return;
    }
    doDownload();
  };

  const doDownload = () => {
    const payload = {
      program: sequence.programName,
      templateId: sequence.templateId,
      validated: sequence.validated,
      terms: sequence.currentTerms,
    };
    downloadJson(`coop-sequence-${sequence.programId}.json`, payload);
  };

  const addTerm = () => {
    const last = getLastTerm(sequence.currentTerms);
    const lastSeason = last?.season ?? "Fall";
    const lastYear = last?.year ?? 2026;
    const { season, year } = computeNextTermSeasonYear(lastSeason, lastYear);

    const nextTermNumber = (last?.termNumber ?? 0) + 1;
    const newTerm: SequenceTerm = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      termNumber: nextTermNumber,
      season,
      year,
      type: "Academic",
      courses: [],
      // isUserAdded: true, // <-- enable later when you add delete-term support
    };

    const next = [...sequence.currentTerms, newTerm];
    markDirtyChange(next);
    setEditTerm(newTerm);
  };

  const updateTerm = (updated: SequenceTerm) => {
    const next = sequence.currentTerms.map((t) => (t.id === updated.id ? updated : t));
    markDirtyChange(next);
    setEditTerm(null);
  };

  const resetToDefault = () => {
    onUpdateSequence({
      ...sequence,
      validated: false,
      currentTerms: sequence.defaultTerms.map((t) => ({ ...t })),
    });
    setConfirmReset(false);
  };

  const clear = () => {
    setConfirmClear(false);
    onClearAll();
  };

  const save = () => {
    if (!isLoggedIn()) {
      alert("Please log in to save your sequence.");
      return;
    }
    // TODO: integrate API later
    alert("Saved (stub). Connect this to your backend save endpoint later.");
  };

  return (
    <div className="container py-4">
      <div className="csp-page">
        <button className="csp-backLink" onClick={onBackToPrograms} type="button">
          ← Back to Programs
        </button>

        <div className="csp-headerRow">
          <div className="csp-titleBlock">
            {/* Match Missing Requirements: h2 + muted subtitle spacing */}
            <h2 className="mb-2 csp-pageTitle" style={{ margin: 0 }}>
              {sequence.programName}
            </h2>

            <p className="text-muted csp-pageSubtitle">
              • {coopCount} Co-op Terms
            </p>
          </div>

          {sequence.validated ? <span className="csp-validatedPill">Validated</span> : null}
        </div>

        <div className="csp-toolbar">
          <button className="csp-toolBtn" onClick={() => setConfirmReset(true)} type="button">
            Reset to Default
          </button>
          <button className="csp-toolBtn" onClick={() => setConfirmClear(true)} type="button">
            Clear
          </button>
          <button className="csp-toolBtn" onClick={save} type="button">
            Save
          </button>
          <button className="csp-toolBtn csp-toolBtnPrimary" onClick={handleValidate} type="button">
            Validate
          </button>
          <button className="csp-toolBtn" onClick={handleDownload} type="button">
            Download
          </button>
        </div>

        <div className="csp-panel">
          <div className="csp-panelTitle">Co-op Sequence</div>

          <div className="csp-grid">
            {sequence.currentTerms.map((t) => (
              <TermCard key={t.id} term={t} onClick={() => setEditTerm(t)} />
            ))}
            <AddTermCard onAdd={addTerm} />
          </div>
        </div>

        <div className="csp-statsRow">
          <div className="csp-statCard">
            <div className="csp-statLabel">Total Terms</div>
            <div className="csp-statValue">{stats.total}</div>
          </div>
          <div className="csp-statCard">
            <div className="csp-statLabel">Academic Terms</div>
            <div className="csp-statValue">{stats.academic}</div>
          </div>
          <div className="csp-statCard">
            <div className="csp-statLabel">Co-op Terms</div>
            <div className="csp-statValue">{stats.coop}</div>
          </div>
        </div>

        <EditTermModal
          open={Boolean(editTerm)}
          term={editTerm}
          onClose={() => setEditTerm(null)}
          onSave={updateTerm}
        />

        <ConfirmModal
          open={confirmReset}
          title="Reset to Default?"
          description="This will revert all your changes and restore the original generated sequence."
          confirmText="Reset"
          onCancel={() => setConfirmReset(false)}
          onConfirm={resetToDefault}
        />

        <ConfirmModal
          open={confirmClear}
          title="Clear sequence?"
          description="This will remove the current sequence and return you to the program selection screen."
          confirmText="Clear"
          onCancel={() => setConfirmClear(false)}
          onConfirm={clear}
        />

        <DownloadPromptModal
          open={downloadPrompt}
          onClose={() => setDownloadPrompt(false)}
          onDownloadAnyway={() => {
            setDownloadPrompt(false);
            doDownload();
          }}
          onValidateFirst={() => {
            setDownloadPrompt(false);
            onUpdateSequence({ ...sequence, validated: true });
            doDownload();
          }}
        />
      </div>
    </div>
  );
}
