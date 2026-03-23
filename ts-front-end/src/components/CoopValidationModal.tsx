import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/http-api-client.ts";
import { ENV } from "../config";
import { Check, X, AlertTriangle } from "lucide-react";
import "../styles/components/CoopValidationModal.css";

interface CoopRuleResult {
  ruleId: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

interface CoopValidationResult {
  valid: boolean;
  errors: CoopRuleResult[];
  warnings: CoopRuleResult[];
  metadata: {
    totalTerms: number;
    studyTerms: number;
    workTerms: number;
  };
}

// All possible rules with their display messages
const ALL_RULES = [
  {
    ruleId: "SEQ_STARTS_WITH_STUDY",
    displayMessage: "Degree must begin with a study term",
  },
  {
    ruleId: "SEQ_ENDS_WITH_STUDY",
    displayMessage: "Degree must end with a study term",
  },
  {
    ruleId: "THREE_WORK_TERMS_REQUIRED",
    displayMessage: "Must complete exactly 3 work terms",
  },
  {
    ruleId: "MIN_TWO_STUDY_BEFORE_WORK",
    displayMessage: "At least two study terms required before first work term",
  },
  {
    ruleId: "LONG_SEQUENCE_WARNING",
    displayMessage: "Course sequence length is within typical co-op duration",
  },
];

export const CoopValidationModal: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [result, setResult] = useState<CoopValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadNotes, setDownloadNotes] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    const fetchValidation = async () => {
      setError(null);

      try {
        const res = await api.get<CoopValidationResult>(
          `/coop/validate/${jobId}`,
        );
        setResult(res);
      } catch {
        setError("Failed to fetch validation results.");
      }
    };

    fetchValidation();
  }, [jobId]);

  const allIssues = [...(result?.errors ?? []), ...(result?.warnings ?? [])];

  const getStatusForRule = (ruleId: string) => {
    const error = result?.errors.find((e) => e.ruleId === ruleId);
    if (error) return "error";

    const warning = result?.warnings.find((w) => w.ruleId === ruleId);
    if (warning) return "warning";

    return "success";
  };

  const downloadFilledForm = async () => {
    if (!jobId) return;

    setDownloadError(null);
    setDownloadNotes([]);
    setIsDownloading(true);

    try {
      const response = await fetch(`${ENV.API_SERVER}/coop/form/${jobId}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const notesHeader = response.headers.get("X-Coop-Form-Notes");
      if (notesHeader) {
        try {
          const parsedNotes = JSON.parse(
            decodeURIComponent(notesHeader),
          ) as string[];
          setDownloadNotes(Array.isArray(parsedNotes) ? parsedNotes : []);
        } catch {
          setDownloadNotes([]);
        }
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = "sequence-change-request-form.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setDownloadError("Failed to generate and download the co-op PDF form.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="coop-modal-container">
      {/* Header */}
      <div className="coop-modal-header">
        <h2 className="coop-modal-title">Co-op Validation</h2>
      </div>

      {/* Error */}
      {error && <p className="coop-modal-error">{error}</p>}

      {/* Result */}
      {result && (
        <>
          {/* Overall status */}
          <div className="coop-modal-status">
            <p
              className={`coop-modal-status-text ${
                result.valid
                  ? "coop-modal-status-success"
                  : "coop-modal-status-error"
              }`}>
              {result.valid
                ? "This sequence follows co-op regulations"
                : "This sequence does not follow co-op regulations listed below"}
            </p>
          </div>

          {/* Rule list */}
          <ul className="coop-modal-rule-list">
            {ALL_RULES.map((rule) => {
              const status = getStatusForRule(rule.ruleId);
              const issue = allIssues.find((i) => i.ruleId === rule.ruleId);

              return (
                <li key={rule.ruleId} className="coop-modal-rule-item">
                  {/* Icon */}
                  {status === "success" && (
                    <Check className="coop-modal-rule-icon-success" />
                  )}
                  {status === "error" && (
                    <X className="coop-modal-rule-icon-error" />
                  )}
                  {status === "warning" && (
                    <AlertTriangle className="coop-modal-rule-icon-warning" />
                  )}

                  {/* Text */}
                  <span className="coop-modal-rule-text">
                    {issue ? issue.message : rule.displayMessage}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="coop-modal-actions">
            <button
              type="button"
              className="coop-modal-download-button"
              onClick={downloadFilledForm}
              disabled={isDownloading}>
              {isDownloading
                ? "Generating PDF..."
                : "Download Auto-Filled Sequence Change Form"}
            </button>

            {downloadError && (
              <p className="coop-modal-download-error">{downloadError}</p>
            )}

            {downloadNotes.length > 0 && (
              <div className="coop-modal-download-notes">
                <p className="coop-modal-download-notes-title">Form notes</p>
                <ul className="coop-modal-download-notes-list">
                  {downloadNotes.map((note, index) => (
                    <li key={`${note}-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
