import React from "react";
import UserPage from "../pages/UserPage";
import { render, screen } from '@testing-library/react';

describe('UserPage', () => {
  test('renders correctly', () => {
    render(<UserPage />);
    expect(screen.getByText('This is the User Page')).toBeInTheDocument();
  });
});