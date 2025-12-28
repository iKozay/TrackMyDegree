import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '../../../src/pages/LandingPage';

vi.mock('../../../src/legacy/pages/LandingPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-landing-page">Legacy Landing Page</div>,
}));

describe('LandingPage', () => {
  it('renders the legacy landing page', () => {
    render(<LandingPage />);
    expect(screen.getByTestId('legacy-landing-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Landing Page')).toBeInTheDocument();
  });
});
