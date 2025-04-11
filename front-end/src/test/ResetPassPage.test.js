import React from 'react';
import ResetPassPage from '../pages/ResetPassPage';
import { render, screen, fireEvent } from '@testing-library/react';

describe('ResetPassPage', () => {
  test('displays title for page correctly', () => {
    render(<ResetPassPage />);
    
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
  });

  test('renders otp code label for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByText('OTP Code:')).toBeInTheDocument();
  });
  
  test('renders password label for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByText('Password:')).toBeInTheDocument();
  });
  
  test('renders Confirm password label for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByText('Confirm Password:')).toBeInTheDocument();
  });

  test('renders otp placeholder text for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByPlaceholderText('* Enter your OTP')).toBeInTheDocument();
  });

  test('renders password placeholder text for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByPlaceholderText('* Enter your password')).toBeInTheDocument();
  });

  test('renders confirm password placeholder text for page correctly', () => {
    render(<ResetPassPage />);
  
    expect(screen.getByPlaceholderText('* Confirm your password')).toBeInTheDocument();
  });

  test('displays submit button for page correctly', () => {
    render(<ResetPassPage />);
    
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  // check alerts
  test('shows alert when field is empty', () => {
    render(<ResetPassPage />);

    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows alert when otp field is missing', () => {
    render(<ResetPassPage />);
  
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });
  
    fireEvent.click(screen.getByText('Submit'));
  
    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows alert when password field is missing', () => {
    render(<ResetPassPage />);
  
    fireEvent.change(screen.getByPlaceholderText('* Enter your OTP'), {
      target: { value: '1234' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password123' },
    });
  
    fireEvent.click(screen.getByText('Submit'));
  
    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows alert when confirm passowrd field is missing', () => {
    render(<ResetPassPage />);
  
    fireEvent.change(screen.getByPlaceholderText('* Enter your OTP'), {
      target: { value: '1234' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
  
    fireEvent.click(screen.getByText('Submit'));
  
    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });

  test('shows alert when passwords do not match', () => {
    render(<ResetPassPage />);
  
    fireEvent.change(screen.getByPlaceholderText('* Enter your password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('* Confirm your password'), {
      target: { value: 'password456' },
    });
  
    fireEvent.click(screen.getByText('Submit'));
  
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });
});
