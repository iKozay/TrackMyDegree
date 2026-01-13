import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import BackupManagement from '../../../legacy/components/BackupManagement';

// Mock window.alert
globalThis.alert = vi.fn();

describe('BackupManagement Component', () => {
  const mockProps: any = {
    backups: ['backup1.sql', 'backup2.sql'],
    selectedBackup: '',
    onBackupSelect: vi.fn(),
    onCreateBackup: vi.fn(),
    onRestoreBackup: vi.fn(),
    onDeleteBackup: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render backup management section', () => {
    render(<BackupManagement {...mockProps} />);

    expect(screen.getByText('Database Backups')).toBeInTheDocument();
    expect(screen.getByText('Create Backup')).toBeInTheDocument();
    expect(screen.getByText('Restore Backup')).toBeInTheDocument();
    expect(screen.getByText('Delete Backup')).toBeInTheDocument();
  });

  it('should render all backups in dropdown', () => {
    render(<BackupManagement {...mockProps} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Check if backups are in the dropdown
    mockProps.backups.forEach((backup: string) => {
      expect(screen.getByText(backup)).toBeInTheDocument();
    });
  });

  it('should call onBackupSelect when backup is selected', () => {
    render(<BackupManagement {...mockProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'backup1.sql' } });

    expect(mockProps.onBackupSelect).toHaveBeenCalledWith('backup1.sql');
  });

  it('should call onCreateBackup and show alert on create', async () => {
    mockProps.onCreateBackup.mockResolvedValue({
      success: true,
      message: 'Backup created successfully',
    });

    render(<BackupManagement {...mockProps} />);

    const createButton = screen.getByText('Create Backup');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockProps.onCreateBackup).toHaveBeenCalled();
      expect(globalThis.alert).toHaveBeenCalledWith('Backup created successfully');
    });
  });

  it('should call onRestoreBackup when restore button is clicked', async () => {
    const propsWithSelected = {
      ...mockProps,
      selectedBackup: 'backup1.sql',
    };

    propsWithSelected.onRestoreBackup.mockResolvedValue({
      success: true,
      message: 'Database restored successfully',
    });

    render(<BackupManagement {...propsWithSelected} />);

    const restoreButton = screen.getByText('Restore Backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(propsWithSelected.onRestoreBackup).toHaveBeenCalledWith('backup1.sql');
      expect(globalThis.alert).toHaveBeenCalledWith('Database restored successfully');
    });
  });

  it('should call onDeleteBackup when delete button is clicked', async () => {
    const propsWithSelected = {
      ...mockProps,
      selectedBackup: 'backup1.sql',
    };

    propsWithSelected.onDeleteBackup.mockResolvedValue({
      success: true,
      message: 'Backup deleted successfully',
    });

    render(<BackupManagement {...propsWithSelected} />);

    const deleteButton = screen.getByText('Delete Backup');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(propsWithSelected.onDeleteBackup).toHaveBeenCalledWith('backup1.sql');
      expect(globalThis.alert).toHaveBeenCalledWith('Backup deleted successfully');
    });
  });

  it('should disable buttons when loading', () => {
    const loadingProps = { ...mockProps, loading: true };

    render(<BackupManagement {...loadingProps} />);

    expect(screen.getByText('Create Backup')).toBeDisabled();
    expect(screen.getByText('Restore Backup')).toBeDisabled();
    expect(screen.getByText('Delete Backup')).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('should disable restore and delete when no backup selected', () => {
    render(<BackupManagement {...mockProps} />);

    expect(screen.getByText('Restore Backup')).toBeDisabled();
    expect(screen.getByText('Delete Backup')).toBeDisabled();
  });

  it('should enable restore and delete when backup is selected', () => {
    const propsWithSelected = {
      ...mockProps,
      selectedBackup: 'backup1.sql',
    };

    render(<BackupManagement {...propsWithSelected} />);

    expect(screen.getByText('Restore Backup')).not.toBeDisabled();
    expect(screen.getByText('Delete Backup')).not.toBeDisabled();
  });

  it('should show error message in alert when operation fails', async () => {
    mockProps.onCreateBackup.mockResolvedValue({
      success: false,
      message: 'Failed to create backup',
    });

    render(<BackupManagement {...mockProps} />);

    const createButton = screen.getByText('Create Backup');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith('Failed to create backup');
    });
  });
});
