import React from 'react';
import TimelinePage from '../pages/TimelinePage';
import { fireEvent, render, screen } from '@testing-library/react';

const renderComponent = () => {
  render(<TimelinePage timelineData={[]} />);
};

describe('TimelinePage', () => {
  test('renders elements correctly', () => {
    renderComponent();

    expect(
      screen.getByText('Total Credits Earned: 0 / 120'),
    ).toBeInTheDocument();
    expect(screen.getByText('Course List')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Drag or click on a course to see its description here.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('dropdown-item-0')).toBeInTheDocument();
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
