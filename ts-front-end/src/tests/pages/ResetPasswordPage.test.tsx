import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResetPasswordPage from '../../../src/pages/ResetPasswordPage';

vi.mock('../../../src/legacy/pages/ResetPassPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-reset-pass-page">Legacy Reset Password Page</div>,
}));

describe('ResetPasswordPage', () => {
  it('renders the legacy reset password page', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByTestId('legacy-reset-pass-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Reset Password Page')).toBeInTheDocument();
  });
});
