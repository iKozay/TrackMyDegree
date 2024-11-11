import React from "react";
import TimelinePage from "../pages/TimelinePage";
import { fireEvent, render, screen } from '@testing-library/react';

describe('TimelinePage', () => {

  test('renders elements correctly', () => {
    render(<TimelinePage />);
    expect(screen.getByText('Drag or click on a course to see its description here.')).toBeInTheDocument();
    
    expect(screen.getByText('ELEC 275')).toBeInTheDocument();
    expect(screen.getByTestId('fall2024')).toBeInTheDocument();
  });

  test('displays description when course is selected', async () => {
    render(<TimelinePage />);
    var desc = screen.getByTestId('course-description');
    var course = screen.getByText('ELEC 275');
    
    expect(desc.innerHTML).toBe('Drag or click on a course to see its description here.');
    fireEvent.click(course);
    
    desc = screen.getByTestId('course-description');
    expect(desc.innerHTML).not.toBe('Drag or click on a course to see its description here.');
    expect(screen.getByText('ELEC 275 Principles of Electrical Engineering')).toBeInTheDocument();
  });

});