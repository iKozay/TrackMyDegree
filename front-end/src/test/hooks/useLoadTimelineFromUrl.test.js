import { renderHook } from '@testing-library/react';
import { useLoadTimelineFromUrl } from '../../hooks/useLoadTimelineFromUrl';
import { decompressTimeline } from '../../components/CompressDegree';
import { useLocation } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('../../components/CompressDegree', () => ({
  decompressTimeline: jest.fn(),
}));

describe('useLoadTimelineFromUrl', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads and decompresses timeline from URL', async () => {
    useLocation.mockReturnValue({
      search: '?tstring=mockString',
    });

    decompressTimeline.mockReturnValue([
      { Fall2025: ['COMP101'] }, // decompressedTimeline
      'DEG1', // degreeFromUrl
      120, // creditsFromUrl
      true, // ecpValue
    ]);

    const { result } = renderHook(() => useLoadTimelineFromUrl(mockDispatch));

    // Wait a tick for useEffect to run
    await Promise.resolve();

    expect(decompressTimeline).toHaveBeenCalledWith('mockString');

    expect(result.current).toBe(true);
  });

  test('returns null if no tstring param', async () => {
    useLocation.mockReturnValue({ search: '' });

    const { result } = renderHook(() => useLoadTimelineFromUrl(mockDispatch));

    await Promise.resolve();

    expect(result.current).toBe(null);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(decompressTimeline).not.toHaveBeenCalled();
  });
});
