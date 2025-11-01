import { renderHook } from '@testing-library/react';
import { useNavigationBlocker } from '../../hooks/useNavigationBlocker';

describe('useNavigationBlocker', () => {
  let addEventListenerSpy, removeEventListenerSpy;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should add and remove the beforeunload listener', () => {
    const { unmount } = renderHook(() => useNavigationBlocker(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should set returnValue when shouldBlock is true', () => {
    renderHook(() => useNavigationBlocker(true));

    const event = { preventDefault: jest.fn(), returnValue: '' };
    const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'beforeunload')[1];

    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.returnValue).toBe('You have unsaved changes. Are you sure you want to leave?');
  });

  it('should not modify event when shouldBlock is false', () => {
    renderHook(() => useNavigationBlocker(false));

    const event = { preventDefault: jest.fn(), returnValue: '' };
    const handler = addEventListenerSpy.mock.calls.find(([type]) => type === 'beforeunload')[1];

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.returnValue).toBe('');
  });
});
