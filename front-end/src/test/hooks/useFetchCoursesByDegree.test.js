import { renderHook } from '@testing-library/react';
import { useFetchCoursesByDegree } from '../../hooks/useFetchCoursesByDegree';
import { api } from '../../api/http-api-client';
import { useLocation } from 'react-router-dom';

jest.mock('../../api/http-api-client', () => ({
  api: { get: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

describe('useFetchCoursesByDegree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocation.mockReturnValue({ state: {} });
  });

  test('fetches courses for a degree and dispatches them', async () => {
    const mockPrimaryCourses = [{ code: 'COMP101', name: 'Intro CS' }];
    api.get.mockResolvedValueOnce(mockPrimaryCourses);

    const mockDispatch = jest.fn();

    renderHook(() => useFetchCoursesByDegree('DEGREE1', false, mockDispatch));

    // Wait for async effect to run
    await Promise.resolve();

    expect(api.get).toHaveBeenCalledWith('/courses/by-degree/DEGREE1');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { coursePools: mockPrimaryCourses, loading: false },
    });
  });

  test('does nothing if degree_Id is not provided', async () => {
    const mockDispatch = jest.fn();

    renderHook(() => useFetchCoursesByDegree(null, false, mockDispatch));

    await Promise.resolve();

    expect(api.get).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
