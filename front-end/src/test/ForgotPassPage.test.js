import React from 'react';
import ForgotPassPage from '../pages/ForgotPassPage';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ForgotPassPage', () => {
  test('displays title for page correctly', () => {
    render(<ForgotPassPage />);
    
    expect(screen.getByText('Forgot Your Password?')).toBeInTheDocument();
  });

  test('renders enter email placeholder text for page correctly', () => {
    render(<ForgotPassPage />);
  
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
  });

  test('displays submit button for page correctly', () => {
    render(<ForgotPassPage />);
    
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  // check alerts
  test('shows alert when field is empty', () => {
    render(<ForgotPassPage />);

    fireEvent.click(screen.getByText('Submit'));

    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
  });
});
