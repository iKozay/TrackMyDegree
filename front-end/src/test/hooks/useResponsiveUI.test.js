import { renderHook } from '@testing-library/react';
import { useResponsiveUI } from '../../hooks/useResponsiveUI';

describe('useResponsiveUI', () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    // Reset window size before each test
    window.innerWidth = 1024;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set desktop values on initial render', () => {
    renderHook(() => useResponsiveUI(dispatch));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: {
        isDesktop: true,
        addButtonText: '+ Add Semester',
      },
    });
  });

  it('should set mobile values when window is resized to mobile width', () => {
    renderHook(() => useResponsiveUI(dispatch));
    window.innerWidth = 500;
    window.dispatchEvent(new Event('resize'));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'SET',
      payload: {
        isDesktop: false,
        addButtonText: '+',
        showCourseList: false,
        showCourseDescription: false,
      },
    });
  });

  it('should set addButtonText to "+" for widths <= 999', () => {
    window.innerWidth = 800;
    renderHook(() => useResponsiveUI(dispatch));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: {
        isDesktop: true,
        addButtonText: '+',
      },
    });
  });

  it('should clean up event listener on unmount', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useResponsiveUI(dispatch));
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
