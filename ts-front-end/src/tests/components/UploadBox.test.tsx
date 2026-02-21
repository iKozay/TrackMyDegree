/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadBox from '../../components/UploadBox';
import { MemoryRouter } from 'react-router-dom';

describe('UploadBox Component', () => {
  const toggleModalMock = vi.fn();

  beforeEach(() => {
    render(
      <MemoryRouter>
        <UploadBox toggleModal={toggleModalMock} />
      </MemoryRouter>
    );
  });

  it('renders the upload heading', () => {
    expect(screen.getByText(/Upload your acceptance letter/i)).toBeInTheDocument();
  });

  it('renders upload button and triggers modal', () => {
    const createButton = screen.getByRole('button', { name: /Create Timeline/i });
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(toggleModalMock).toHaveBeenCalled();
  });

  it('renders file input label', () => {
    const fileLabel = screen.getByText(/Choose File/i);
    expect(fileLabel).toBeInTheDocument();
  });
});