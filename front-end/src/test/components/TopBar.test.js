// TopBar.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../components/TopBar';

// MOCK pdfutils so jspdf is never loaded
jest.mock('../../utils/pdfutils', () => ({
  exportTimelineToPDF: jest.fn(),
}));
jest.mock('../../icons/download-icon.PNG', () => 'downloadIconStub');
jest.mock('../../icons/saveIcon.png', () => 'saveIconStub');

const mockProps = {
  history: [],
  future: [],
  handleUndo: jest.fn(),
  handleRedo: jest.fn(),
  toggleShareDialog: jest.fn(),
  totalCredits: 10,
  deficiencyCredits: 2,
  credsReq: 15,
  exemptionCredits: 3,
  coursePools: [],
  semesterCourses: [],
  courseInstanceMap: {},
  setShowDeficiencyModal: jest.fn(),
  setShowExemptionsModal: jest.fn(),
  setShowSaveModal: jest.fn(),
};

describe('TopBar without pdfUtils', () => {
  test('renders total credits and buttons', () => {
    render(<TopBar {...mockProps} />);

    expect(screen.getByText(/Total Credits Earned: 12 \/ 14/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Share/i));
    expect(mockProps.toggleShareDialog).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Add Deficiencies/i));
    expect(mockProps.setShowDeficiencyModal).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Add Exemptions/i));
    expect(mockProps.setShowExemptionsModal).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Save Timeline/i));
    expect(mockProps.setShowSaveModal).toHaveBeenCalled();
  });
});
