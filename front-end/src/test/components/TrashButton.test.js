// TrashButton.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrashButton } from '../../components/TrashButton';

describe('TrashButton', () => {
  test('renders and calls onTrash with correct id when clicked', () => {
    const onTrashMock = jest.fn();
    const testId = 'semester1';

    render(<TrashButton onTrash={onTrashMock} id={testId} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();

    // Click the button
    fireEvent.click(button);

    // onTrash should have been called with the correct id
    expect(onTrashMock).toHaveBeenCalledWith(testId);
    expect(onTrashMock).toHaveBeenCalledTimes(1);
  });
});
