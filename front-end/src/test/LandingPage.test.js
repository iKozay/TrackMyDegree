import React from 'react';
import LandingPage from '../pages/LandingPage';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LandingPage', () => {
  test('displays disclamer title for page correctly', () => {
    render(<LandingPage />);
    
    expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
  });
});
