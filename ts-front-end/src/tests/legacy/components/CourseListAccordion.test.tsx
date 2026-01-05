import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CourseListAccordion from '../../../legacy/components/CourseListAccordion';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock react-bootstrap components
vi.mock('react-bootstrap/Accordion', () => {
  const AccordionMock = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="accordion" {...props}>{children}</div>;
  AccordionMock.Item = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="accordion-item" {...props}>{children}</div>;
  AccordionMock.Header = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="accordion-header" {...props}>{children}</div>;
  AccordionMock.Body = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="accordion-body" {...props}>{children}</div>;
  return { __esModule: true, default: AccordionMock };
});
vi.mock('react-bootstrap/Card', () => {
  const CardMock = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="card" {...props}>{children}</div>;
  CardMock.Body = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="card-body" {...props}>{children}</div>;
  CardMock.Title = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="card-title" {...props}>{children}</div>;
  CardMock.Subtitle = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="card-subtitle" {...props}>{children}</div>;
  CardMock.Text = ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="card-text" {...props}>{children}</div>;
  return { __esModule: true, default: CardMock };
});
vi.mock('react-bootstrap/Container', () => ({
  __esModule: true,
  default: ({ children, ...props }: { children?: ReactNode; [key: string]: any }) => <div data-testid="container" {...props}>{children}</div>,
}));

const mockSetSelectedCourse: jest.Mock | ReturnType<typeof vi.fn> = vi.fn();

const baseCourse = {
  _id: 'COMP248',
  title: 'Programming I',
  credits: 3,
  description: 'Description',
  offeredIn: ['Fall'],
  prerequisites: [],
  corequisites: [],
};

const courseList = [
  {
    name: 'Core Courses',
    courses: [
      { ...baseCourse },
      { ...baseCourse, _id: 'COMP249', title: 'Programming II', credits: 4 },
    ],
    subcourses: [
      {
        name: 'Electives',
        courses: [
          { ...baseCourse, _id: 'COMP345', title: 'Principles of Programming Languages', credits: 3 },
        ],
        subcourseTitle: 'Elective Group',
        subcourseCredits: 6,
      },
    ],
    subcourseTitle: 'Electives',
    subcourseCredits: 6,
  },
];

describe('CourseListAccordion', () => {
  beforeEach(() => {
    mockSetSelectedCourse.mockClear();
  });

  it('renders all course sections and courses', () => {
    render(
      <CourseListAccordion
        courseList={courseList}
        selectedCourse={null}
        setSelectedCourse={mockSetSelectedCourse}
      />
    );
    // Section
    expect(screen.getByText('Core Courses')).toBeInTheDocument();
    // Courses
    expect(screen.getByText('COMP 248')).toBeInTheDocument();
    expect(screen.getByText('COMP 249')).toBeInTheDocument();
    expect(screen.getAllByText('3 credits')).toHaveLength(2);
    expect(screen.getByText('4 credits')).toBeInTheDocument();
    expect(screen.getByText('Programming I')).toBeInTheDocument();
    expect(screen.getByText('Programming II')).toBeInTheDocument();
  });

  it('highlights the selected course', () => {
    render(
      <CourseListAccordion
        courseList={courseList}
        selectedCourse={courseList[0].courses[1]}
        setSelectedCourse={mockSetSelectedCourse}
      />
    );
    const selectedCard = screen.getAllByTestId('card').find((card: HTMLElement) => card.style.backgroundColor === 'lightgray');
    expect(selectedCard).toBeDefined();
  });

  it('calls setSelectedCourse when a course is clicked', () => {
    render(
      <CourseListAccordion
        courseList={courseList}
        selectedCourse={null}
        setSelectedCourse={mockSetSelectedCourse}
      />
    );
    const courseCard: HTMLElement | null = screen.getByText('COMP 248').closest('[data-testid="card"]');
    if (!courseCard) throw new Error('Course card not found');
    fireEvent.click(courseCard);
    expect(mockSetSelectedCourse).toHaveBeenCalledWith(courseList[0].courses[0]);
  });

  it('renders subcourses and their titles/credits', () => {
    render(
      <CourseListAccordion
        courseList={courseList}
        selectedCourse={null}
        setSelectedCourse={mockSetSelectedCourse}
      />
    );
    expect(screen.getAllByText('Electives')).toHaveLength(2);
    expect(screen.getByText(/Minimum of 6 credits/)).toBeInTheDocument();
    expect(screen.getByText('COMP 345')).toBeInTheDocument();
    expect(screen.getByText('Principles of Programming Languages')).toBeInTheDocument();
  });

  it('renders with empty courseList', () => {
    render(
      <CourseListAccordion
        courseList={[]}
        selectedCourse={null}
        setSelectedCourse={mockSetSelectedCourse}
      />
    );
    expect(screen.getByTestId('accordion')).toBeInTheDocument();
  });
});
