import React from "react";
import App from '../App';
import { render, screen } from '@testing-library/react';

describe('App page', () => {
  test('renders landing page text', () => {
    render(<App />);
    expect(screen.getByText('Organize your course sequence')).toBeInTheDocument();
  });
});