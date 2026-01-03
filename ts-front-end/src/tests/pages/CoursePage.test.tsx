import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CoursePage from '../../../src/pages/CoursePage';

vi.mock('../../../src/legacy/pages/CourseListPage.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="legacy-course-page">Legacy Course Page</div>,
}));

describe('CoursePage', () => {
  it('renders the legacy course page', () => {
    render(<CoursePage />);
    expect(screen.getByTestId('legacy-course-page')).toBeInTheDocument();
    expect(screen.getByText('Legacy Course Page')).toBeInTheDocument();
  });
});
