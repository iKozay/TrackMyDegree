import React from "react";
import CourseListPage from "../pages/CourseListPage";
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Course list page front end', () => {

  test('page displays degree selector', () => {
    render(<CourseListPage />);
    expect(screen.getByTestId('degree-dropdown')).toBeInTheDocument();
  });

  test('selecting degree displays accordion', async () => {
    render(<CourseListPage />);
    userEvent.click(screen.getByTestId('degree-dropdown'));
    userEvent.click(screen.getByText('Software Engineering'));
    
    expect(screen.getByText('Engineering Core')).toBeInTheDocument();
  });
});