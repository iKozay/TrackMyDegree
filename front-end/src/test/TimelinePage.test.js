import React from 'react';
import TimelinePage from '../pages/TimelinePage';
import { fireEvent, render, screen } from '@testing-library/react';

const renderComponent = () => {
  render(<TimelinePage timelineData={[]} />);
};

describe('TimelinePage', () => {
  test('renders total credits elements correctly', () => {
    renderComponent();

    expect(screen.getByText('Total Credits Earned:')).toBeInTheDocument();
  });

  test('renders course list correctly', () => {
    renderComponent();

    expect(screen.getByText('Course List')).toBeInTheDocument();
  });

  test('renders show insights correctly', () => {
    renderComponent();

    expect(screen.getByText('Show Insights')).toBeInTheDocument();
  });

  test('renders add deficiencies correctly', () => {
    renderComponent();

    expect(screen.getByText('Add Deficiencies')).toBeInTheDocument();
  });

  test('renders save timeline correctly', () => {
    renderComponent();

    expect(screen.getByText('Save Timeline')).toBeInTheDocument();
  });

  test('renders download correctly', () => {
    renderComponent();

    expect(screen.getByText('Download')).toBeInTheDocument();
  });

  test('renders add semester correctly', () => {
    renderComponent();

    expect(screen.getByText('+ Add Semester')).toBeInTheDocument();
  });

  test('renders default drag message correctly', () => {
    renderComponent();

    expect(screen.getByText('Drag or click on a course to see its description here.')).toBeInTheDocument();
  });

  test('displays description when course is selected', async () => {
    renderComponent();
    var desc = screen.getByTestId('course-description');
    var accordion = screen.getByTestId('dropdown-item-0');
    var course = screen.getByText('ELEC 275');

    expect(desc.innerHTML).toBe(
      'Drag or click on a course to see its description here.',
    );
    fireEvent.click(accordion);
    fireEvent.click(course);
    desc = screen.getByTestId('course-description');
    expect(desc.innerHTML).toBe(
      'Fundamentals of electric circuits: Kirchoff’s laws, voltage and current sources, Ohm’s law, series and parallel circuits. Nodal and mesh analysis of DC circuits. Superposition theorem, Thevenin and Norton Equivalents. Use of operational amplifiers. Transient analysis of simple RC, RL and RLC circuits. Steady state analysis: Phasors and impedances, power and power factor. Single and three phase circuits. Magnetic circuits and transformers. Power generation and distribution.',
    );
  });
});
