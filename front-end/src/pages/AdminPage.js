import React, { useEffect, useState } from 'react';
import { Row, Spinner, Alert, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import '../css/AdminPage.css';

// Custom hooks
import useBackupManager from 'front-end/src/pages/AdminPage/hooks/useBackupManager';
import useDatabaseTables from 'front-end/src/pages/AdminPage/hooks/useDatabaseTables';
import useTableRecords from 'front-end/src/pages/AdminPage/hooks/useTableRecords';

// Components
import BackupManagement from 'front-end/src/pages/AdminPage/components/BackupManagement';
import TablesList from 'front-end/src/pages/AdminPage/components/TableList';
import RecordsTable from 'front-end/src/pages/AdminPage/components/RecordsTable';

/**
 * Admin dashboard for database management
 * Handles CRUD operations, backups, and data seeding
 */
const AdminPage = () => {
  // Custom hooks for state management
  const backupManager = useBackupManager();
  const tableManager = useDatabaseTables();
  const recordsManager = useTableRecords();

  // Seed data functionality
  const [seedLoading, setSeedLoading] = useState(false);

  // Fetch records when table is selected
  useEffect(() => {
    if (tableManager.selectedTable) {
      recordsManager.fetchRecords(tableManager.selectedTable);
    }
  }, [tableManager.selectedTable, recordsManager]);

  const handleSearch = (searchKeyword) => {
    recordsManager.handleSearch(tableManager.selectedTable, searchKeyword);
  };

  const handleSeedData = async () => {
    setSeedLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER}/admin/seed-data`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        alert('Failed to seed data');
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert('Data seeding successful!');
      } else {
        alert(`Data seeding failed: ${data.message}`);
      }
    } catch (err) {
      console.error('Error seeding data:', err);
      alert(`Error seeding data: ${err.message}`);
    } finally {
      setSeedLoading(false);
    }
  };

  // Loading state
  if (tableManager.loading) {
    return (
      <div className="spinner-container">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Error state
  if (tableManager.error) {
    return (
      <div className="mt-4">
        <Alert variant="danger">{tableManager.error}</Alert>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="admin-container">
        <Row className="mt-4">
          <TablesList
            tables={tableManager.tables}
            selectedTable={tableManager.selectedTable}
            onTableSelect={tableManager.handleTableSelect}
          />
          <RecordsTable
            selectedTable={tableManager.selectedTable}
            records={recordsManager.records}
            columns={recordsManager.columns}
            onSearch={handleSearch}
          />
        </Row>

        <BackupManagement
          backups={backupManager.backups}
          selectedBackup={backupManager.selectedBackup}
          onBackupSelect={backupManager.setSelectedBackup}
          onCreateBackup={backupManager.createBackup}
          onRestoreBackup={backupManager.restoreBackup}
          onDeleteBackup={backupManager.deleteBackup}
          loading={backupManager.loading}
        />

        <div style={{ marginTop: '20px' }}>
          <Button
            variant="primary"
            onClick={handleSeedData}
            disabled={seedLoading}
          >
            {seedLoading ? 'Seeding...' : 'Seed Database with JSON'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPage;