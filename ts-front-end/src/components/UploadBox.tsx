import { useRef, useState } from "react";
import "../styles/components/UploadBox.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { UploadResponse } from "../types/response.types.ts";
import { api } from "../api/http-api-client.ts";

const REDIRECT_DELAY_MS = 1000;

type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

interface UploadBoxProps {
  toggleModal: () => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ toggleModal }) => {
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string>("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Drag & Drop ---

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("dragover");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");

    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file ?? null);
  };

  // --- File Picker ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File | null) => {
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      setSelectedFile(file);
      setUploadState('selected');
      setErrorMessage('');
    } else {
      alert("Please select a valid PDF file.");
      setFileName("No file chosen");
      setSelectedFile(null);
      setUploadState('idle');
    }
  };

  // --- Upload Handler ---

  const handleSubmit = async () => {
    if (!selectedFile) {
      alert("Please choose a file to upload!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    setUploadState('uploading');

    try {
      const response = await api.post<UploadResponse>("/upload/file", formData);

      if (response.jobId) {
        setUploadState('success');
        toast.success("Upload complete. Redirecting…");
        setTimeout(() => {
          navigate(`/timeline/${response.jobId}`);
        }, REDIRECT_DELAY_MS);
        return;
      }

      setUploadState('error');
      setErrorMessage("Unexpected response from server.");
    } catch (error: unknown) {
      setUploadState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing file."
      );
      console.error("Error processing file:", error);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName("No file chosen");
    setUploadState('idle');
    setErrorMessage('');

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <h2>Acceptance Letter or Unofficial Transcript</h2>
      <p>
        Upload your acceptance letter or unofficial transcript to auto-generate your timeline.
      </p>

      <div
        className={`upload-box-al upload-box-al--${uploadState}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>

        {uploadState === 'uploading' && (
          <div className="upload-spinner" aria-label="Uploading" />
        )}

        {uploadState === 'success' && (
          <div className="upload-success-icon">✓</div>
        )}

        {uploadState === 'error' && (
          <p className="upload-error-msg">{errorMessage}</p>
        )}

        {uploadState === 'idle' && (
          <>
            <p className="drag-drop">Drag and Drop file</p>
            or
            <label htmlFor="file-upload" className="file-label">
              Browse
            </label>
            <p className="file-name">No file chosen</p>
          </>
        )}

        {uploadState === 'selected' && (
          <div className="file-chip">
            <svg className="file-chip-icon" width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9 1H3C2.46957 1 1.96086 1.21071 1.58579 1.58579C1.21071 1.96086 1 2.46957 1 3V17C1 17.5304 1.21071 18.0391 1.58579 18.4142C1.96086 18.7893 2.46957 19 3 19H13C13.5304 19 14.0391 18.7893 14.4142 18.4142C14.7893 18.0391 15 17.5304 15 17V7L9 1Z" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9,1 9,7 15,7" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="file-chip-name">{fileName}</span>
            <button
              className="file-chip-remove"
              onClick={handleCancel}
              aria-label="Remove selected file"
              type="button"
            >✕</button>
          </div>
        )}

        <input
          type="file"
          id="file-upload"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
          disabled={uploadState === 'uploading'}
        />
      </div>

      {uploadState === 'selected' && (
        <button
          className="cancel-button"
          onClick={handleCancel}
          type="button">
          Cancel
        </button>
      )}

      <button
        className="create-button"
        onClick={handleSubmit}
        disabled={uploadState === 'uploading'}>
        {uploadState === 'uploading' ? "Uploading…" : "Create Timeline"}
      </button>

      <div className="modal-trigger">
        <p>Need help downloading your transcript?</p>
        <button onClick={toggleModal} className="modern-link-btn">
          View Guide
        </button>
      </div>
    </>
  );
};

export default UploadBox;
