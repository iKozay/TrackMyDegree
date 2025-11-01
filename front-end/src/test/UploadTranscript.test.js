import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadTranscript from '../pages/UploadTranscriptPage';
import { useNavigate } from 'react-router-dom';
/*
 * UploadTranscriptPage.test.js
 * Unit tests for the UploadTranscriptPage component
 * Tests rendering, file input handling, drag-and-drop, and cancel file upload functionality
 */

// Mock react-pdf and react-router-dom
jest.mock('react-pdf', () => ({
  pdfjs: {
    version: '2.0.0', // Mock the version of the PDF.js library
    GlobalWorkerOptions: {
      workerSrc: '', // Mock the workerSrc to prevent errors
    },
    getDocument: jest.fn().mockReturnValue({
      promise: {
        then: (callback) => {
          callback({
            numPages: 1,
            getPage: jest.fn().mockResolvedValue({
              getTextContent: jest.fn().mockResolvedValue({
                items: [{ str: 'Course Example' }],
              }),
            }),
          });
        },
      },
    }),
  },
}));
// Mocking useNavigate from react-router-dom - used for navigation in the component
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));
// Test suite for the UploadTranscriptPage component, sets up mocks and resets state before each test
describe('UploadTranscriptPage', () => {
  let onDataProcessedMock;
  let navigateMock;

  beforeEach(() => {
    onDataProcessedMock = jest.fn();
    navigateMock = useNavigate();
    jest.clearAllMocks(); // Reset mocks before each test

    global.alert = jest.fn();
  });
  /*
   * test for rendering the component successfully
   * checks for presence of key text elements in the document
   */
  it('renders the component without crashing', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    // Check if the instructions and upload section are present
    expect(screen.getByText(/How to Download Your Transcript/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Transcript/i)).toBeInTheDocument();
  });
  /*
   * test for file input change - valid PDF file
   * creates a fake file with .pdf extension and application/pdf type
   * simulates changing the file input to this valid file
   * expects the file name to be displayed as selected
   */
  it('handles file input change correctly (PDF file)', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    const fileInput = screen.getByLabelText(/Browse/i);
    const file = new File(['dummy content'], 'example.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('File Selected: example.pdf')).toBeInTheDocument();
  });
  /*
   * test for file input change - invalid file type
   * creates a fake file with .txt extension and text/plain type
   * simulates changing the file input to this invalid file
   * expects an alert to be shown with the message about valid PDF file
   */
  it('alerts user for invalid file type', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    const fileInput = screen.getByLabelText(/Browse/i);
    const file = new File(['dummy content'], 'example.txt', {
      type: 'text/plain',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check for alert
    expect(global.alert).toHaveBeenCalledWith('Please select a valid PDF file.');
  });
  /*
   * test for drag-and-drop file upload - valid PDF file
   * simulates dragging over and dropping a valid PDF file onto the drop box
   * expects the file name to be displayed as selected
   */
  it('handles drag and drop file upload correctly', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    const dropBox = screen.getByText(/Drag and Drop file/i);
    const file = new File(['dummy content'], 'example.pdf', {
      type: 'application/pdf',
    });

    // Simulate drag over and drop
    fireEvent.dragOver(dropBox);
    fireEvent.drop(dropBox, { dataTransfer: { files: [file] } });

    expect(screen.getByText('File Selected: example.pdf')).toBeInTheDocument();
  });
  /*
   * test for drag-and-drop file upload - invalid file type
   * simulates dropping an invalid .txt file onto the drop box
   * expects an alert to be shown with the message about valid PDF file
   */
  it('alerts user for invalid drag-and-drop file type', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    const dropBox = screen.getByText(/Drag and Drop file/i);
    const file = new File(['dummy content'], 'example.txt', {
      type: 'text/plain',
    });

    fireEvent.drop(dropBox, { dataTransfer: { files: [file] } });

    expect(window.alert).toHaveBeenCalledWith('Please select a valid PDF file.');
  });

  // it('calls onDataProcessed and navigates on valid file submit', async () => {
  //   render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

  //   const fileInput = screen.getByLabelText(/Browse/i);
  //   const file = new File(['dummy content'], 'example.pdf', { type: 'application/pdf' });
  //   fireEvent.change(fileInput, { target: { files: [file] } });

  //   fireEvent.click(screen.getByText('Submit'));

  //   // Wait for the file to be processed
  //   await waitFor(() => {
  //     expect(onDataProcessedMock).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
  //       term: expect.any(String),
  //       course: expect.any(String),
  //       grade: expect.any(String),
  //     })]));
  //   });

  //   // Ensure navigation occurred
  //   expect(navigateMock).toHaveBeenCalledWith('/timeline_change');
  // });
  /*
   * test for cancel button - resets form state
   * simulates selecting a valid PDF file and then clicking the Cancel button
   * expects the file input to be reset and no file selected message to be shown
   */
  it('resets the form state on cancel', () => {
    render(<UploadTranscript onDataProcessed={onDataProcessedMock} />);

    const fileInput = screen.getByLabelText(/Browse/i);
    const file = new File(['dummy content'], 'example.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByText('Cancel'));

    // Check that the file input is reset
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(screen.queryByText('File Selected: example.pdf')).not.toBeInTheDocument();
  });
});
