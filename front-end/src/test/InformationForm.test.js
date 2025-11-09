import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InformationForm from '../components/InformationForm';

// Mock useNavigate from react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('InformationForm Component', () => {
  const mockDegrees = [
    { _id: '1', name: 'Computer Science', totalCredits: 120 },
    { _id: '2', name: 'Mechanical Engineering', totalCredits: 130 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // mock localStorage
    Storage.prototype.setItem = jest.fn();
  });

  it('renders form and degree options correctly', () => {
    render(<InformationForm degrees={mockDegrees} />, { wrapper: MemoryRouter });

    // Heading and description
    expect(screen.getByText(/Required Information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Degree Concentration:/i)).toBeInTheDocument();

    // Degree options
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('Mechanical Engineering')).toBeInTheDocument();
  });

  it('shows alert if no degree is selected on Next click', () => {
    window.alert = jest.fn();
    render(<InformationForm degrees={mockDegrees} />, { wrapper: MemoryRouter });

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(window.alert).toHaveBeenCalledWith('Please select a degree before continuing.');
  });

  it('shows alert if term or year not selected', () => {
    window.alert = jest.fn();
    render(<InformationForm degrees={mockDegrees} />, { wrapper: MemoryRouter });

    fireEvent.change(screen.getByLabelText(/Degree Concentration:/i), {
      target: { value: '1' },
    });

    fireEvent.click(screen.getByText(/Next/i));

    expect(window.alert).toHaveBeenCalledWith('Please select both a term and a year for your starting semester.');
  });

  it('navigates to /timeline_change with correct data when filled properly', () => {
    render(<InformationForm degrees={mockDegrees} />, { wrapper: MemoryRouter });

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/Degree Concentration:/i), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByLabelText(/Starting Term:/i), {
      target: { value: 'Fall' },
    });
    fireEvent.change(screen.getByLabelText(/Starting Year:/i), {
      target: { value: '2025' },
    });

    // Check Extended Credit box
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Click Next
    fireEvent.click(screen.getByText(/Next/i));

    expect(localStorage.setItem).toHaveBeenCalledWith('Timeline_Name', null);
    expect(mockNavigate).toHaveBeenCalledWith('/timeline_change', {
      state: {
        degree_Id: mockDegrees[0]._id,
        startingSemester: 'Fall 2025',
        coOp: null,
        credits_Required: 120,
        extendedCredit: true,
        creditDeficiency: null,
      },
    });
  });

  it('resets form on Cancel', () => {
    render(<InformationForm degrees={mockDegrees} />, { wrapper: MemoryRouter });

    fireEvent.change(screen.getByLabelText(/Degree Concentration:/i), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/Starting Term:/i), {
      target: { value: 'Winter' },
    });
    fireEvent.change(screen.getByLabelText(/Starting Year:/i), {
      target: { value: '2024' },
    });
    fireEvent.click(screen.getByText(/Cancel/i));

    expect(screen.getByLabelText(/Degree Concentration:/i).value).toBe('');
    expect(screen.getByLabelText(/Starting Term:/i).value).toBe('');
    expect(screen.getByLabelText(/Starting Year:/i).value).toBe('');
  });
});
