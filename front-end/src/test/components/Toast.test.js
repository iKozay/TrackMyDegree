// Toast.test.js
import React from 'react';
import { render } from '@testing-library/react';
import { Toast, notifySuccess, notifyError, notifyInfo, notifyWarning } from '../../components/Toast';
import { toast } from 'react-toastify';

// Mock toast functions
jest.mock('react-toastify', () => {
  const original = jest.requireActual('react-toastify');
  return {
    ...original,
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn(),
    },
    ToastContainer: ({ children }) => <div>{children}</div>,
  };
});

describe('Toast component', () => {
  test('renders ToastContainer', () => {
    const { container } = render(<Toast />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('notifySuccess calls toast.success', () => {
    notifySuccess('Success!');
    expect(toast.success).toHaveBeenCalledWith('Success!');
  });

  test('notifyError calls toast.error', () => {
    notifyError('Error!');
    expect(toast.error).toHaveBeenCalledWith('Error!');
  });

  test('notifyInfo calls toast.info', () => {
    notifyInfo('Info!');
    expect(toast.info).toHaveBeenCalledWith('Info!');
  });

  test('notifyWarning calls toast.warning', () => {
    notifyWarning('Warning!');
    expect(toast.warning).toHaveBeenCalledWith('Warning!');
  });
});
