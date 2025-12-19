import { describe, test, expect, vi } from 'vitest';
import LandingPage from '../../../legacy/pages/LandingPage';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

describe('LandingPage', () => {
  test('displays disclamer title for page correctly', () => {
    render(<LandingPage />);

    expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
  });
});
