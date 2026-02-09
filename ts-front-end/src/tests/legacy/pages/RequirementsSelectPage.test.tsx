// Import the programs data for use in tests
import programs from '../../../legacy/data/requirementsPrograms';

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequirementsSelectPage from '../../../legacy/pages/RequirementsSelectPage';
import { AuthProvider } from '../../../providers/authProvider';
import { api } from '../../../api/http-api-client';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Mock API client
vi.mock('../../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Helper function to render with router and auth provider
const renderWithRouter = (userRole = 'student') => {
  // Mock /auth/me response
  (api.get as ReturnType<typeof vi.fn>).mockImplementation((url) => {
    if (url === '/auth/me') {
      return Promise.resolve({
        user: {
          _id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          role: userRole,
        },
      });
    }
    if (url === '/api/credit-forms' || url === '/credit-forms') {
      return Promise.resolve({ forms: programs });
    }
    return Promise.reject(new Error('Not found'));
  });

  // Since global fetch is also used in the component for credit-forms, we need to mock that too 
  // OR update the component to use the api client.
  // The component currently uses `fetch`. Let's mock global fetch.
  global.fetch = vi.fn().mockImplementation((url) => {
    if (url.toString().includes('/credit-forms')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ forms: programs }),
      });
    }
    return Promise.reject(new Error('Not found'));
  });

  return render(
    <AuthProvider>
      <MemoryRouter>
        <RequirementsSelectPage />
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('RequirementsSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders the page heading and description', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Missing Requirements')).toBeInTheDocument();
      });
      expect(screen.getByText(/Select your program to view and fill out the credit count form/)).toBeInTheDocument();
    });

    test('renders all program cards', async () => {
      renderWithRouter();

      await waitFor(() => {
        programs.forEach((program: { title: string; subtitle: string }) => {
          expect(screen.getByText(program.title)).toBeInTheDocument();
          expect(screen.getByText(program.subtitle)).toBeInTheDocument();
        });
      });
    });

    test('renders exactly 5 program cards', async () => {
      renderWithRouter();

      await waitFor(() => {
        const programCards = screen.getAllByRole('button');
        expect(programCards).toHaveLength(5);
      });
    });

    test('renders info card about credit count forms', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('About Credit Count Forms')).toBeInTheDocument();
      });
      expect(screen.getByText(/Use these forms to manually track your progress/)).toBeInTheDocument();
    });
  });

  describe('Admin/Advisor Functionality', () => {
    test('renders "Manage Forms" button for admin', async () => {
      renderWithRouter('admin');

      await waitFor(() => {
        expect(screen.getByText(/Manage Forms/)).toBeInTheDocument();
      });
    });

    test('renders "Manage Forms" button for advisor', async () => {
      renderWithRouter('advisor');

      await waitFor(() => {
        expect(screen.getByText(/Manage Forms/)).toBeInTheDocument();
      });
    });

    test('does NOT render "Manage Forms" button for student', async () => {
      renderWithRouter('student');

      await waitFor(() => {
        expect(screen.queryByText(/Manage Forms/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Functionality', () => {
    test('clicking Software Engineering card navigates to correct route', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Software Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Software Engineering').closest('div[role="button"]') as HTMLElement;
      if (!card) throw new Error('Card not found');
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/software-engineering');
    });

    test('clicking Computer Science card navigates to correct route', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Computer Science')).toBeInTheDocument();
      });

      const card = screen.getByText('Computer Science').closest('div[role="button"]') as HTMLElement;
      if (!card) throw new Error('Card not found');
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/computer-science');
    });
  });

  describe('Card Interactions', () => {
    test('card applies hover effect on mouse enter', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Software Engineering')).toBeInTheDocument();
      });

      const card = screen.getByText('Software Engineering').closest('div[role="button"]') as HTMLElement;
      if (!card) throw new Error('Card not found');
      // Initial state
      expect(card.style.transform).toBe('');
      // Hover
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('translateY(-2px)');
      expect(card.style.boxShadow).toBe('0 6px 14px rgba(0,0,0,.08)');
    });

    test('card removes hover effect on mouse leave', async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText('Computer Science')).toBeInTheDocument();
      });

      const card = screen.getByText('Computer Science').closest('div[role="button"]') as HTMLElement;
      if (!card) throw new Error('Card not found');
      // Hover first
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('translateY(-2px)');
      // Leave
      fireEvent.mouseLeave(card);
      expect(card.style.transform).toBe('none');
      expect(card.style.boxShadow).toBe('0 1px 4px rgba(0,0,0,.06)');
    });
  });

  describe('Accessibility', () => {
    test('all program cards have role="button"', async () => {
      renderWithRouter();

      await waitFor(() => {
        const cards = screen.getAllByRole('button');
        expect(cards.length).toBeGreaterThan(0);
        cards.forEach(card => {
          expect(card).toHaveAttribute('role', 'button');
        });
      });
    });
  });
});
