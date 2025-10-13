import { renderHook } from '@testing-library/react';
import { useDegreeInitialization } from '../../hooks/useDegreeInitialization';
import { useLocation } from 'react-router-dom';

// Mock useLocation
jest.mock('react-router-dom', () => ({
    useLocation: jest.fn(),
}));

describe('useDegreeInitialization', () => {
    const mockDegreeId = 'degree123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns values from location state', () => {
        useLocation.mockReturnValue({
            state: {
                degree_Id: 'deg1',
                startingSemester: 'Fall 2025',
                credits_Required: 120,
                extendedCredit: false,
            },
        });

        const { result } = renderHook(() => useDegreeInitialization(mockDegreeId, null));

        expect(result.current).toEqual({
            degree_Id: 'deg1',
            startingSemester: 'Fall 2025',
            credits_Required: 120,
            extendedCredit: false,
        });
    });

    test('falls back to degreeId when location state has no degree_Id', () => {
        useLocation.mockReturnValue({ state: {} });

        const { result } = renderHook(() => useDegreeInitialization(mockDegreeId, null));

        expect(result.current.degree_Id).toBe(mockDegreeId);
    });

    test('forces extendedCredit to true if isExtendedCredit is true', () => {
        useLocation.mockReturnValue({ state: { extendedCredit: false } });

        const { result } = renderHook(() => useDegreeInitialization(mockDegreeId, true));

        expect(result.current.extendedCredit).toBe(true);
    });
});
