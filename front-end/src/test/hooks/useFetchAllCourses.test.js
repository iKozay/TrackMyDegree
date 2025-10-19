import { renderHook } from '@testing-library/react';
import { useFetchAllCourses } from '../../hooks/useFetchAllCourses';
import { api } from '../../api/http-api-client';

jest.mock('../../api/http-api-client', () => ({
  api: { post: jest.fn() },
}));

describe('useFetchAllCourses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('fetches all courses and dispatches correctly', async () => {
    const mockCourses = [{ code: 'COMP101', name: 'Intro to CS' }];
    api.post.mockResolvedValue(mockCourses);

    const mockDispatch = jest.fn();
    const extendedCredit = true;

    renderHook(() => useFetchAllCourses(mockDispatch, extendedCredit));

    // Wait for promises to resolve
    await Promise.resolve();

    expect(api.post).toHaveBeenCalledWith('/courses/getAllCourses');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { allCourses: mockCourses },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { timelineName: '' },
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { isECP: extendedCredit },
    });
  });

  test('uses stored timeline name if present', async () => {
    localStorage.setItem('Timeline_Name', 'My Timeline');
    api.post.mockResolvedValue([]);

    const mockDispatch = jest.fn();
    renderHook(() => useFetchAllCourses(mockDispatch, false));

    await Promise.resolve();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { timelineName: 'My Timeline' },
    });
  });
});
