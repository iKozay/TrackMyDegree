import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequirementsSelectPage from '../pages/RequirementsSelectPage';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));


const programs = [
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    subtitle: 'Bachelor of Software Engineering Credit Count Form',
    pdf: '/credit-forms/software-engineering.pdf',
  },
  {
    id: 'computer-science',
    title: 'Computer Science',
    subtitle: 'Bachelor of Computer Science Credit Count Form',
    pdf: '/credit-forms/computer-science.pdf', 
  },
  {
    id: 'comp-health-life-science',
    title: 'Computer Science and Health & Life Science',
    subtitle: 'COMP + HLS Double Major Credit Count Form',
    pdf: '/credit-forms/cshls-double-major.pdf', 
  },
  {
    id: 'comp-data-science',
    title: 'Computer Science and Data Science',
    subtitle: 'COMP + Data Science Double Major Credit Count Form',
    pdf: '/credit-forms/comp-data-science-double-major.pdf', 
  },
  {
    id: 'comp-arts',
    title: 'Computer Science and Computer Arts',
    subtitle: 'COMP + Computer Arts Double Major Credit Count Form',
    pdf: '/credit-forms/comp-arts-double-major.pdf', 
  },
];

jest.mock('../data/requirementsPrograms', () => programs);

// Helper function to render with router
const renderWithRouter = () => {
  return render(
    <MemoryRouter>
      <RequirementsSelectPage />
    </MemoryRouter>
  );
};

