import { useRef, useState } from "react";
import "../styles/components/UploadBox.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import type { UploadResponse } from "../types/response.types.ts";
import { api } from "../api/http-api-client.ts";

const REDIRECT_DELAY_MS = 1000;

interface UploadBoxProps {
  toggleModal: () => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({ toggleModal }) => {
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string>("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
      setFileName(`File Selected: ${file.name}`);
      setSelectedFile(file);
    } else {
      alert("Please select a valid PDF file.");
      setFileName("No file chosen");
      setSelectedFile(null);
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
    setIsUploading(true);

    try {
      const response = await api.post<UploadResponse>("/upload/file", formData);

      if (response.jobId) {
        toast.success("Upload complete. Redirecting…");
        setTimeout(() => {
          navigate(`/timeline/${response.jobId}`);
        }, REDIRECT_DELAY_MS);
        return;
      }

      setIsUploading(false);
      alert("Unexpected response from server.");
    } catch (error: unknown) {
      setIsUploading(false);
      console.error("Error processing file:", error);
      alert(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing file."
      );
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName("No file chosen");

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
        className="upload-box-al"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}>
        <p>Drag and Drop file</p>
        or
        <label htmlFor="file-upload" className="file-label">
          Browse
        </label>
        <input
          type="file"
          id="file-upload"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
          disabled={isUploading}
        />
        <p className="file-name">{fileName}</p>
      </div>

      <button className="cancel-button" onClick={handleCancel} disabled={isUploading}>
        Cancel
      </button>

      <button
        className="create-button"
        onClick={handleSubmit}
        disabled={isUploading}>
        {isUploading ? "Uploading…" : "Create Timeline"}
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
