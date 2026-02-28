import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import SearchCourses from '../../../components/ClassBuilderComponents/SearchCourses';
import type { AddedCourse } from '../../../types/classItem';

// Feb 28 2026 is before March 15 → academicYearStart = 2025
// Semesters: Summer 2025 (default/index 0), Fall 2025, Winter 2026

const defaultProps = {
    addedCourses: [] as AddedCourse[],
    setAddedCourses: vi.fn(),
};

describe('SearchCourses', () => {
    it('renders the component title', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search & Add Courses')).toBeInTheDocument();
    });

    it('renders semester selection label', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Select Semester')).toBeInTheDocument();
    });

    it('renders search input label', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search for Courses')).toBeInTheDocument();
    });

    it('renders semester select dropdown with correct default', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025');
        expect(select).toBeInTheDocument();
        expect(select).toBeInstanceOf(HTMLSelectElement);
    });

    it('has correct default semester value', () => {
        render(<SearchCourses {...defaultProps} />);
        const select = screen.getByDisplayValue('Summer 2025') as HTMLSelectElement;
        expect(select.value).toBe('summer-2025');
    });

    it('renders search input field', () => {
        render(<SearchCourses {...defaultProps} />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        expect(input).toBeInTheDocument();
        expect(input).toBeInstanceOf(HTMLInputElement);
    });

    it('renders dropdown chevron icon', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select-icon')).toBeInTheDocument();
    });

    it('renders search icon', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__search-icon')).toBeInTheDocument();
    });

    it('has correct CSS class on card container', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card')).toBeInTheDocument();
    });

    it('has correct CSS class on select wrapper', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select-wrapper')).toBeInTheDocument();
    });

    it('has correct CSS class on search wrapper', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__search-wrapper')).toBeInTheDocument();
    });

    it('renders both input groups', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelectorAll('.search-courses-card__group').length).toBe(2);
    });

    it('search input has correct placeholder', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByPlaceholderText('Search by course code or name...').getAttribute('placeholder'))
            .toBe('Search by course code or name...');
    });

    it('labels are proper HTMLLabelElements', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Select Semester')).toBeInstanceOf(HTMLLabelElement);
        expect(screen.getByText('Search for Courses')).toBeInstanceOf(HTMLLabelElement);
    });

    it('renders style tag', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('style')).toBeInTheDocument();
    });

    it('select has correct CSS class', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__select')).toBeInTheDocument();
    });

    it('input has correct CSS class', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('.search-courses-card__input')).toBeInTheDocument();
    });

    it('icons are marked as aria-hidden', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBe(2);
    });

    it('renders all three semester options for academic year 2025', () => {
        const { container } = render(<SearchCourses {...defaultProps} />);
        expect(container.querySelector('option[value="summer-2025"]')?.textContent).toBe('Summer 2025');
        expect(container.querySelector('option[value="fall-2025"]')?.textContent).toBe('Fall 2025');
        expect(container.querySelector('option[value="winter-2026"]')?.textContent).toBe('Winter 2026');
    });

    it('renders a Search button', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('Search button is disabled when input is empty', () => {
        render(<SearchCourses {...defaultProps} />);
        expect(screen.getByText('Search')).toBeDisabled();
    });
});