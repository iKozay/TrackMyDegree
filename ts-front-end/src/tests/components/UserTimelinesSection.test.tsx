/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserTimeline from '../../components/UserTimelinesSection';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../../api/http-api-client';

vi.mock('../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn()
  }
}));

describe('UserTimeline Component', () => {
  const mockTimelines = [
    { _id: '1', name: 'Timeline 1', last_modified: new Date().toISOString() },
    { _id: '2', name: 'Timeline 2', last_modified: new Date().toISOString() }
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({ timelines: mockTimelines });
  });

  it('displays loading or error state if timelines cannot be fetched', async () => {
    api.get.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(
      <MemoryRouter>
        <UserTimeline />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Cannot get timelines/i)).toBeInTheDocument();
    });
  });

  it('renders timelines when fetched successfully', async () => {
    render(
      <MemoryRouter>
        <UserTimeline />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Timeline 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Timeline 2/i)).toBeInTheDocument();
    });
  });

  it('displays placeholder when there are no timelines', async () => {
    api.get.mockResolvedValueOnce({ timelines: [] });
    render(
      <MemoryRouter>
        <UserTimeline />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/User has no timeline/i)).toBeInTheDocument();
    });
  });

  it('calls delete API when delete button clicked', async () => {
    api.delete.mockResolvedValueOnce({});
    render(
      <MemoryRouter>
        <UserTimeline />
      </MemoryRouter>
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle(/Delete/i);
      expect(deleteButtons.length).toBeGreaterThan(0);
      fireEvent.click(deleteButtons[0]);
    });
  });
});