// DraggableCourse.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DraggableCourse } from '../../components/DraggableCourse';

describe('DraggableCourse', () => {
  const onSelectMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders courseCode and calls onSelect when clicked', () => {
    render(
      <DraggableCourse
        internalId="course1"
        courseCode="COMP248"
        disabled={false}
        isSelected={false}
        onSelect={onSelectMock}
        containerId="courseList"
      />,
    );

    const courseElement = screen.getByText('COMP248');
    expect(courseElement).toBeInTheDocument();

    fireEvent.click(courseElement);
    expect(onSelectMock).toHaveBeenCalledWith('COMP248');
  });

  test('applies selected class when isSelected is true', () => {
    render(
      <DraggableCourse
        internalId="course1"
        courseCode="COMP248"
        disabled={false}
        isSelected={true}
        onSelect={onSelectMock}
        containerId="courseList"
      />,
    );

    const courseElement = screen.getByText('COMP248');
    expect(courseElement).toHaveClass('selected');
  });

  test('displays checkmark when isInTimeline is true', () => {
    render(
      <DraggableCourse
        internalId="course1"
        courseCode="COMP248"
        disabled={false}
        isSelected={false}
        onSelect={onSelectMock}
        containerId="courseList"
        isInTimeline={true}
      />,
    );

    expect(screen.getByText('✔')).toBeInTheDocument();
  });

  test('renders removeButton if provided', () => {
    const removeButton = <button>Remove</button>;
    render(
      <DraggableCourse
        internalId="course1"
        courseCode="COMP248"
        disabled={false}
        isSelected={false}
        onSelect={onSelectMock}
        containerId="courseList"
        removeButton={removeButton}
      />,
    );

    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
});
