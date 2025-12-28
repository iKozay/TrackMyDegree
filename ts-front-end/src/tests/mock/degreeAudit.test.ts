import { describe, it, expect, vi } from 'vitest';
import { generateMockDegreeAudit } from '../../types/audit.types.ts';

describe('degreeAudit mock', () => {
    it('should generate mock degree audit data', () => {
        const data = generateMockDegreeAudit();

        expect(data).toHaveProperty('student');
        expect(data).toHaveProperty('progress');
        expect(data).toHaveProperty('notices');
        expect(data).toHaveProperty('requirements');

        expect(data.student.name).toBe("John Smith");
        expect(data.progress.percentage).toBe(63);
        expect(data.notices.length).toBeGreaterThan(0);
        expect(data.requirements.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for notices and courses', () => {
        // Mock Math.random to ensure we can check uniqueness or at least that it's called
        const mockRandom = vi.spyOn(Math, 'random');

        const data = generateMockDegreeAudit();

        expect(mockRandom).toHaveBeenCalled();

        const noticeIds = data.notices.map(n => n.id);
        const uniqueNoticeIds = new Set(noticeIds);
        expect(uniqueNoticeIds.size).toBe(noticeIds.length);

        const allCourseIds: string[] = [];
        data.requirements.forEach(req => {
            req.courses.forEach(course => {
                allCourseIds.push(course.id);
            });
        });

        const uniqueCourseIds = new Set(allCourseIds);
        expect(uniqueCourseIds.size).toBe(allCourseIds.length);

        mockRandom.mockRestore();
    });
});
