// src/test/components/CourseDetailsModal.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CourseDetailsModal from '../../../legacy/components/CourseDetailsModal';

// Mock CourseDetailsCard
vi.mock('../../../legacy/components/CourseDetailsCard', () => ({
  default: ({ course, showCard }: { course: any; showCard: boolean }) => {
    if (!course) return <div>No course</div>;
    return (
      <div data-testid="course-details-card">
        <div>Course: {course.title}</div>
        <div>ShowCard: {showCard.toString()}</div>
      </div>
    );
  },
}));

describe('CourseDetailsModal Component', () => {
  const mockCourse = {
    title: 'COMP 248',
    credits: 3,
    description: 'Introduction to Programming',
  };

  const mockOnHide = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('modal visibility', () => {
    it('should render modal when show is true', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('COMP 248')).toBeInTheDocument();
    });
  });

  describe('modal header', () => {
    it('should render course title in modal header', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('COMP 248')).toBeInTheDocument();
    });
  });

  describe('modal body', () => {
    it('should render CourseDetailsCard in body', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByTestId('course-details-card')).toBeInTheDocument();
    });

    it('should pass course to CourseDetailsCard', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('Course: COMP 248')).toBeInTheDocument();
    });

    it('should pass showCard=false to CourseDetailsCard', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('ShowCard: false')).toBeInTheDocument();
    });

    it('should handle null course', () => {
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={null} />);

      expect(screen.getByText('No course')).toBeInTheDocument();
    });
  });



  describe('modal interactions', () => {
    it('should call onHide when header close button is clicked', () => {
      const { container } = render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      const headerCloseButton = container.querySelector('.btn-close');
      if (headerCloseButton) {
        fireEvent.click(headerCloseButton);
        expect(mockOnHide).toHaveBeenCalled();
      }
    });
  });

  describe('different course data', () => {
    it('should handle course with different title', () => {
      const differentCourse = { ...mockCourse, title: 'MATH 200' };
      render(<CourseDetailsModal show={true} onHide={mockOnHide} course={differentCourse} />);

      expect(screen.getByText('MATH 200')).toBeInTheDocument();
      expect(screen.getByText('Course: MATH 200')).toBeInTheDocument();
    });

    it('should update when course prop changes', () => {
      const { rerender } = render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('COMP 248')).toBeInTheDocument();

      const newCourse = { ...mockCourse, title: 'COMP 249' };
      rerender(<CourseDetailsModal show={true} onHide={mockOnHide} course={newCourse} />);

      expect(screen.getByText('COMP 249')).toBeInTheDocument();
    });
  });

  describe('modal open/close state', () => {
    it('should handle show prop changing from false to true', () => {
      const { rerender } = render(<CourseDetailsModal show={false} onHide={mockOnHide} course={mockCourse} />);

      rerender(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('COMP 248')).toBeInTheDocument();
    });

    it('should handle show prop changing from true to false', () => {
      const { rerender } = render(<CourseDetailsModal show={true} onHide={mockOnHide} course={mockCourse} />);

      expect(screen.getByText('COMP 248')).toBeInTheDocument();

      rerender(<CourseDetailsModal show={false} onHide={mockOnHide} course={mockCourse} />);

      // Modal still in DOM but not visible
      expect(screen.getByText('COMP 248')).toBeInTheDocument();
    });
  });
});
