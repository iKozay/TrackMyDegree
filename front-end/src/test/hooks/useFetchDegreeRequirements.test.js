import { renderHook } from '@testing-library/react';
import { useFetchDegreeRequirements } from '../../hooks/useFetchDegreeRequirements';
import { request } from '../../api/request';

jest.mock('../../api/request');

describe('useFetchDegreeRequirements', () => {
  const mockCourse = { _id: 'COMP101', name: 'Intro CS' };
  const degreeId = 'DEG1';

  const state = {
    allCourses: [mockCourse],
    tempDegId: null,
    exemptionCodes: ['COMP101'],
  };

  test('calls addExemptionCourse for matching exemption codes', async () => {
    request.mockResolvedValueOnce('COMP101\nMATH101'); // mock file content
    const addExemptionCourse = jest.fn();

    renderHook(() => useFetchDegreeRequirements(state, degreeId, addExemptionCourse));

    // Wait a tick for useEffect to run
    await Promise.resolve();

    expect(request).toHaveBeenCalledWith(`/degree-reqs/${degreeId}-requirements.txt`);
    expect(addExemptionCourse).toHaveBeenCalledWith(mockCourse);
  });

  test('does not call request if allCourses is empty', async () => {
    const emptyState = { ...state, allCourses: [] };
    const addExemptionCourse = jest.fn();

    renderHook(() => useFetchDegreeRequirements(emptyState, degreeId, addExemptionCourse));

    await Promise.resolve();

    expect(addExemptionCourse).not.toHaveBeenCalled();
  });
});
