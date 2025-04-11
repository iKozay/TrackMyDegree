import React from 'react';
import CourseListPage from '../pages/CourseListPage';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('CourseListPage', () => {
  test('displays degree selector', () => {
    render(<CourseListPage />);
    expect(screen.getByTestId('degree-dropdown')).toBeInTheDocument();
  });

  test('changes degrees in button text', async () => {
    render(<CourseListPage />);
    userEvent.click(screen.getByTestId('degree-dropdown'));
    userEvent.click(screen.getByText('BCompSc Computer Engineering'));
    await waitFor(() => {
      expect(
        screen.getAllByText('BCompSc Computer Engineering')[0],
      ).toBeInTheDocument();
    });
  });

  test('displays accordion on degree selection', async () => {
    render(<CourseListPage />);
    userEvent.click(screen.getByTestId('degree-dropdown'));
    userEvent.click(screen.getByText('BEng Software Engineering'));
    await waitFor(() => {
      expect(screen.getByText('SOEN - Engineering Core (24.5 credits)')).toBeInTheDocument();
    });
  });
});
