
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CoopValidationModal } from '../../components/CoopValidationModal';

const mockResult = {
  valid: false,
  errors: [
    { ruleId: 'SEQ_STARTS_WITH_STUDY', message: 'Degree must begin with a study term', severity: 'ERROR' },
    { ruleId: 'THREE_WORK_TERMS_REQUIRED', message: 'Must complete exactly 3 work terms', severity: 'ERROR' },
  ],
  warnings: [
    { ruleId: 'LONG_SEQUENCE_WARNING', message: 'Sequence is long', severity: 'WARNING' },
  ],
  metadata: { totalTerms: 13, studyTerms: 10, workTerms: 3 },
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ jobId: '123' }),
  };
});

vi.mock('../../api/http-api-client.ts', () => ({
  api: {
    get: vi.fn(() => Promise.resolve(mockResult)),
  },
}));

describe('CoopValidationModal', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders nothing if not open', () => {
    render(<CoopValidationModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/Co-op Validation/i)).toBeNull();
  });

  it('renders modal and rules when open', async () => {
    render(<CoopValidationModal isOpen={true} onClose={vi.fn()} />);
    expect(await screen.findByText(/Co-op Validation/i)).toBeInTheDocument();
    expect(await screen.findByText(/Degree must begin with a study term/i)).toBeInTheDocument();
    expect(await screen.findByText(/Must complete exactly 3 work terms/i)).toBeInTheDocument();
    expect(await screen.findByText(/Sequence is long/i)).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<CoopValidationModal isOpen={true} onClose={onClose} />);
    // Find the backdrop by class
    const backdrop = document.querySelector('.coop-modal-backdrop');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<CoopValidationModal isOpen={true} onClose={onClose} />);
    const closeBtn = await screen.findByLabelText(/close insights modal/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
