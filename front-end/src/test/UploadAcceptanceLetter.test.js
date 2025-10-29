import React from 'react';
import UploadAcceptanceLetter from '../pages/UploadAcceptanceLetter';
import { render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UploadAcceptanceLetter', () => {
  test('displays title for page correctly', () => {
    render(<UploadAcceptanceLetter />);

    expect(screen.getByText('Required Information')).toBeInTheDocument();
  });

  test('renders upload title for page correctly', () => {
    render(<UploadAcceptanceLetter />);

    expect(screen.getByPlaceholderText('Upload Acceptance Letter')).toBeInTheDocument();
  });
});
