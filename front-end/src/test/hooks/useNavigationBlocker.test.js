import { renderHook } from '@testing-library/react';
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

    it('should call useBlocker with a function', () => {
        renderHook(() => useNavigationBlocker(false));
        expect(mockUseBlocker).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should block navigation and call onBlock when shouldBlock is true', () => {
        const onBlock = jest.fn();
        let blockerFn;
        mockUseBlocker.mockImplementation((fn) => { blockerFn = fn; });

        renderHook(() => useNavigationBlocker(true, onBlock));
        const nextLocation = { pathname: '/test' };
        const result = blockerFn({ nextLocation });

        expect(onBlock).toHaveBeenCalledWith('/test');
        expect(result).toBe(true);
    });

    it('should allow navigation when shouldBlock is false', () => {
        const onBlock = jest.fn();
        let blockerFn;
        mockUseBlocker.mockImplementation((fn) => { blockerFn = fn; });

        renderHook(() => useNavigationBlocker(false, onBlock));
        const nextLocation = { pathname: '/test' };
        const result = blockerFn({ nextLocation });

        expect(onBlock).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    describe('beforeunload event', () => {
        let addEventListenerSpy, removeEventListenerSpy;

        beforeEach(() => {
            addEventListenerSpy = jest.spyOn(window, 'addEventListener');
            removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        });

        afterEach(() => {
            addEventListenerSpy.mockRestore();
            removeEventListenerSpy.mockRestore();
        });

        it('should add and remove beforeunload event listener', () => {
            const { unmount } = renderHook(() => useNavigationBlocker(true));
            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'beforeunload',
                expect.any(Function)
            );
            unmount();
            expect(removeEventListenerSpy).toHaveBeenCalledWith(
                'beforeunload',
                expect.any(Function)
            );
        });

        it('should set event.returnValue when shouldBlock is true', () => {
            renderHook(() => useNavigationBlocker(true));
            const event = { preventDefault: jest.fn(), returnValue: '' };
            // Find the handler
            const handler = addEventListenerSpy.mock.calls.find(
                ([type]) => type === 'beforeunload'
            )[1];
            handler(event);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.returnValue).toBe(
                'You have unsaved changes. Are you sure you want to leave?'
            );
        });

        it('should not set event.returnValue when shouldBlock is false', () => {
            renderHook(() => useNavigationBlocker(false));
            const event = { preventDefault: jest.fn(), returnValue: '' };
            // Find the handler
            const handler = addEventListenerSpy.mock.calls.find(
                ([type]) => type === 'beforeunload'
            )[1];
            handler(event);
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(event.returnValue).toBe('');
        });
    });
});