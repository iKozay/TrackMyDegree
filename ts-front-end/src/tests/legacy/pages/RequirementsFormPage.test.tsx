import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequirementsFormPage from '../../../legacy/pages/RequirementsFormPage';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

// Helper function to render component with router
const renderWithRouter = (programId: string) => {
  return render(
    <MemoryRouter initialEntries={[`/requirements/${programId}`]}>
      <Routes>
        <Route path="/requirements/:programId" element={<RequirementsFormPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('RequirementsFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock globalThis.alert
    vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    (globalThis.alert as any).mockRestore();
  });

  describe('Component Rendering', () => {
    test('renders the page with software engineering program', () => {
      renderWithRouter('software-engineering');
      
      expect(screen.getByText('Credit Count Form')).toBeInTheDocument();
      expect(screen.getByText(/Software Engineering/)).toBeInTheDocument();
      expect(screen.getByText(/Manually track your degree progress/)).toBeInTheDocument();
    });

    test('renders the page with computer science program', () => {
      renderWithRouter('computer-science');
      
      expect(screen.getByText('Credit Count Form')).toBeInTheDocument();
      
      // Check for the exact program title in the paragraph
      expect(screen.getByText(/Computer Science — Manually track/)).toBeInTheDocument();
      
      // Check iframe title which should be unique
      const iframe = screen.getByTitle('Computer Science credit count form');
      expect(iframe).toBeInTheDocument();
    });

    test('renders the page with double major programs', () => {
      renderWithRouter('comp-health-life-science');
      
      expect(screen.getByText(/Computer Science and Health & Life Science/)).toBeInTheDocument();
    });

    test('renders error message for unknown program', () => {
      renderWithRouter('non-existent-program');
      
      expect(screen.getByText('Credit Count Form')).toBeInTheDocument();
      expect(screen.getByText(/Unknown program:/)).toBeInTheDocument();
      expect(screen.getByText('non-existent-program')).toBeInTheDocument();
    });

    test('renders all action buttons', () => {
      renderWithRouter('software-engineering');
      
      expect(screen.getByText(/Back to Form Selection/)).toBeInTheDocument();
      expect(screen.getByText(/Save Form/)).toBeInTheDocument();
      expect(screen.getByText(/Clear Form/)).toBeInTheDocument();
      expect(screen.getByText(/Download\/Print/)).toBeInTheDocument();
    });

    test('renders iframe with correct PDF path', () => {
      renderWithRouter('software-engineering');
      
      const iframe = screen.getByTitle('Software Engineering credit count form');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('src', expect.stringContaining('/credit-forms/software-engineering.pdf'));
    });

    test('renders iframe for all program types', () => {
      const testCases = [
        { id: 'software-engineering', title: 'Software Engineering', pdf: 'software-engineering.pdf' },
        { id: 'computer-science', title: 'Computer Science', pdf: 'computer-science.pdf' },
        { id: 'comp-arts', title: 'Computer Science and Computer Arts', pdf: 'comp-arts-double-major.pdf' },
      ];

      testCases.forEach(({ id, title, pdf }) => {
        const { unmount } = renderWithRouter(id);
        const iframe = screen.getByTitle(`${title} credit count form`);
        expect(iframe).toHaveAttribute('src', expect.stringContaining(pdf));
        unmount();
      });
    });
  });

  describe('Button Interactions', () => {
    test('Back button navigates to /requirements', () => {
      renderWithRouter('software-engineering');
      
      const backButton = screen.getAllByText(/Back to Form Selection/)[0];
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/requirements');
    });

    test('Back button works on error page', () => {
      renderWithRouter('non-existent-program');
      
      const backButton = screen.getByText(/Back to Form Selection/);
      fireEvent.click(backButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/requirements');
    });

    test('Save button shows placeholder alert message', () => {
      renderWithRouter('computer-science');
      
      const saveButton = screen.getByText(/Save Form/);
      fireEvent.click(saveButton);
      
      expect(globalThis.alert).toHaveBeenCalledWith('Saving will require login—placeholder for now.');
    });

    test('Clear button updates iframe src with cache buster', () => {
      renderWithRouter('software-engineering');
      
      const iframe: HTMLIFrameElement  = screen.getByTitle('Software Engineering credit count form');
      const initialSrc = iframe.src;
      
      const clearButton = screen.getByText(/Clear Form/);
      fireEvent.click(clearButton);
      
      // Check that src has changed (cache buster added)
      expect(iframe.src).not.toBe(initialSrc);
      expect(iframe.src).toContain('?v=1');
    });

    test('Multiple clear clicks increment cache buster', () => {
      renderWithRouter('comp-data-science');
      
      const clearButton = screen.getByText(/Clear Form/);
      const iframe: HTMLIFrameElement  = screen.getByTitle('Computer Science and Data Science credit count form');
      
      fireEvent.click(clearButton);
      expect(iframe.src).toContain('?v=1');
      
      fireEvent.click(clearButton);
      expect(iframe.src).toContain('?v=2');
      
      fireEvent.click(clearButton);
      expect(iframe.src).toContain('?v=3');
    });

    test('Download/Print button attempts to print iframe', () => {
      renderWithRouter('software-engineering');
      
      // Mock iframe ref methods
      const mockPrint = vi.fn();
      const mockFocus = vi.fn();
      
      const iframe = screen.getByTitle('Software Engineering credit count form');
      Object.defineProperty(iframe, 'contentWindow', {
        value: {
          print: mockPrint,
          focus: mockFocus,
        },
        writable: true,
        configurable: true,
      });
      
      const printButton = screen.getByText(/Download\/Print/);
      fireEvent.click(printButton);
      
      expect(mockFocus).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    test('Download/Print handles missing contentWindow gracefully', () => {
      renderWithRouter('computer-science');
      
      const iframe = screen.getByTitle('Computer Science credit count form');
      
      // Mock contentWindow to throw error when accessing print
      Object.defineProperty(iframe, 'contentWindow', {
        get: () => {
          throw new Error('Cannot access contentWindow');
        },
        configurable: true,
      });
      
      const printButton = screen.getByText(/Download\/Print/);
      fireEvent.click(printButton);
      
      expect(globalThis.alert).toHaveBeenCalledWith(
        expect.stringContaining('Unable to trigger print automatically')
      );
    });
  });

  describe('ActionButton Component', () => {
    test('applies hover effects on mouse enter and leave', () => {
      renderWithRouter('software-engineering');
      
      const button = screen.getByText(/Back to Form Selection/);
      
      // Initial state
      expect(button.style.transform).toBe('');
      
      // Hover
      fireEvent.mouseEnter(button);
      expect(button.style.transform).toBe('translateY(-1px)');
      
      // Leave
      fireEvent.mouseLeave(button);
      expect(button.style.transform).toBe('none');
    });

    test('solid variant button (Save) has correct styles', () => {
      renderWithRouter('software-engineering');
      
      const saveButton = screen.getByText(/Save Form/);
      
      expect(saveButton.style.background).toBe('rgb(122, 0, 25)');
      expect(saveButton.style.color).toBe('rgb(255, 255, 255)');
      // Border can be in hex or rgb format
      expect(saveButton.style.border).toMatch(/2px solid (#7a0019|rgb\(122, 0, 25\))/);
    });

    test('outline variant buttons have correct styles', () => {
      renderWithRouter('software-engineering');
      
      const backButton = screen.getByText(/Back to Form Selection/);
      
      expect(backButton.style.background).toBe('rgb(255, 255, 255)');
      expect(backButton.style.color).toBe('rgb(17, 17, 17)');
      // Border can be in hex or rgb format
      expect(backButton.style.border).toMatch(/2px solid (#7a0019|rgb\(122, 0, 25\))/);
    });

    test('all buttons have consistent base styles', () => {
      renderWithRouter('software-engineering');
      
      const buttons = [
        screen.getByText(/Back to Form Selection/),
        screen.getByText(/Save Form/),
        screen.getByText(/Clear Form/),
        screen.getByText(/Download\/Print/),
      ];

      buttons.forEach(button => {
        expect(button.style.cursor).toBe('pointer');
        expect(button.style.borderRadius).toBe('12px');
        expect(button.style.fontWeight).toBe('600');
      });
    });
  });

  describe('useMemo Optimization', () => {
    test('program is memoized and correctly retrieved', () => {
      const { rerender } = renderWithRouter('software-engineering');
      
      expect(screen.getByText(/Software Engineering/)).toBeInTheDocument();
      
      // Rerender with same programId shouldn't cause issues
      rerender(
        <MemoryRouter initialEntries={['/requirements/software-engineering']}>
          <Routes>
            <Route path="/requirements/:programId" element={<RequirementsFormPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText(/Software Engineering/)).toBeInTheDocument();
    });

    test('program changes when programId changes', () => {
        const { unmount } = renderWithRouter('software-engineering');
      expect(screen.getByTitle('Software Engineering credit count form')).toBeInTheDocument();
      unmount();
            
      renderWithRouter('computer-science');
        expect(screen.getByTitle('Computer Science credit count form')).toBeInTheDocument();
        expect(screen.queryByTitle('Software Engineering credit count form')).not.toBeInTheDocument();
        });
  });

  describe('Edge Cases', () => {
    test('handles undefined programId', () => {
      render(
        <MemoryRouter initialEntries={['/requirements/']}>
          <Routes>
            <Route path="/requirements/:programId?" element={<RequirementsFormPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByText(/Unknown program:/)).toBeInTheDocument();
    });

    test('handles empty string programId', () => {
      render(
        <MemoryRouter initialEntries={['/requirements/']}>
          <Routes>
            <Route path="/requirements/:programId?" element={<RequirementsFormPage />} />
            <Route path="/requirements/" element={<RequirementsFormPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      // Empty programId should show unknown program or render nothing
      // Check if either error message appears or page renders empty
      const unknownText = screen.queryByText(/Unknown program:/);
      if (unknownText) {
        expect(unknownText).toBeInTheDocument();
      } else {
        // If no error, the page might render with empty content
        expect(screen.getByText('Credit Count Form')).toBeInTheDocument();
      }
    });

    test('handles programId with special characters', () => {
      renderWithRouter('test-program-@#$%');
      
      expect(screen.getByText(/Unknown program:/)).toBeInTheDocument();
    });

    test('iframe has correct attributes and PDF viewer parameters', () => {
      renderWithRouter('software-engineering');
      
      const iframe = screen.getByTitle('Software Engineering credit count form');
      
      expect(iframe).toHaveAttribute('src', expect.stringContaining('#toolbar=1&navpanes=0&scrollbar=1'));
      expect(iframe.style.width).toBe('100%');
      expect(iframe.style.height).toBe('80vh');
      expect(iframe.style.border).toBe('0px');
    });

    test('cache buster is initially not present in src', () => {
      renderWithRouter('software-engineering');
      
      const iframe: HTMLIFrameElement  = screen.getByTitle('Software Engineering credit count form');
      
      // Initial load should not have cache buster
      expect(iframe.src).toContain('/credit-forms/software-engineering.pdf');
      expect(iframe.src).not.toContain('?v=');
    });
  });

  describe('Accessibility', () => {
    test('buttons are keyboard accessible', () => {
      renderWithRouter('software-engineering');
      
      const buttons = [
        screen.getByText(/Back to Form Selection/),
        screen.getByText(/Save Form/),
        screen.getByText(/Clear Form/),
        screen.getByText(/Download\/Print/),
      ];

      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button');
        expect(button.style.cursor).toBe('pointer');
      });
    });

    test('iframe has descriptive title for each program', () => {
      const testCases = [
        { id: 'software-engineering', title: 'Software Engineering credit count form' },
        { id: 'computer-science', title: 'Computer Science credit count form' },
        { id: 'comp-arts', title: 'Computer Science and Computer Arts credit count form' },
      ];

      testCases.forEach(({ id, title }) => {
        const { unmount } = renderWithRouter(id);
        const iframe = screen.getByTitle(title);
        expect(iframe).toHaveAttribute('title', title);
        unmount();
      });
    });

    test('page has clear heading structure', () => {
      renderWithRouter('software-engineering');
      
      const heading = screen.getByText('Credit Count Form');
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H2');
    });
  });

  describe('Integration Tests', () => {
    test('complete user flow: navigate, clear, and attempt print', () => {
      renderWithRouter('computer-science');
      
      // Verify initial state
      expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
      
      // Clear form
      const clearButton = screen.getByText(/Clear Form/);
      fireEvent.click(clearButton);
      
      const iframe: HTMLIFrameElement = screen.getByTitle('Computer Science credit count form');
      expect(iframe.src).toContain('?v=1');
      
      // Mock contentWindow for print test
      const mockPrint = vi.fn();
      const mockFocus = vi.fn();
      Object.defineProperty(iframe, 'contentWindow', {
        value: {
          print: mockPrint,
          focus: mockFocus,
        },
        writable: true,
        configurable: true,
      });
      
      // Attempt print
      const printButton = screen.getByText(/Download\/Print/);
      fireEvent.click(printButton);
      expect(mockPrint).toHaveBeenCalled();
      
      // Navigate back
      const backButton = screen.getAllByText(/Back to Form Selection/)[0];
      fireEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith('/requirements');
    });

    test('switching between different programs works correctly', () => {
      // Render first program
      const { unmount: unmount1 } = renderWithRouter('software-engineering');
      expect(screen.getByText(/Software Engineering/)).toBeInTheDocument();
      unmount1();
      
      // Render second program
      const { unmount: unmount2 } = renderWithRouter('comp-data-science');
      expect(screen.getByText(/Computer Science and Data Science/)).toBeInTheDocument();
      unmount2();
      
      // Render third program
      renderWithRouter('comp-health-life-science');
      expect(screen.getByText(/Computer Science and Health & Life Science/)).toBeInTheDocument();
    });
  });
});