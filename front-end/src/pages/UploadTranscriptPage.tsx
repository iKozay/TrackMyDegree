import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import type { ParsedTranscript, ParseTranscriptResponse } from '@shared/types';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader, Info, ChevronDown } from 'lucide-react';

interface UploadTranscriptProps {
  onDataProcessed?: (data: ParsedTranscript) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const UploadTranscriptPage: React.FC<UploadTranscriptProps> = ({ onDataProcessed }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [parsedData, setParsedData] = useState<ParsedTranscript | null>(null);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const steps = [
    {
      id: 1,
      title: 'Access Portal',
      shortDesc: 'Log into Concordia Portal',
      detailedDesc:
        'Log into your Concordia Student Portal using your credentials. Navigate to the Student Center section where you can access all your academic information.',
      image: '/transcript/transcript.png',
      tips: [
        "Make sure you're using the official Concordia portal",
        'Keep your login credentials secure',
        'If you have trouble logging in, contact IT support',
      ],
    },
    {
      id: 2,
      title: 'View Transcript',
      shortDesc: 'My Academics → Transcript',
      detailedDesc:
        "From the Student Center, click on 'My Academics' in the navigation menu, then select 'View My Unofficial Transcript' to access your complete academic record.",
      image: '/transcript/print.png',
      tips: [
        'The unofficial transcript contains all the same information as the official one',
        'You can view transcripts for different terms',
        'Make sure all your courses are showing',
      ],
    },
    {
      id: 3,
      title: 'Save as PDF',
      shortDesc: 'Print → Save as PDF',
      detailedDesc:
        "Once your transcript is displayed, click the 'Print' button in your browser or use Ctrl+P (Cmd+P on Mac). Choose 'Save as PDF' as your destination and save the file to your computer.",
      image: '/transcript/pdf.png',
      tips: [
        'Make sure to save the complete transcript (all pages)',
        'Choose a memorable filename',
        'Verify the PDF contains all your courses before uploading',
      ],
    },
  ];

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    setUploadState('idle');
  }, []);

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Reset file selection
  const handleReset = () => {
    setSelectedFile(null);
    setError('');
    setUploadState('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload and parse transcript
  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploadState('uploading');
    setError('');

    const formData = new FormData();
    formData.append('transcript', selectedFile);

    try {
      const response = await axios.post<ParseTranscriptResponse>(`${API_BASE_URL}/transcript/parse`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data) {
        setParsedData(response.data.data);
        setUploadState('success');

        // Store in localStorage
        localStorage.setItem('transcriptData', JSON.stringify(response.data.data));

        // Call callback if provided
        if (onDataProcessed) {
          onDataProcessed(response.data.data);
        }
      } else {
        throw new Error(response.data.message || 'Failed to parse transcript');
      }
    } catch (err: any) {
      console.error('Error uploading transcript:', err);
      setError(err.response?.data?.message || err.message || 'Failed to parse transcript. Please try again.');
      setUploadState('error');
    }
  };

  // Handle success modal close and navigation
  const handleContinue = () => {
    setUploadState('idle');
    setParsedData(null);
    navigate('/timeline_initial');
  };

  const handleCloseModal = () => {
    setUploadState('idle');
    setParsedData(null);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-12">
        <motion.header
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="mt-3 text-3xl font-semibold text-gray-900">Upload Your Transcript</h1>
          <p className="mt-2 text-sm text-gray-500">Drop in your Concordia PDF and we will take it from there.</p>
        </motion.header>

        <motion.div
          className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="space-y-8 border-b border-gray-100 p-8 md:border-b-0 md:border-r">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
                  <Info size={14} />
                  Before you upload
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-medium text-gray-900">Prepare your transcript</h2>
                  <p className="text-sm text-gray-500">
                    Follow these short steps to download a PDF copy before uploading.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {steps.map((step) => {
                  const isOpen = selectedStep === step.id;
                  return (
                    <div key={step.id} className="rounded-2xl border border-gray-200 bg-white">
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        onClick={() => setSelectedStep(isOpen ? null : step.id)}
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-medium ${
                            isOpen ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-600'
                          }`}
                        >
                          {step.id}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{step.title}</p>
                          <p className="text-xs text-gray-500">{step.shortDesc}</p>
                        </div>
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            className="space-y-4 border-t border-gray-100 px-12 pb-5 pt-4"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <p className="text-sm text-gray-600">{step.detailedDesc}</p>
                            <div className="space-y-2">
                              <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Pro Tips</p>
                              <ul className="space-y-1 text-xs text-gray-500">
                                {step.tips.map((tip, index) => (
                                  <li key={index} className="flex gap-2">
                                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-gray-800" />
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 p-8">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-gray-400">Upload</span>
                <h2 className="text-2xl font-medium text-gray-900">Transcript PDF</h2>
                <p className="text-sm text-gray-500">One document only, PDF format, max 2&nbsp;MB.</p>
              </div>

              <input
                id="transcript-upload-input"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {selectedFile ? (
                  <motion.div
                    key="file-card"
                    className="space-y-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-white p-3">
                          <FileText size={20} className="text-gray-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                          <p className="text-xs text-gray-400">Ready to parse</p>
                        </div>
                      </div>
                      <button
                        className="rounded-full border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
                        onClick={handleReset}
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace file
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.label
                    key="dropzone"
                    htmlFor="transcript-upload-input"
                    className={`flex cursor-pointer flex-col items-center gap-5 rounded-2xl border border-dashed p-10 text-center transition-all ${
                      isDragging
                        ? 'border-gray-900 bg-gray-50 shadow-sm'
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="rounded-full bg-gray-100 p-3">
                      <Upload size={24} className="text-gray-600" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-medium text-gray-900">Drop your transcript here</p>
                      <p className="text-sm text-gray-500">or click to browse your files</p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">PDF only · Max 2MB</p>
                  </motion.label>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="flex gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                  >
                    <AlertCircle className="mt-0.5 text-red-500" size={18} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-red-600">Upload error</p>
                      <p className="text-sm text-red-500">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:opacity-40"
                  onClick={() => navigate(-1)}
                  disabled={uploadState === 'uploading'}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-40"
                  onClick={handleSubmit}
                  disabled={!selectedFile || uploadState === 'uploading'}
                >
                  <span className="flex items-center justify-center gap-2">
                    {uploadState === 'uploading' ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Parsing...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        Parse transcript
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {uploadState === 'uploading' && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="mx-4 max-w-sm rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-lg"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
              >
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-gray-900" />
                <h3 className="text-base font-medium text-gray-900">Parsing your transcript</h3>
                <p className="mt-2 text-sm text-gray-500">Hang tight while we extract your courses and credits.</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {uploadState === 'success' && parsedData && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleContinue}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>

              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <CheckCircle size={28} className="text-gray-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Transcript parsed successfully</h2>
              <p className="mt-2 text-sm text-gray-500">We captured the key academic details below.</p>

              <div className="mt-6 space-y-4 text-left">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                  <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-gray-400">Student</h3>
                  <p className="text-sm text-gray-600">
                    <strong className="font-medium text-gray-800">Name:</strong>{' '}
                    {parsedData.studentInfo.studentName || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong className="font-medium text-gray-800">ID:</strong>{' '}
                    {parsedData.studentInfo.studentId || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
                <button
                  className="rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-black"
                  onClick={handleContinue}
                >
                  Continue to timeline
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadTranscriptPage;
