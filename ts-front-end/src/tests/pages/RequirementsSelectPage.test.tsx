import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequirementsSelectPage from '../../pages/RequirementsSelectPage';

vi.mock('../../legacy/pages/RequirementsSelectPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-requirements-select-page">Legacy Requirements Select Page</div>,
}));

describe('RequirementsSelectPage', () => {
  it('renders the legacy requirements select page', () => {
    render(<RequirementsSelectPage />);
    expect(screen.getByTestId('legacy-requirements-select-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Requirements Select Page')).toBeInTheDocument();
  });
});