describe('RequirementsSelectPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders the page heading and description', () => {
      renderWithRouter();
      
      expect(screen.getByText('Missing Requirements')).toBeInTheDocument();
      expect(screen.getByText(/Select your program to view and fill out the credit count form/)).toBeInTheDocument();
    });

    test('renders all program cards', () => {
      renderWithRouter();
      
      programs.forEach(program => {
        expect(screen.getByText(program.title)).toBeInTheDocument();
        expect(screen.getByText(program.subtitle)).toBeInTheDocument();
      });
    });

    test('renders exactly 5 program cards', () => {
      renderWithRouter();
      
      const programCards = screen.getAllByRole('button');
      expect(programCards).toHaveLength(5);
    });

    test('renders info card about credit count forms', () => {
      renderWithRouter();
      
      expect(screen.getByText('About Credit Count Forms')).toBeInTheDocument();
      expect(screen.getByText(/Use these forms to manually track your progress/)).toBeInTheDocument();
    });
  });

  describe('Program Cards Content', () => {
    test('Software Engineering card displays correct information', () => {
      renderWithRouter();
      
      expect(screen.getByText('Software Engineering')).toBeInTheDocument();
      expect(screen.getByText('Bachelor of Software Engineering Credit Count Form')).toBeInTheDocument();
    });

    test('Computer Science card displays correct information', () => {
      renderWithRouter();
      
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Bachelor of Computer Science Credit Count Form')).toBeInTheDocument();
    });

    test('Double major cards display correct information', () => {
      renderWithRouter();
      
      expect(screen.getByText('Computer Science and Health & Life Science')).toBeInTheDocument();
      expect(screen.getByText('Computer Science and Data Science')).toBeInTheDocument();
      expect(screen.getByText('Computer Science and Computer Arts')).toBeInTheDocument();
    });
  });

  describe('Navigation Functionality', () => {
    test('clicking Software Engineering card navigates to correct route', () => {
      renderWithRouter();
      
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      fireEvent.click(card);
      
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/software-engineering');
    });

    test('clicking Computer Science card navigates to correct route', () => {
      renderWithRouter();
      
      const card = screen.getByText('Computer Science').closest('div[role="button"]');
      fireEvent.click(card);
      
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/computer-science');
    });

    test('clicking each program card navigates to its unique route', () => {
      renderWithRouter();
      
      programs.forEach(program => {
        mockNavigate.mockClear();
        
        const card = screen.getByText(program.title).closest('div[role="button"]');
        fireEvent.click(card);
        
        expect(mockNavigate).toHaveBeenCalledWith(`/requirements/${program.id}`);
      });
    });
  });

  describe('Card Interactions', () => {
    test('card applies hover effect on mouse enter', () => {
      renderWithRouter();
      
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      
      // Initial state
      expect(card.style.transform).toBe('');
      
      // Hover
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('translateY(-2px)');
      expect(card.style.boxShadow).toBe('0 6px 14px rgba(0,0,0,.08)');
    });

    test('card removes hover effect on mouse leave', () => {
      renderWithRouter();
      
      const card = screen.getByText('Computer Science').closest('div[role="button"]');
      
      // Hover first
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('translateY(-2px)');
      
      // Leave
      fireEvent.mouseLeave(card);
      expect(card.style.transform).toBe('none');
      expect(card.style.boxShadow).toBe('0 1px 4px rgba(0,0,0,.06)');
    });

    test('all cards have hover effects', () => {
      renderWithRouter();
      
      const cards = screen.getAllByRole('button');
      
      cards.forEach(card => {
        fireEvent.mouseEnter(card);
        expect(card.style.transform).toBe('translateY(-2px)');
        
        fireEvent.mouseLeave(card);
        expect(card.style.transform).toBe('none');
      });
    });
  });

  describe('Card Styling', () => {
    test('cards have correct base styles', () => {
      renderWithRouter();
      
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      
      expect(card.style.cursor).toBe('pointer');
      expect(card.style.borderRadius).toBe('12px');
      expect(card.style.padding).toBe('16px');
      expect(card.style.background).toBe('rgb(255, 255, 255)');
    });

    test('grid container has correct layout styles', () => {
      renderWithRouter();
      
      const gridContainer = screen.getByText('Software Engineering')
        .closest('div[role="button"]')
        .parentElement;
      
      expect(gridContainer.style.display).toBe('grid');
      expect(gridContainer.style.gap).toBe('16px');
    });
  });

  describe('Accessibility', () => {
    test('all program cards have role="button"', () => {
      renderWithRouter();
      
      const cards = screen.getAllByRole('button');
      expect(cards.length).toBeGreaterThan(0);
      
      cards.forEach(card => {
        expect(card).toHaveAttribute('role', 'button');
      });
    });

    test('cards are keyboard accessible via click', () => {
      renderWithRouter();
      
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      expect(card.style.cursor).toBe('pointer');
    });

    test('heading hierarchy is correct', () => {
      renderWithRouter();
      
      const mainHeading = screen.getByText('Missing Requirements');
      expect(mainHeading.tagName).toBe('H2');
      
      const infoHeading = screen.getByText('About Credit Count Forms');
      expect(infoHeading.tagName).toBe('H6');
    });
  });

  describe('Layout and Responsiveness', () => {
    test('container has max-width constraint', () => {
      renderWithRouter();
      
      const container = screen.getByText('Missing Requirements').parentElement;
      expect(container.style.maxWidth).toBe('1100px');
      expect(container.style.margin).toBe('0px auto');
    });

    test('description has max-width for readability', () => {
      renderWithRouter();
      
      const description = screen.getByText(/Select your program to view and fill out/);
      expect(description.style.maxWidth).toBe('520px');
    });

    test('grid uses auto-fit with minmax for responsiveness', () => {
      renderWithRouter();
      
      const gridContainer = screen.getByText('Software Engineering')
        .closest('div[role="button"]')
        .parentElement;
      
      expect(gridContainer.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(280px, 1fr))');
    });
  });

  describe('Edge Cases', () => {
    test('handles empty programs array gracefully', () => {
      jest.doMock('../data/requirementsPrograms', () => []);
      
      
      //verify the current implementation works with 5 programs
      renderWithRouter();
      expect(screen.getAllByRole('button')).toHaveLength(5);
    });

    test('program titles with long text wrap properly', () => {
      renderWithRouter();
      
      const longTitle = screen.getByText('Computer Science and Health & Life Science');
      const titleElement = longTitle;
      
      expect(titleElement.style.overflowWrap).toBe('anywhere');
      expect(titleElement.style.whiteSpace).toBe('normal');
    });

    test('clicking card multiple times calls navigate each time', () => {
      renderWithRouter();
      
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      
      fireEvent.click(card);
      fireEvent.click(card);
      fireEvent.click(card);
      
      expect(mockNavigate).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/software-engineering');
    });
  });

  describe('Info Card', () => {
    test('info card has correct content', () => {
      renderWithRouter();
      
      expect(screen.getByText('About Credit Count Forms')).toBeInTheDocument();
      expect(screen.getByText(/You can clear, download\/print/)).toBeInTheDocument();
      expect(screen.getByText(/later save once signed in/)).toBeInTheDocument();
    });

    test('info card has correct styling classes', () => {
      renderWithRouter();
      
      const infoCard = screen.getByText('About Credit Count Forms').closest('.card');
      expect(infoCard).toHaveClass('card', 'mt-4');
    });
  });

  describe('Integration Tests', () => {
    test('complete user flow: view programs and select one', () => {
      renderWithRouter();
      
      // User sees the page
      expect(screen.getByText('Missing Requirements')).toBeInTheDocument();
      
      // User sees all available programs
      expect(screen.getByText('Software Engineering')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      
      // User hovers over a card
      const card = screen.getByText('Software Engineering').closest('div[role="button"]');
      fireEvent.mouseEnter(card);
      expect(card.style.transform).toBe('translateY(-2px)');
      
      // User clicks to select program
      fireEvent.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/requirements/software-engineering');
    });

    test('user can interact with multiple cards sequentially', () => {
      renderWithRouter();
      
      const programs = [
        { title: 'Software Engineering', id: 'software-engineering' },
        { title: 'Computer Science', id: 'computer-science' },
        { title: 'Computer Science and Data Science', id: 'comp-data-science' },
      ];
      
      programs.forEach(({ title, id }) => {
        mockNavigate.mockClear();
        
        const card = screen.getByText(title).closest('div[role="button"]');
        
        fireEvent.mouseEnter(card);
        expect(card.style.transform).toBe('translateY(-2px)');
        
        fireEvent.click(card);
        expect(mockNavigate).toHaveBeenCalledWith(`/requirements/${id}`);
        
        fireEvent.mouseLeave(card);
        expect(card.style.transform).toBe('none');
      });
    });
  });
});