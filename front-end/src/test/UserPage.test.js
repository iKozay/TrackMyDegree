import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserPage from '../pages/UserPage';

describe('Profile Component', () => {
  test('renders My Profile title', () => {
    render(<UserPage />);
    const titleElement = screen.getByText(/My Profile/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders user info correctly', () => {
    const userInfo = [
      { title: 'First Name', value: 'John' },
      { title: 'Last Name', value: 'Doe' },
      { title: 'Email', value: 'john.doe@example.com' },
      { title: 'Password', value: '******' },
      { title: 'Degree Concentration', value: 'Software Engineer' },
    ];

    render(<UserPage userInfo={userInfo} />);
    userInfo.forEach((item) => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getByText(item.value)).toBeInTheDocument();
    });
  });

  /*test('edit button should toggle edit mode', () => {
    render(<UserPage />);
    const editButton = screen.getByText(/Edit/i);
    editButton.click();
    const cancelButton = screen.getByText(/Cancel/i);
    const saveButton = screen.getByText(/Save/i);
    expect(cancelButton).toBeInTheDocument();
    expect(saveButton).toBeInTheDocument();
  });

  test('should update the user info when save is clicked', () => {
    render(<UserPage />);
    const editButton = screen.getByText(/Edit/i);
    editButton.click();

    const inputField = screen.getByLabelText(/First Name/i);
    fireEvent.change(inputField, { target: { value: 'New Text' } });

    const saveButton = screen.getByText(/Save/i);
    saveButton.click();

    expect(screen.getByText('New Text')).toBeInTheDocument();
  });

  test('should not update the user info when cancel is clicked', () => {
    const userInfo = [
      { title: 'First Name', value: 'John' },
      { title: 'Last Name', value: 'Doe' },
      { title: 'Email', value: 'john.doe@example.com' },
      { title: 'Password', value: '******' },
      { title: 'Degree Concentration', value: 'Software Engineer' },
    ];

    render(<UserPage userInfo={userInfo} />);
    const editButton = screen.getByText(/Edit/i);
    editButton.click();

    const inputField = screen.getByLabelText(/First Name/i);
    fireEvent.change(inputField, { target: { value: 'New Text' } });

    const cancelButton = screen.getByText(/Cancel/i);
    cancelButton.click();

    expect(screen.getByText('John')).toBeInTheDocument();
  });*/
});

describe('Timeline Component', () => {
  test('renders My Timeline title', () => {
    render(<UserPage />);
    const titleElement = screen.getByText(/My Timelines/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('renders timeline info correctly', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
      { id: 2, name: 'Timeline 2', modifiedDate: '2025-01-12 11:43am' },
      { id: 3, name: 'Timeline 3', modifiedDate: '2025-01-14 1:03pm' },
    ];

    render(<UserPage userTimelines={userTimelines} />);
    userInfo.forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
      expect(screen.getByText(item.modifiedDate)).toBeInTheDocument();
    });
  });

  test('delete button should trigger popup', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
    ];

    render(<UserPage userTimelines={userTimelines} />);
    const deleteButton = screen.getByText(/X/i);
    deleteButton.click();
    const titleElement = screen.getByText(/Delete "Timeline 1"?/i);
    expect(titleElement).toBeInTheDocument();
    const cancelButton = screen.getByText(/Cancel/i);
    const confirmButton = screen.getByText(/Confirm/i);
    expect(cancelButton).toBeInTheDocument();
    expect(confirmButton).toBeInTheDocument();
  });

  test('timeline deleted after confirm is clicked', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
    ];

    render(<UserPage userTimelines={userTimelines} />);
    const deleteButton = screen.getByText(/X/i);
    deleteButton.click();

    const confirmButton = screen.getByText(/Confirm/i);
    confirmButton.click();

    expect(screen.getByText('Timeline 1')).not.toBeInTheDocument();
  });

  test('timeline not deleted after cancel is clicked', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
    ];

    render(<UserPage userTimelines={userTimelines} />);
    const deleteButton = screen.getByText(/X/i);
    deleteButton.click();

    const cancelButton = screen.getByText(/Cancel/i);
    cancelButton.click();

    expect(screen.getByText('Timeline 1')).toBeInTheDocument();
  });

  test('link to create new timeline displayed when none exist for user', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
    ];

    render(<UserPage userTimelines={userTimelines} />);
    const deleteButton = screen.getByText(/X/i);
    deleteButton.click();

    const confirmButton = screen.getByText(/Confirm/i);
    confirmButton.click();

    expect(
      screen.getByText(
        "You haven't saved any timelines yet, click here to start now!",
      ),
    ).toBeInTheDocument();
  });

  test('should navigate to timeline page when clicked', () => {
    const userTimelines = [
      { id: 1, name: 'Timeline 1', modifiedDate: '2025-01-10 10:12am' },
    ];

    render(
      <MemoryRouter initialEntries={['/user']}>
        {' '}
        {/* Set the initial URL */}
        <UserPage userTimelines={userTimelines} />
      </MemoryRouter>,
    );

    const linkElement = screen.getByText(/Timeline 1/i);
    fireEvent.click(linkElement);

    expect(window.location.pathname).toBe('/timeline_change');
  });
});
