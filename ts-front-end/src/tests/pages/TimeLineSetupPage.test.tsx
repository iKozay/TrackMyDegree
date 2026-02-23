/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineSetupPage from '../../pages/TimelineSetupPage';
import { MemoryRouter } from 'react-router-dom';

describe('TimelineSetupPage Component', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <TimelineSetupPage />
      </MemoryRouter>
    );
  });

  it('renders the hero section', () => {
    expect(screen.getByText(/Create Your Academic Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan your journey smarter/i)).toBeInTheDocument();
  });

  it('renders the InformationForm and UploadBox cards', () => {
    expect(screen.getAllByText(/Extended Credit Program/i)[0]).toBeInTheDocument(); // InfoForm checkbox
    expect(screen.getByText(/Upload your acceptance letter/i)).toBeInTheDocument(); // UploadBox
  });

  it('renders the OR divider', () => {
    expect(screen.getByText(/OR/i)).toBeInTheDocument();
  });

  it('renders the My Timelines placeholder', () => {
    expect(screen.getByText(/User has no timeline/i)).toBeInTheDocument();
  });

  it('toggles the InstructionsModal when UploadBox button clicked', () => {
    const createButton = screen.getByRole('button', { name: /Create Timeline/i });
    fireEvent.click(createButton);
    expect(screen.getByText(/Your Instructions/i)).toBeInTheDocument();
  });
});