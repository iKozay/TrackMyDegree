import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UploadBox from '../../components/UploadBox';
import { api } from '../../api/http-api-client';

// Mocks 

vi.mock('../../styles/components/UploadBox.css', () => ({}));

vi.mock('../../api/http-api-client', () => ({
  api: { post: vi.fn() },
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Helpers 

const toggleModal = vi.fn();

const renderComponent = () =>
  render(
    <MemoryRouter>
      <UploadBox toggleModal={toggleModal} />
    </MemoryRouter>
  );

const makePdfFile = (name = 'transcript.pdf') =>
  new File(['content'], name, { type: 'application/pdf' });

const makeNonPdfFile = (name = 'document.docx') =>
  new File(['content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

const uploadFile = (file: File) => {
  const input = document.querySelector<HTMLInputElement>('#file-upload')!;
  fireEvent.change(input, { target: { files: [file] } });
};

// Tests 

describe('UploadBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Rendering 

  it('renders the heading and description', () => {
    renderComponent();
    expect(screen.getByText('Acceptance Letter or Unofficial Transcript')).toBeInTheDocument();
    expect(screen.getByText(/Upload your acceptance letter/)).toBeInTheDocument();
  });

  it('renders Drag and Drop text', () => {
    renderComponent();
    expect(screen.getByText('Drag and Drop file')).toBeInTheDocument();
  });

  it('renders Browse label', () => {
    renderComponent();
    expect(screen.getByText('Browse')).toBeInTheDocument();
  });

  it('renders Cancel and Create Timeline buttons', () => {
    renderComponent();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Create Timeline')).toBeInTheDocument();
  });

  it('shows "No file chosen" initially', () => {
    renderComponent();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  it('renders the View Guide button', () => {
    renderComponent();
    expect(screen.getByText('View Guide')).toBeInTheDocument();
  });

  // File selection 

  it('shows selected file name when a valid PDF is chosen', () => {
    renderComponent();
    uploadFile(makePdfFile('my-transcript.pdf'));
    expect(screen.getByText('File Selected: my-transcript.pdf')).toBeInTheDocument();
  });

  it('alerts and resets when a non-PDF file is selected', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    uploadFile(makeNonPdfFile());
    expect(alertSpy).toHaveBeenCalledWith('Please select a valid PDF file.');
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  // Cancel button 

  it('resets file state when Cancel is clicked', () => {
    renderComponent();
    uploadFile(makePdfFile());
    expect(screen.getByText(/File Selected/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  // View Guide button 

  it('calls toggleModal when View Guide is clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText('View Guide'));
    expect(toggleModal).toHaveBeenCalledTimes(1);
  });

  // Submit: no file 

  it('alerts when Create Timeline is clicked with no file selected', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    fireEvent.click(screen.getByText('Create Timeline'));
    expect(alertSpy).toHaveBeenCalledWith('Please choose a file to upload!');
    expect(api.post).not.toHaveBeenCalled();
  });

  // Submit: loading state 

  it('shows Uploading… while request is in flight', async () => {
    (api.post as Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    uploadFile(makePdfFile());
    fireEvent.click(screen.getByText('Create Timeline'));
    expect(await screen.findByText('Uploading…')).toBeInTheDocument();
  });

  it('disables Cancel, Create Timeline, and file input while uploading', async () => {
    (api.post as Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    uploadFile(makePdfFile());
    fireEvent.click(screen.getByText('Create Timeline'));
    await screen.findByText('Uploading…');
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Uploading…')).toBeDisabled();
    expect(document.querySelector<HTMLInputElement>('#file-upload')).toBeDisabled();
  });

  // Submit: success

  it('navigates to timeline page after successful upload (after redirect delay)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    (api.post as Mock).mockResolvedValue({ jobId: 'job-xyz' });
    renderComponent();
    uploadFile(makePdfFile());

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
      await vi.runAllTimersAsync();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/timeline/job-xyz');
    vi.useRealTimers();
  });

  it('appends the file to FormData when submitting', async () => {
    (api.post as Mock).mockResolvedValue({ jobId: 'job-xyz' });
    renderComponent();
    const file = makePdfFile('test.pdf');
    uploadFile(file);

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
    });

    await waitFor(() => {
      const formData: FormData = (api.post as Mock).mock.calls[0][1];
      expect(formData.get('file')).toBe(file);
    });
  });

  it('shows toast on successful upload', async () => {
    const { toast } = await import('react-toastify');
    (api.post as Mock).mockResolvedValue({ jobId: 'job-xyz' });
    renderComponent();
    uploadFile(makePdfFile());

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Upload complete. Redirecting…');
    });
  });

  // Submit: unexpected response 

  it('alerts on unexpected response (no jobId)', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (api.post as Mock).mockResolvedValue({});
    renderComponent();
    uploadFile(makePdfFile());

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Unexpected response from server.');
    });
    expect(screen.getByText('Create Timeline')).toBeInTheDocument();
  });

  // Submit: API errors 

  it('alerts with error message when API throws an Error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (api.post as Mock).mockRejectedValue(new Error('Server unavailable'));
    renderComponent();
    uploadFile(makePdfFile());

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Server unavailable');
    });
    expect(screen.getByText('Create Timeline')).toBeInTheDocument();
  });

  it('alerts with fallback message when API throws a non-Error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    (api.post as Mock).mockRejectedValue('something bad');
    renderComponent();
    uploadFile(makePdfFile());

    await act(async () => {
      fireEvent.click(screen.getByText('Create Timeline'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'An unknown error occurred while processing file.'
      );
    });
  });

  // Drag and Drop 

  it('accepts a valid PDF dropped onto the upload box', () => {
    renderComponent();
    const dropZone = screen.getByText('Drag and Drop file').closest('.upload-box-al')!;
    fireEvent.drop(dropZone, { dataTransfer: { files: [makePdfFile('dropped.pdf')] } });
    expect(screen.getByText('File Selected: dropped.pdf')).toBeInTheDocument();
  });

  it('alerts when a non-PDF is dropped', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderComponent();
    const dropZone = screen.getByText('Drag and Drop file').closest('.upload-box-al')!;
    fireEvent.drop(dropZone, { dataTransfer: { files: [makeNonPdfFile()] } });
    expect(alertSpy).toHaveBeenCalledWith('Please select a valid PDF file.');
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  it('adds dragover class on dragOver and removes it on dragLeave', () => {
    renderComponent();
    const dropZone = screen.getByText('Drag and Drop file').closest('.upload-box-al')!;
    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('dragover');
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('dragover');
  });
});