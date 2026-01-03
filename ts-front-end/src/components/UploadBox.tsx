import { useRef, useState } from "react";
import "../styles/components/UploadBox.css";
import { useNavigate } from "react-router-dom";
import type { UploadResponse } from "../types/response.types.ts";
import { api } from "../api/http-api-client.ts";

const UploadBox = () => {
  const navigate = useNavigate();

  const [fileName, setFileName] = useState<string>("No file chosen");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    try {
      const response = await api.post<UploadResponse>("/upload/file", formData);

      if (response.jobId) {
        navigate(`/timeline/${response.jobId}`);
        return;
      }

      alert("Unexpected response from server.");
    } catch (error: unknown) {
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
      <h2>Upload Acceptance Letter or Unofficial Transcript</h2>
      <p>
        Upload your acceptance letter or your unofficial transcript to
        automatically fill out the required information
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
        />
        <p className="file-name">{fileName}</p>
      </div>

      <button className="cancel-button" onClick={handleCancel}>
        Cancel
      </button>

      <button className="create-button" onClick={handleSubmit}>
        Create Timeline
      </button>
    </>
  );
};

export default UploadBox;
