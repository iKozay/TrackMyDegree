import React from 'react';
import { Row, Col, Button, Form } from 'react-bootstrap';

/**
 * Component for managing database backups
 * Displays controls for creating, restoring, and deleting backups
 */
const BackupManagement = ({
  backups,
  selectedBackup,
  onBackupSelect,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  loading = false,
}) => {
  const handleCreate = async () => {
    const result = await onCreateBackup();
    alert(result.message);
  };

  const handleRestore = async () => {
    const result = await onRestoreBackup(selectedBackup);
    alert(result.message);
  };

  const handleDelete = async () => {
    const result = await onDeleteBackup(selectedBackup);
    alert(result.message);
  };

  return (
    <Row className="mt-4">
      <Col md={12}>
        <h4>Database Backups</h4>
        <div className="backup-controls">
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={loading}
          >
            Create Backup
          </Button>
          <Form.Select
            value={selectedBackup}
            onChange={(e) => onBackupSelect(e.target.value)}
            style={{ width: '300px', display: 'inline-block', margin: '0 10px' }}
            disabled={loading}
          >
            <option value="">Select a backup...</option>
            {backups.map((backup) => (
              <option key={backup} value={backup}>
                {backup}
              </option>
            ))}
          </Form.Select>
          <Button
            variant="success"
            onClick={handleRestore}
            disabled={loading || !selectedBackup}
          >
            Restore Backup
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading || !selectedBackup}
          >
            Delete Backup
          </Button>
        </div>
      </Col>
    </Row>
  );
};

export default BackupManagement;