// src/test/components/CourseDetailsCard.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseDetailsCard from '../../pages/CourseListPage/components/CourseDetailsCard';

// Mock dependencies
jest.mock('../../utils/groupPrerequisites', () => ({
  groupPrerequisites: jest.fn((requisites) => {
    // Simple mock implementation
    const grouped = {};
    requisites.forEach((req) => {
      const key = req.type;
      if (!grouped[key]) grouped[key] = { type: req.type, codes: [] };
      grouped[key].codes.push(req.code);
    });
    return Object.values(grouped);
  }),
}));

jest.mock('../../components/SectionModal', () => {
  return function MockCourseSectionButton({ title }) {
    return <div data-testid="course-section-button">{title}</div>;
  };
});

describe('CourseDetailsCard Component', () => {
  const mockCourse = {
    title: 'COMP 248',
    credits: 3,
    description: 'Introduction to Programming',
    requisites: [
      { type: 'pre', code: 'MATH 200' },
      { type: 'pre', code: 'MATH 201' },
    ],
    components: 'Lecture 3h, Lab 2h',
    notes: 'Required for CS majors',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no course is provided', () => {
    it('should show no course selected message', () => {
      render(<CourseDetailsCard course={null} />);
      expect(screen.getByText('No course selected.')).toBeInTheDocument();
    });

    it('should show no course selected message for undefined', () => {
      render(<CourseDetailsCard course={undefined} />);
      expect(screen.getByText('No course selected.')).toBeInTheDocument();
    });
  });

  describe('when course is provided with showCard=true', () => {
    // it('should render course title in Card.Title', () => {
    //   render(<CourseDetailsCard course={mockCourse} showCard={true} />);
    //   expect(screen.getByText('COMP 248')).toBeInTheDocument();
    // });

    it('should render credits', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByText('Credits:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render description', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByText('Description:')).toBeInTheDocument();
      expect(screen.getByText('Introduction to Programming')).toBeInTheDocument();
    });

    it('should render prerequisites header', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByText('Prerequisites/Corequisites:')).toBeInTheDocument();
    });

    it('should render components when present', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByText('Components:')).toBeInTheDocument();
      expect(screen.getByText('Lecture 3h, Lab 2h')).toBeInTheDocument();
    });

    it('should render notes when present', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByText('Notes:')).toBeInTheDocument();
      expect(screen.getByText('Required for CS majors')).toBeInTheDocument();
    });

    it('should render wrapped in Card component', () => {
      const { container } = render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(container.querySelector('.course-display-card')).toBeInTheDocument();
    });

    it('should render CourseSectionButton', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={true} />);
      expect(screen.getByTestId('course-section-button')).toBeInTheDocument();
    });
  });

  describe('when course is provided with showCard=false', () => {
    // it('should not render Card.Title', () => {
    //   render(<CourseDetailsCard course={mockCourse} showCard={false} />);
    //   // Title text is still in the course object but not in Card.Title wrapper
    //   const titleElement = screen.queryByText('COMP 248');
    //   expect(titleElement).not.toBeInTheDocument();
    // });

    it('should still render credits', () => {
      render(<CourseDetailsCard course={mockCourse} showCard={false} />);
      expect(screen.getByText('Credits:')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not be wrapped in Card component', () => {
      const { container } = render(<CourseDetailsCard course={mockCourse} showCard={false} />);
      expect(container.querySelector('.course-display-card')).not.toBeInTheDocument();
    });

    it('should not render br tag when showCard is false', () => {
      const { container } = render(<CourseDetailsCard course={mockCourse} showCard={false} />);
      const cardText = container.querySelector('.card-text');
      expect(cardText?.querySelector('br')).not.toBeInTheDocument();
    });
  });

  describe('requisites handling', () => {
    it('should show "None" when no requisites', () => {
      const courseWithoutRequisites = { ...mockCourse, requisites: [] };
      render(<CourseDetailsCard course={courseWithoutRequisites} />);
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should show "None" when requisites is null', () => {
      const courseWithoutRequisites = { ...mockCourse, requisites: null };
      render(<CourseDetailsCard course={courseWithoutRequisites} />);
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should show "None" when requisites is undefined', () => {
      const courseWithoutRequisites = { ...mockCourse, requisites: undefined };
      render(<CourseDetailsCard course={courseWithoutRequisites} />);
      expect(screen.getByText('None')).toBeInTheDocument();
    });

    it('should render prerequisite label correctly', () => {
      render(<CourseDetailsCard course={mockCourse} />);
      expect(screen.getByText(/Prerequisite:/)).toBeInTheDocument();
    });
  });

  describe('optional fields', () => {
    it('should not render components section when not present', () => {
      const courseWithoutComponents = { ...mockCourse, components: null };
      render(<CourseDetailsCard course={courseWithoutComponents} />);
      expect(screen.queryByText('Components:')).not.toBeInTheDocument();
    });

    it('should not render notes section when not present', () => {
      const courseWithoutNotes = { ...mockCourse, notes: null };
      render(<CourseDetailsCard course={courseWithoutNotes} />);
      expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    });

    it('should handle empty string for components', () => {
      const courseWithEmptyComponents = { ...mockCourse, components: '' };
      render(<CourseDetailsCard course={courseWithEmptyComponents} />);
      expect(screen.queryByText('Components:')).not.toBeInTheDocument();
    });

    it('should handle empty string for notes', () => {
      const courseWithEmptyNotes = { ...mockCourse, notes: '' };
      render(<CourseDetailsCard course={courseWithEmptyNotes} />);
      expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
    });
  });

  describe('minimal course data', () => {
    // it('should render with only required fields', () => {
    //   const minimalCourse = {
    //     title: 'COMP 100',
    //     credits: 3,
    //     description: 'Basic course',
    //   };
    //   render(<CourseDetailsCard course={minimalCourse} />);
    //   expect(screen.getByText('COMP 100')).toBeInTheDocument();
    //   expect(screen.getByText('3')).toBeInTheDocument();
    //   expect(screen.getByText('Basic course')).toBeInTheDocument();
    //   expect(screen.getByText('None')).toBeInTheDocument(); // For prerequisites
    // });
  });

  describe('default props', () => {
    it('should use showCard=true by default', () => {
      const { container } = render(<CourseDetailsCard course={mockCourse} />);
      expect(container.querySelector('.course-display-card')).toBeInTheDocument();
    });
  });
});
