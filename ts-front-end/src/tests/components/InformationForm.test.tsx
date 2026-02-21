/// <reference types="vitest" />
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InformationForm from '../../components/InformationForm';
import { MemoryRouter } from 'react-router-dom';

describe('InformationForm Component', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <InformationForm />
      </MemoryRouter>
    );
  });

  it('renders the headings', () => {
    expect(screen.getByText(/Extended Credit Program/i)).toBeInTheDocument();
    expect(screen.getByText(/Co-op Program/i)).toBeInTheDocument();
  });

  it('renders checkboxes and allows checking them', () => {
    const extendedCheckbox = screen.getByLabelText(/Extended Credit Program\?/i);
    const coOpCheckbox = screen.getByLabelText(/Co-op Program\?/i);

    expect(extendedCheckbox).toBeInTheDocument();
    expect(coOpCheckbox).toBeInTheDocument();

    fireEvent.click(extendedCheckbox);
    expect(extendedCheckbox.checked).toBe(true);

    fireEvent.click(coOpCheckbox);
    expect(coOpCheckbox.checked).toBe(true);
  });

  it('renders the submit buttons', () => {
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });
});