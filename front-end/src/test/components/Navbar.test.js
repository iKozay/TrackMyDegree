/**
 * @file Navbar.test.js
 * Unit tests for the Navbar component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../../middleware/AuthContext';
import Navbar from '../../components/Navbar';

// Mock image imports
jest.mock('../../icons/userIcon2.png', () => 'userIcon.png');
jest.mock('../../icons/logoutIcon.png', () => 'logoutIcon.png');
jest.mock('../../images/trackmydegreelogo.png', () => 'logo.png');

describe('Navbar Component', () => {
  const mockLogout = jest.fn();

  const renderNavbar = (contextValue, initialRoute = '/') => {
    return render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="*" element={<Navbar />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    document.body.className = ''; // Reset body classes
    mockLogout.mockClear();
  });

  it('renders the logo and brand text', () => {
    renderNavbar({ isLoggedIn: false, loading: false });
    expect(screen.getByAltText(/TrackMyDegree Logo/i)).toBeInTheDocument();
    expect(screen.getByText(/TrackMyDegree/i)).toBeInTheDocument();
  });

  it('shows Sign In and Register when not logged in', () => {
    renderNavbar({ isLoggedIn: false, loading: false });
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
  });

  it('shows user name and logout button when logged in', () => {
    const user = { fullname: 'John Doe' };
    renderNavbar({ isLoggedIn: true, loading: false, user, logout: mockLogout });
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Log Out/i)).toBeInTheDocument();
  });

  it('calls logout and navigates on logout click', () => {
    const user = { fullname: 'Jane Smith' };
    renderNavbar({ isLoggedIn: true, loading: false, user, logout: mockLogout });

    const logoutButton = screen.getByText(/Log Out/i);
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('toggles menu open and close when navbar toggler is clicked', () => {
    renderNavbar({ isLoggedIn: false, loading: false });

    const toggler = screen.getByRole('button', { name: /toggle navigation/i });
    const navbarCollapse = document.getElementById('navbarNavAltMarkup');

    // Open
    fireEvent.click(toggler);
    expect(document.body.classList.contains('menu-open')).toBe(true);
    expect(navbarCollapse.classList.contains('show')).toBe(true);

    // Close
    fireEvent.click(toggler);
    expect(document.body.classList.contains('menu-open')).toBe(false);
    expect(navbarCollapse.classList.contains('show')).toBe(false);
  });

  it('closes the menu when clicking outside', () => {
    renderNavbar({ isLoggedIn: false, loading: false });

    const toggler = screen.getByRole('button', { name: /toggle navigation/i });
    fireEvent.click(toggler);
    expect(document.body.classList.contains('menu-open')).toBe(true);

    fireEvent.mouseDown(document.body);
    expect(document.body.classList.contains('menu-open')).toBe(false);
  });

  it('highlights Timeline link when on a timeline route', () => {
    renderNavbar({ isLoggedIn: false, loading: false }, '/timeline_initial');
    const timelineLink = screen.getByText(/Timeline/i);
    expect(timelineLink.classList.contains('active')).toBe(true);
  });

  it('renders feedback button for mobile', () => {
    renderNavbar({ isLoggedIn: false, loading: false });
    expect(screen.getByText(/Submit Feedback!/i)).toBeInTheDocument();
  });
});
