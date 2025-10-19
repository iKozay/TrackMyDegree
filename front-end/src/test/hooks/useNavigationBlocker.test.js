// useNavigationBlocker.test.js
import { renderHook, act } from '@testing-library/react';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';

// Mock useBlocker from react-router-dom
const mockUseBlocker = jest.fn();
jest.mock('react-router-dom', () => ({
  useBlocker: (fn) => mockUseBlocker(fn),
}));

describe('useNavigationBlocker', () => {
  beforeEach(() => {
    mockUseBlocker.mockClear();
  });

  it('should call useBlocker when shouldBlock is true', () => {
    const onBlock = jest.fn();
    act(() => {
      renderHook(() => useNavigationBlocker(true, onBlock));
    });

    expect(mockUseBlocker).toHaveBeenCalledWith(expect.any(Function));

    // Simulate navigation
    const blockerFn = mockUseBlocker.mock.calls[0][0];
    const nextLocation = { pathname: '/test' };
    const result = blockerFn({ nextLocation });

    expect(onBlock).toHaveBeenCalledWith('/test');
    expect(result).toBe(true);
  });

  it('should not call onBlock when shouldBlock is false', () => {
    const onBlock = jest.fn();
    act(() => {
      renderHook(() => useNavigationBlocker(false, onBlock));
    });

    expect(mockUseBlocker).not.toHaveBeenCalled();
  });

  describe('beforeunload event', () => {
    let addEventListenerSpy;
    let removeEventListenerSpy;

    beforeEach(() => {
      addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should add and remove beforeunload listener', () => {
      let unmount;
      act(() => {
        const hook = renderHook(() => useNavigationBlocker(true));
        unmount = hook.unmount;
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      act(() => {
        unmount();
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should trigger beforeunload when shouldBlock is true', () => {
      act(() => {
        renderHook(() => useNavigationBlocker(true));
      });

      const event = { preventDefault: jest.fn(), returnValue: '' };
      const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'beforeunload')[1];
      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');
    });

    it('should not trigger beforeunload when shouldBlock is false', () => {
      act(() => {
        renderHook(() => useNavigationBlocker(false));
      });

      const event = { preventDefault: jest.fn(), returnValue: '' };
      const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'beforeunload')[1];
      handler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.returnValue).toBe('');
    });
  });
});
