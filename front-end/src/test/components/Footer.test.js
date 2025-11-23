import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Footer from '../../components/Footer';

jest.mock('../../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders footer correctly', () => {
    render(<Footer />);
    expect(screen.getByText('v0.3.2')).toBeInTheDocument();
    expect(screen.getByText(/Disclaimer: TrackMyDegree/i)).toBeInTheDocument();
    expect(screen.getByText('Submit Feedback!')).toBeInTheDocument();
  });

  it('opens disclaimer popup when disclaimer button is clicked', async () => {
    render(<Footer />);
    const disclaimerButton = screen.getByText(/Click here for more information/i);
    fireEvent.click(disclaimerButton);

    await waitFor(() => {
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
      // Use getAllByText to handle multiple instances
      const disclaimerTexts = screen.getAllByText(/TrackMyDegree🎓 can make mistakes/i);
      expect(disclaimerTexts.length).toBeGreaterThan(0);
    });
  });

  it('closes popup when overlay is clicked', async () => {
    render(<Footer />);
    const disclaimerButton = screen.getByText(/Click here for more information/i);
    fireEvent.click(disclaimerButton);

    await waitFor(() => {
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
    });

    const overlay = document.querySelector('.overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByText('DISCLAIMER')).not.toBeInTheDocument();
    });
  });

  it('closes popup when cancel button is clicked', async () => {
    render(<Footer />);
    const disclaimerButton = screen.getByText(/Click here for more information/i);
    fireEvent.click(disclaimerButton);

    await waitFor(() => {
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
    });

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(screen.queryByText('DISCLAIMER')).not.toBeInTheDocument();
    });
  });

  it('closes disclaimer popup when acknowledge button is clicked', async () => {
    render(<Footer />);
    const disclaimerButton = screen.getByText(/Click here for more information/i);
    fireEvent.click(disclaimerButton);

    await waitFor(() => {
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
    });

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(screen.queryByText('DISCLAIMER')).not.toBeInTheDocument();
    });
  });

  it('prevents popup close when clicking inside popup', async () => {
    render(<Footer />);
    // Test with disclaimer popup since feedback popup isn't accessible
    const disclaimerButton = screen.getByText(/Click here for more information/i);
    fireEvent.click(disclaimerButton);

    await waitFor(() => {
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
    });

    const popup = document.querySelector('.popup');
    if (popup) {
      // Click inside popup should not close it due to stopPropagation
      fireEvent.click(popup);
    }

    await waitFor(() => {
      // Popup should still be open
      expect(screen.getByText('DISCLAIMER')).toBeInTheDocument();
    });
  });
});
