import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForgetPasswordPage from '../../../src/pages/ForgetPasswordPage';

vi.mock('../../../src/legacy/pages/ForgotPassPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-forgot-pass-page">Legacy Forgot Password Page</div>,
}));

describe('ForgetPasswordPage', () => {
  it('renders the legacy forgot password page', () => {
    render(<ForgetPasswordPage />);
    expect(screen.getByTestId('legacy-forgot-pass-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Forgot Password Page')).toBeInTheDocument();
  });
});
