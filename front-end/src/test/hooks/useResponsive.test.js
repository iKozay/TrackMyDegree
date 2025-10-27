import { renderHook, act } from '@testing-library/react';
import useResponsive from '../../pages/CourseListPage/hooks/useResponsive';

describe('useResponsive hook', () => {
  let originalInnerWidth;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    originalInnerWidth = global.innerWidth;
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.innerWidth = originalInnerWidth;
  });

  it('should initialize as desktop when width > breakpoint', () => {
    global.innerWidth = 1200;

    const { result } = renderHook(() => useResponsive(800));

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('should initialize as mobile when width <= breakpoint', () => {
    global.innerWidth = 600;

    const { result } = renderHook(() => useResponsive(800));

    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it('should update when window is resized', () => {
    global.innerWidth = 1000;
    const { result } = renderHook(() => useResponsive(900));

    expect(result.current.isDesktop).toBe(true);

    act(() => {
      global.innerWidth = 800;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);

    act(() => {
      global.innerWidth = 1001;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('should attach and clean up resize event listener', () => {
    const { unmount } = renderHook(() => useResponsive(700));

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should respect custom breakpoint', () => {
    global.innerWidth = 750;

    const { result } = renderHook(() => useResponsive(750));

    // 750 == breakpoint → not desktop
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);

    act(() => {
      global.innerWidth = 751;
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isDesktop).toBe(true);
  });
});
