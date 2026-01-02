import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useResponsive from '../../../legacy/hooks/useResponsive';

describe('useResponsive hook', () => {
  let originalInnerWidth: number;
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    originalInnerWidth = globalThis.innerWidth;
    addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener');
  });

  afterEach(() => {
    vi.clearAllMocks();
    globalThis.innerWidth = originalInnerWidth;
  });

  it('should initialize as desktop when width > breakpoint', () => {
    globalThis.innerWidth = 1200;

    const { result } = renderHook(() => useResponsive(800));

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it('should initialize as mobile when width <= breakpoint', () => {
    globalThis.innerWidth = 600;

    const { result } = renderHook(() => useResponsive(800));

    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);
  });

  it('should update when window is resized', () => {
    globalThis.innerWidth = 1000;
    const { result } = renderHook(() => useResponsive(900));

    expect(result.current.isDesktop).toBe(true);

    act(() => {
      globalThis.innerWidth = 800;
      globalThis.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);

    act(() => {
      globalThis.innerWidth = 1001;
      globalThis.dispatchEvent(new Event('resize'));
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
    globalThis.innerWidth = 750;

    const { result } = renderHook(() => useResponsive(750));

    // 750 == breakpoint → not desktop
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.isMobile).toBe(true);

    act(() => {
      globalThis.innerWidth = 751;
      globalThis.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isDesktop).toBe(true);
  });
});
