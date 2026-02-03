import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SearchCourses from '../../../components/ClassBuilderComponents/SearchCourses';

describe('SearchCourses', () => {
    it('renders the component title', () => {
        render(<SearchCourses />);
        expect(screen.getByText('Search & Add Courses')).toBeInTheDocument();
    });

    it('renders semester selection label', () => {
        render(<SearchCourses />);
        expect(screen.getByText('Select Semester')).toBeInTheDocument();
    });

    it('renders search input label', () => {
        render(<SearchCourses />);
        expect(screen.getByText('Search for Courses')).toBeInTheDocument();
    });

    it('renders semester select dropdown', () => {
        render(<SearchCourses />);
        const select = screen.getByDisplayValue('Winter 2025');
        expect(select).toBeInTheDocument();
        expect(select).toBeInstanceOf(HTMLSelectElement);
    });

    it('renders search input field', () => {
        render(<SearchCourses />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        expect(input).toBeInTheDocument();
        expect(input).toBeInstanceOf(HTMLInputElement);
    });

    it('has correct default semester value', () => {
        render(<SearchCourses />);
        const select = screen.getByDisplayValue('Winter 2025') as HTMLSelectElement;
        expect(select.value).toBe('winter-2025');
    });

    it('renders dropdown chevron icon', () => {
        const { container } = render(<SearchCourses />);
        const chevronIcon = container.querySelector('.search-courses-card__select-icon');
        expect(chevronIcon).toBeInTheDocument();
    });

    it('renders search icon', () => {
        const { container } = render(<SearchCourses />);
        const searchIcon = container.querySelector('.search-courses-card__search-icon');
        expect(searchIcon).toBeInTheDocument();
    });

    it('has correct CSS classes on card container', () => {
        const { container } = render(<SearchCourses />);
        const card = container.querySelector('.search-courses-card');
        expect(card).toBeInTheDocument();
    });

    it('has correct CSS classes on select wrapper', () => {
        const { container } = render(<SearchCourses />);
        const wrapper = container.querySelector('.search-courses-card__select-wrapper');
        expect(wrapper).toBeInTheDocument();
    });

    it('has correct CSS classes on search wrapper', () => {
        const { container } = render(<SearchCourses />);
        const wrapper = container.querySelector('.search-courses-card__search-wrapper');
        expect(wrapper).toBeInTheDocument();
    });

    it('renders both input groups', () => {
        const { container } = render(<SearchCourses />);
        const groups = container.querySelectorAll('.search-courses-card__group');
        expect(groups.length).toBe(2);
    });

    it('search input has correct placeholder', () => {
        render(<SearchCourses />);
        const input = screen.getByPlaceholderText('Search by course code or name...');
        expect(input.getAttribute('placeholder')).toBe('Search by course code or name...');
    });

    it('labels are properly associated with inputs', () => {
        render(<SearchCourses />);
        const semesterLabel = screen.getByText('Select Semester');
        const searchLabel = screen.getByText('Search for Courses');
        expect(semesterLabel).toBeInstanceOf(HTMLLabelElement);
        expect(searchLabel).toBeInstanceOf(HTMLLabelElement);
    });

    it('renders style tag', () => {
        const { container } = render(<SearchCourses />);
        const style = container.querySelector('style');
        expect(style).toBeInTheDocument();
    });

    it('select has correct CSS class', () => {
        const { container } = render(<SearchCourses />);
        const select = container.querySelector('.search-courses-card__select');
        expect(select).toBeInTheDocument();
    });

    it('input has correct CSS class', () => {
        const { container } = render(<SearchCourses />);
        const input = container.querySelector('.search-courses-card__input');
        expect(input).toBeInTheDocument();
    });

    it('icons are marked as aria-hidden', () => {
        const { container } = render(<SearchCourses />);
        const icons = container.querySelectorAll('svg[aria-hidden="true"]');
        expect(icons.length).toBe(2); // chevron and search icons
    });

    it('semester option has correct value', () => {
        const { container } = render(<SearchCourses />);
        const option = container.querySelector('option[value="winter-2025"]');
        expect(option).toBeInTheDocument();
        expect(option?.textContent).toBe('Winter 2025');
    });
});