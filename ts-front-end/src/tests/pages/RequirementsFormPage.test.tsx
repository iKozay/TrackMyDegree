import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequirementsFormPage from '../../../src/pages/RequirementsFormPage';

vi.mock('../../../src/legacy/pages/RequirementsFormPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-requirements-form-page">Legacy Requirements Form Page</div>,
}));

describe('RequirementsFormPage', () => {
  it('renders the legacy requirements form page', () => {
    render(<RequirementsFormPage />);
    expect(screen.getByTestId('legacy-requirements-form-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Requirements Form Page')).toBeInTheDocument();
  });
});
