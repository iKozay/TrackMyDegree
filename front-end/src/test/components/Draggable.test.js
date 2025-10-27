// Draggable.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import Draggable from '../../components/Draggable';
import * as dnd from '@dnd-kit/core';

jest.mock('@dnd-kit/core', () => ({
  useDraggable: jest.fn(),
}));

describe('Draggable', () => {
  beforeEach(() => {
    dnd.useDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: jest.fn(),
      transform: null,
    });
  });

  test('renders children inside button', () => {
    render(<Draggable>Drag Me</Draggable>);
    const button = screen.getByRole('button', { name: /drag me/i });
    expect(button).toBeInTheDocument();
  });

  test('applies transform style when provided', () => {
    const mockSetNodeRef = jest.fn();
    dnd.useDraggable.mockReturnValue({
      attributes: {},
      listeners: {},
      setNodeRef: mockSetNodeRef,
      transform: { x: 10, y: 20 },
    });

    render(<Draggable>Drag Me</Draggable>);
    const button = screen.getByRole('button', { name: /drag me/i });
    expect(button).toHaveStyle('transform: translate3d(10px, 20px, 0)');
  });
});
