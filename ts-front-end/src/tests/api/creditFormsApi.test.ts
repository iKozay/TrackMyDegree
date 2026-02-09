import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    fetchCreditForms,
    fetchCreditFormById,
    createCreditForm,
    updateCreditForm,
    deleteCreditForm,
    migrateCreditForms,
} from '../../api/creditFormsApi';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const localStorageMock = (function () {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
    };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('creditFormsApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('mock-token');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('fetchCreditForms', () => {
        test('should fetch all credit forms successfully', async () => {
            const mockForms = {
                forms: [
                    {
                        id: 'software-engineering',
                        title: 'Software Engineering',
                        subtitle: 'Bachelor of Software Engineering Credit Count Form',
                        pdf: '/api/credit-forms/file/software-engineering.pdf',
                    },
                ],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockForms),
            });

            const result = await fetchCreditForms();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms'),
                expect.objectContaining({
                    method: 'GET',
                })
            );
            expect(result).toEqual(mockForms.forms);
        });

        test('should throw error on failed request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Server error' }),
            });

            await expect(fetchCreditForms()).rejects.toThrow();
        });

        test('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(fetchCreditForms()).rejects.toThrow('Network error');
        });
    });

    describe('fetchCreditFormById', () => {
        test('should fetch a single form by id', async () => {
            const mockForm = {
                id: 'software-engineering',
                title: 'Software Engineering',
                subtitle: 'Bachelor of Software Engineering Credit Count Form',
                pdf: '/api/credit-forms/file/software-engineering.pdf',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockForm),
            });

            const result = await fetchCreditFormById('software-engineering');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms/software-engineering'),
                expect.objectContaining({
                    method: 'GET',
                })
            );
            expect(result).toEqual(mockForm);
        });

        test('should throw error for non-existent form', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: 'Not found' }),
            });

            await expect(fetchCreditFormById('nonexistent')).rejects.toThrow();
        });
    });

    describe('createCreditForm', () => {
        test('should create a new form with file upload', async () => {
            const programId = 'new-program';
            const title = 'New Program';
            const subtitle = 'New Program Credit Count Form';
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            const mockResponse = {
                message: 'Credit form created successfully',
                form: {
                    id: 'new-program',
                    title: 'New Program',
                    subtitle: 'New Program Credit Count Form',
                    pdf: '/api/credit-forms/file/new-program.pdf',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await createCreditForm(programId, title, subtitle, file);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData),
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('should include auth token in headers', async () => {
            const programId = 'test';
            const title = 'Test';
            const subtitle = 'Test Subtitle';
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await createCreditForm(programId, title, subtitle, file);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-token',
                    }),
                })
            );
        });

        test('should throw error on conflict (duplicate programId)', async () => {
            const programId = 'existing';
            const title = 'Existing';
            const subtitle = 'Existing Subtitle';
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 409,
                json: () => Promise.resolve({ error: 'Form already exists' }),
            });

            await expect(createCreditForm(programId, title, subtitle, file)).rejects.toThrow();
        });
    });

    describe('updateCreditForm', () => {
        test('should update an existing form', async () => {
            const title = 'Updated Title';

            const mockResponse = {
                message: 'Credit form updated successfully',
                form: {
                    id: 'software-engineering',
                    title: 'Updated Title',
                    subtitle: 'Bachelor of Software Engineering Credit Count Form',
                    pdf: '/api/credit-forms/file/software-engineering.pdf',
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await updateCreditForm('form-id-123', title);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms/form-id-123'),
                expect.objectContaining({
                    method: 'PUT',
                    body: expect.any(FormData),
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('should throw error for non-existent form', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: 'Not found' }),
            });

            await expect(updateCreditForm('nonexistent', 'Title')).rejects.toThrow();
        });
    });

    describe('deleteCreditForm', () => {
        test('should delete a form successfully', async () => {
            const mockResponse = {
                message: 'Credit form deleted successfully',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await deleteCreditForm('form-id-123');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms/form-id-123'),
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
            expect(result).toEqual(mockResponse);
        });

        test('should throw error for non-existent form', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ error: 'Not found' }),
            });

            await expect(deleteCreditForm('nonexistent')).rejects.toThrow();
        });

        test('should throw error for unauthorized user', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: () => Promise.resolve({ error: 'Forbidden' }),
            });

            await expect(deleteCreditForm('form-id-123')).rejects.toThrow();
        });
    });

    describe('migrateCreditForms', () => {
        test('should trigger migration successfully', async () => {
            const mockResponse = {
                message: 'Migration complete',
                migratedCount: 5,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            });

            const result = await migrateCreditForms();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/credit-forms/migrate'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
            expect(result).toEqual(mockResponse);
        });
    });

    describe('Authentication', () => {
        test('should work without auth token for public endpoints', async () => {
            localStorageMock.getItem.mockReturnValue(null);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ forms: [] }),
            });

            await fetchCreditForms();

            expect(mockFetch).toHaveBeenCalled();
        });

        test('should include credentials in fetch options', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ forms: [] }),
            });

            await fetchCreditForms();

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    credentials: 'include',
                })
            );
        });
    });
});
