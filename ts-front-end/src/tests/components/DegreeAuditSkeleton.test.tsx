import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DegreeAuditSkeleton from '../../components/DegreeAuditSkeleton.tsx';

describe('DegreeAuditSkeleton', () => {
    it('should render skeleton states correctly', () => {
        const { container } = render(<DegreeAuditSkeleton />);

        // Check for skeleton elements
        const skeletons = container.querySelectorAll('.skeleton');
        expect(skeletons.length).toBeGreaterThan(0);

        // Ensure some key sections are present
        expect(container.querySelector('.da-header')).toBeTruthy();
        expect(container.querySelector('.card')).toBeTruthy();
        expect(container.querySelector('.requirements-list')).toBeTruthy();
    });
});
