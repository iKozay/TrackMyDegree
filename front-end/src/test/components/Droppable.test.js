// Droppable.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Droppable } from '../../components/Droppable';

describe('Droppable', () => {
  test('renders children and applies id and className', () => {
    render(
      <Droppable id="semester1" className="custom-class">
        <div>Child Content</div>
      </Droppable>,
    );

    const droppable = screen.getByTestId('semester1');
    expect(droppable).toBeInTheDocument();
    expect(droppable).toHaveClass('custom-class');
    expect(droppable).toHaveAttribute('data-semester-id', 'semester1');
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  test('uses default className if none provided', () => {
    render(
      <Droppable id="semester2">
        <div>Another Child</div>
      </Droppable>,
    );

    const droppable = screen.getByTestId('semester2');
    expect(droppable).toHaveClass('semester-spot');
  });
});
