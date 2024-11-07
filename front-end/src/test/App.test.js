import React from "react";
import App from '../App';
import { render, screen } from '@testing-library/react';


test('Application loads and central text is displayed', () => {
    render(<App />);
    expect(screen.getByText('Organize your course sequence')).toBeInTheDocument();
});



