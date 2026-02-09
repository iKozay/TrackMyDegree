import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import UploadBox from '../../components/UploadBox';
import { api } from '../../api/http-api-client';
import { MemoryRouter } from 'react-router-dom';
import type { Mock } from 'vitest';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// --- Mock API ---
vi.mock('../../api/http-api-client', () => ({
  api: {
    post: vi.fn(),
  },
}));

// --- Mock useNavigate ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('UploadBox', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    expect(screen.getByText(/Upload Acceptance Letter/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag and Drop file/i)).toBeInTheDocument();
    expect(screen.getByText(/Create Timeline/i)).toBeInTheDocument();
  });

  it('alerts when non-PDF file is selected', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/Browse/i) as HTMLInputElement;
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(alertMock).toHaveBeenCalledWith('Please select a valid PDF file.');
    expect(screen.getByText('No file chosen')).toBeInTheDocument();

    alertMock.mockRestore();
  });

  it('updates file name when PDF is selected', () => {
    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/Browse/i) as HTMLInputElement;
    const file = new File(['pdfcontent'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/File Selected: document.pdf/i)).toBeInTheDocument();
  });

  it('clears selected file on cancel', () => {
    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/Browse/i) as HTMLInputElement;
    const file = new File(['pdfcontent'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const cancelBtn = screen.getByText(/Cancel/i);
    fireEvent.click(cancelBtn);

    expect(screen.getByText('No file chosen')).toBeInTheDocument();
    expect(fileInput.value).toBe('');
  });

  it('submits selected PDF and navigates on success', async () => {
    const mockedPost = api.post as Mock;
    mockedPost.mockResolvedValue({ jobId: '123' });

    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/Browse/i) as HTMLInputElement;
    const file = new File(['pdfcontent'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const createBtn = screen.getByText(/Create Timeline/i);
    fireEvent.click(createBtn);

    await waitFor(
      () => {
        expect(mockedPost).toHaveBeenCalledWith('/upload/file', expect.any(FormData));
      },
      { timeout: 1000 }
    );

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/timeline/123');
      },
      { timeout: 2500 }
    );
  }, 5000);

  it('shows uploading state and disables button while submitting', async () => {
    const mockedPost = api.post as Mock;
    mockedPost.mockResolvedValue({ jobId: '456' });

    render(
      <MemoryRouter>
        <UploadBox />
      </MemoryRouter>
    );

    const fileInput = screen.getByLabelText(/Browse/i) as HTMLInputElement;
    const file = new File(['pdfcontent'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const createBtn = screen.getByText(/Create Timeline/i);
    fireEvent.click(createBtn);

    expect(screen.getByText(/Uploading…/i)).toBeInTheDocument();
    expect(createBtn).toBeDisabled();
  });
});
