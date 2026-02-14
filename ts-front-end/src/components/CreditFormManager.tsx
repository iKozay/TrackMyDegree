import React, { useEffect, useState } from 'react';
import {
    fetchCreditForms,
    createCreditForm,
    updateCreditForm,
    deleteCreditForm,
    migrateCreditForms,
} from '../api/creditFormsApi';
import type { CreditForm } from '../api/creditFormsApi';
import { toast } from 'react-toastify';

const BURGUNDY = '#7a0019';

export const CreditFormManager: React.FC = () => {
    const [forms, setForms] = useState<CreditForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingForm, setEditingForm] = useState<CreditForm | null>(null);
    const [migrating, setMigrating] = useState(false);

    // Form fields
    const [programId, setProgramId] = useState('');
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const loadForms = async () => {
        try {
            setLoading(true);
            const data = await fetchCreditForms();
            setForms(data);
        } catch (error) {
            console.error('Error loading forms:', error);
            toast.error('Failed to load credit forms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadForms();
    }, []);

    const handleMigrate = async () => {
        try {
            setMigrating(true);
            const result = await migrateCreditForms();
            toast.success(`${result.migratedCount} forms migrated successfully`);
            loadForms();
        } catch (error) {
            console.error('Error migrating forms:', error);
            toast.error('Failed to migrate forms');
        } finally {
            setMigrating(false);
        }
    };

    const openAddModal = () => {
        setEditingForm(null);
        setProgramId('');
        setTitle('');
        setSubtitle('');
        setPdfFile(null);
        setShowModal(true);
    };

    const openEditModal = (form: CreditForm) => {
        setEditingForm(form);
        setProgramId(form.id);
        setTitle(form.title);
        setSubtitle(form.subtitle);
        setPdfFile(null);
        setShowModal(true);
    };

    const handleDelete = async (form: CreditForm) => {
        if (!confirm(`Are you sure you want to delete "${form.title}"?`)) return;

        try {
            await deleteCreditForm(form.id);
            toast.success('Form deleted successfully');
            loadForms();
        } catch (error) {
            console.error('Error deleting form:', error);
            toast.error('Failed to delete form');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingForm) {
                // Update existing form
                await updateCreditForm(editingForm.id, title, subtitle, pdfFile || undefined);
                toast.success('Form updated successfully');
            } else {
                // Create new form
                if (!pdfFile) {
                    toast.error('Please select a PDF file');
                    setSubmitting(false);
                    return;
                }
                await createCreditForm(programId, title, subtitle, pdfFile);
                toast.success('Form created successfully');
            }
            setShowModal(false);
            loadForms();
        } catch (error) {
            console.error('Error saving form:', error);
            toast.error('Failed to save form');
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
        } else if (file) {
            toast.error('Please select a PDF file');
        }
    };

    const generateProgramId = (titleStr: string) => {
        return titleStr
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, color: BURGUNDY }}>Credit Forms Management</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleMigrate}
                        disabled={migrating}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: `2px solid ${BURGUNDY}`,
                            background: '#fff',
                            color: BURGUNDY,
                            fontWeight: 600,
                            cursor: migrating ? 'not-allowed' : 'pointer',
                            opacity: migrating ? 0.6 : 1,
                        }}
                    >
                        {migrating ? 'Migrating...' : 'Migrate Existing Forms'}
                    </button>
                    <button
                        onClick={openAddModal}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: BURGUNDY,
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Add New Form
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading forms...</p>
                </div>
            ) : forms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#f9f9f9', borderRadius: '12px' }}>
                    <p style={{ color: '#666', marginBottom: '16px' }}>
                        No credit forms found. Click "Migrate Existing Forms" to import the current forms, or add a new one.
                    </p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f5f5f5' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Title</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Subtitle</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ID</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '150px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {forms.map((form) => (
                                <tr key={form.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{form.title}</td>
                                    <td style={{ padding: '12px 16px', color: '#666', fontSize: '14px' }}>{form.subtitle}</td>
                                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#888' }}>{form.id}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => openEditModal(form)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: `1px solid ${BURGUNDY}`,
                                                background: '#fff',
                                                color: BURGUNDY,
                                                marginRight: '8px',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(form)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #dc2626',
                                                background: '#fff',
                                                color: '#dc2626',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '16px',
                            padding: '32px',
                            width: '100%',
                            maxWidth: '500px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 24px 0', color: BURGUNDY }}>
                            {editingForm ? 'Edit Credit Form' : 'Add New Credit Form'}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            {!editingForm && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="programId" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Program ID</label>
                                    <input
                                        id="programId"
                                        type="text"
                                        value={programId}
                                        onChange={(e) => setProgramId(e.target.value)}
                                        placeholder="e.g., software-engineering"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                    <small style={{ color: '#888' }}>Auto-generate from title: </small>
                                    <button
                                        type="button"
                                        onClick={() => setProgramId(generateProgramId(title))}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: BURGUNDY,
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            fontSize: '12px',
                                        }}
                                    >
                                        Generate
                                    </button>
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label htmlFor="title" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Software Engineering"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label htmlFor="subtitle" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Subtitle</label>
                                <input
                                    id="subtitle"
                                    type="text"
                                    value={subtitle}
                                    onChange={(e) => setSubtitle(e.target.value)}
                                    placeholder="e.g., Bachelor of Software Engineering Credit Count Form"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="pdfFile" style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                                    PDF File {editingForm && '(leave empty to keep current)'}
                                </label>
                                <input
                                    id="pdfFile"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    required={!editingForm}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '14px',
                                        boxSizing: 'border-box',
                                    }}
                                />
                                {pdfFile && (
                                    <small style={{ color: '#666' }}>Selected: {pdfFile.name}</small>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        background: '#fff',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: BURGUNDY,
                                        color: '#fff',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontWeight: 500,
                                        opacity: submitting ? 0.6 : 1,
                                    }}
                                >
                                    {submitting ? 'Saving...' : (editingForm ? 'Update Form' : 'Create Form')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditFormManager;
