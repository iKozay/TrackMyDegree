import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForbiddenPage from '../../../src/pages/ForbiddenPage';

vi.mock('../../../src/legacy/pages/Forbidden_403.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-forbidden-page">Legacy Forbidden Page</div>,
}));

describe('ForbiddenPage', () => {
  it('renders the legacy forbidden page', () => {
    render(<ForbiddenPage />);
    expect(screen.getByTestId('legacy-forbidden-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Forbidden Page')).toBeInTheDocument();
  });
});
