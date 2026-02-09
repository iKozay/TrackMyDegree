import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreditFormsManagementPage from '../../pages/CreditFormsManagementPage';

// Mock the components used in the page
vi.mock('../../components/CreditFormManager', () => ({
    CreditFormManager: () => <div data-testid="credit-form-manager">Mock Credit Form Manager</div>,
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate,
}));

describe('CreditFormsManagementPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the back button and CreditFormManager', () => {
        render(
            <MemoryRouter>
                <CreditFormsManagementPage />
            </MemoryRouter>
        );

        expect(screen.getByText('← Back')).toBeInTheDocument();
        expect(screen.getByTestId('credit-form-manager')).toBeInTheDocument();
    });

    test('navigates back when back button is clicked', () => {
        render(
            <MemoryRouter>
                <CreditFormsManagementPage />
            </MemoryRouter>
        );

        const backButton = screen.getByText('← Back');
        fireEvent.click(backButton);

        expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    test('matches snapshot', () => {
        const { asFragment } = render(
            <MemoryRouter>
                <CreditFormsManagementPage />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
