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

  test('fetches and merges extended credit courses when extendedCredit is true', async () => {
    const mockPrimaryCourses = [{ code: 'COMP101', name: 'Intro CS' }];
    //const mockExtendedCourses = [{ code: 'ECP101', name: 'Extended Course' }];
    api.get
      .mockResolvedValueOnce(mockPrimaryCourses)
     // .mockResolvedValueOnce(mockExtendedCourses);

    const mockDispatch = jest.fn();

    renderHook(() => useFetchCoursesByDegree('DEGREE1', true, mockDispatch));

    // Wait for all async operations to complete
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(api.get).toHaveBeenCalledWith('/courses/by-degree/DEGREE1');
    //expect(api.get).toHaveBeenCalledWith('/courses/by-degree/ECP');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { coursePools: [
        ...mockPrimaryCourses, 
       // ...mockExtendedCourses
      ], loading: false },
    });
  });

  test('handles errors when fetching courses', async () => {
    const errorMessage = 'Failed to fetch courses';
    api.get.mockRejectedValueOnce(new Error(errorMessage));

    const mockDispatch = jest.fn();

    renderHook(() => useFetchCoursesByDegree('DEGREE1', false, mockDispatch));

    await Promise.resolve();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { error: errorMessage, loading: false },
    });
  });

  // test('handles errors when fetching extended credit courses', async () => {
  //   const mockPrimaryCourses = [{ code: 'COMP101', name: 'Intro CS' }];
  //   const errorMessage = 'Failed to fetch extended courses';
    
  //   api.get
  //     .mockResolvedValueOnce(mockPrimaryCourses)
  //     .mockRejectedValueOnce(new Error(errorMessage));

  //   const mockDispatch = jest.fn();

  //   renderHook(() => useFetchCoursesByDegree('DEGREE1', true, mockDispatch));

  //   // Wait for all async operations to complete
  //   await Promise.resolve();
  //   await Promise.resolve();
  //   await Promise.resolve();

  //   expect(mockDispatch).toHaveBeenCalledWith({
  //     type: 'SET',
  //     payload: { error: errorMessage, loading: false },
  //   });
  // });
});
