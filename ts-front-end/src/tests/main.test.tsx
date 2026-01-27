import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
    })),
}));

// Mock App and BrowserRouter to avoid deep rendering issues
vi.mock('../App', () => ({ default: () => null }));
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: any) => <div>{children}</div>,
}));

describe('main.tsx', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should call createRoot and render', async () => {
        const rootElement = document.createElement('div');
        rootElement.id = 'root';
        document.body.appendChild(rootElement);

        // Import main.tsx which side-effects
        await import('../main');

        const { createRoot } = await import('react-dom/client');
        expect(createRoot).toHaveBeenCalled();
        const root = (createRoot as any).mock.results[0].value;
        expect(root.render).toHaveBeenCalled();
    });
});
