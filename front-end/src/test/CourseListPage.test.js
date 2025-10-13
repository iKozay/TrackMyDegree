import React from 'react';
import CourseListPage from '../pages/CourseListPage';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        token: 'fake-token',
        user: { id: 1, name: 'John Doe' },
      }),
  }),
);

describe('CourseListPage', () => {
  test('displays degree selector', () => {
    render(<CourseListPage />);
    expect(screen.getByTestId('degree-dropdown')).toBeInTheDocument();
  });

  test('changes degrees in button text', async () => {
    render(<CourseListPage />);
    userEvent.click(screen.getByTestId('degree-dropdown'));
    const dropdown = await screen.findByText('BCompSc Computer Engineering');
    userEvent.click(dropdown);
    await waitFor(() => {
      expect(
        screen.getAllByText('BCompSc Computer Engineering')[0],
      ).toBeInTheDocument();
    });
  });

  test('displays accordion on degree selection', async () => {
    render(<CourseListPage />);
    userEvent.click(screen.getByTestId('degree-dropdown'));
    const dropdown = await screen.findByText('BEng Software Engineering');
    userEvent.click(dropdown);
    await waitFor(() => {
      expect(screen.getByText('SOEN - Engineering Core (24.5 credits)')).toBeInTheDocument();
    });
  });
});
