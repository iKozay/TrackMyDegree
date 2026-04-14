import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import ForbiddenPage from '../../../legacy/pages/Forbidden_403';

/* ---------------- Mock react-router-dom (useNavigate) ---------------- */
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const renderPage= () => {
  return render(<MemoryRouter><ForbiddenPage /></MemoryRouter>);
}

/* ---------------- Tests ---------------- */
describe('ForbiddenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders 403 error message, SVG icon, and go back button', () => {
    const { container } = renderPage();

    const button = screen.getByRole('button', { name: /Go Back To Home Page/i });
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    expect(screen.getByText('403 - Forbidden')).toBeInTheDocument();
    expect(screen.getByText('Access to this resource is permanently denied.')).toBeInTheDocument();
    expect(screen.getByText('Contact your administrator if you believe this is an error.')).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  test('clicking button navigates to home page', () => {
    renderPage();

    const button = screen.getByRole('button', { name: /Go Back To Home Page/i });
    fireEvent.click(button);

    expect(navigate).toHaveBeenCalledWith('/');
  });
});
