import React from 'react';
import LandingPage from '../pages/LandingPage';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';

describe('ForgotPassPage', () => {
  test('displays disclamer title for page correctly', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
  });

  test('disclamer removed from page correctly', async () => {
    render(<LandingPage />);
    
    fireEvent.click(screen.getByText('Acknowledge')).toBeInTheDocument();

    await waitForElementToBeRemoved(() =>
        screen.getByText('DISCLAIMER')
      );
  });

  // add more tests when time
});
