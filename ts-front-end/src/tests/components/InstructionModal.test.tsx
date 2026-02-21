/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InstructionsModal from '../../components/InstructionModal';
import { MemoryRouter } from 'react-router-dom';

describe('InstructionsModal Component', () => {
  const toggleModalMock = vi.fn();

  beforeEach(() => {
    render(
      <MemoryRouter>
        <InstructionsModal isOpen={true} toggleModal={toggleModalMock} />
      </MemoryRouter>
    );
  });

  it('renders modal content when open', () => {
    expect(screen.getByText(/Your Instructions/i)).toBeInTheDocument();
  });

  it('calls toggleModal when close button clicked', () => {
    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);
    expect(toggleModalMock).toHaveBeenCalled();
  });

  it('displays all instruction steps', () => {
    const steps = screen.getAllByRole('img');
    expect(steps.length).toBeGreaterThan(0);
  });
});