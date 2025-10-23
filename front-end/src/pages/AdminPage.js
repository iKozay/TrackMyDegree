// src/components/AdminPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Table, Spinner, Alert } from 'react-bootstrap';
import SearchBar from '../components/SearchBar'; // Assuming you have a SearchBar component
import '../css/AdminPage.css'; // Import the CSS file
import { motion } from 'framer-motion';
import { AdminPageError } from '../middleware/SentryErrors';
import { useNavigate } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';

const REACT_APP_SERVER = process.env.REACT_APP_SERVER || 'http://localhost:8000';
//This page is an admin dashboard for manipulating the database (CRUD). The page performs backups, deletes or restores them and can make the server seed data
const AdminPage = () => {
  const [tables, setTables] = useState([]); //list of all tables
  const [records, setRecords] = useState([]); //records of the currently selected database
  const [columns, setColumns] = useState([]); //table column names for displaying records
  const [loading, setLoading] = useState(true); //manages the spinner while the database loads
  const [selectedTable, setSelectedTable] = useState(null); //which table the user selected
  const [error, setError] = useState(''); //stores error message
  const [backups, setBackups] = useState([]); //list of backups
  const [selectedBackup, setSelectedBackup] = useState(''); //backup selected for manipulations
  //const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  //This function is ran once at the start. It calls the backend to get a list of backups and stores them in the "backups" variable
  const fetchBackups = async () => {
    try {
      const response = await fetch(`${REACT_APP_SERVER}/admin/fetch-backups`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to fetch backups');
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert('Backups fetched successfully!');
        setBackups(data.data);
      } else {
        console.error('Failed to fetch backups');
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  // Function to create a new backup
  const handleCreateBackup = async () => {
    try {
      const response = await fetch(`${REACT_APP_SERVER}/admin/create-backup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        alert('Failed to create backup');
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert('Backup created successfully!');
        fetchBackups(); // refresh list after creating backup
      } else {
        alert('Failed to create backup');
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      alert('Error creating backup');
    }
  };

  // Function to restore backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      alert('Please select a backup to restore');
      return;
    }
    try {
      const response = await fetch(`${REACT_APP_SERVER}/admin/restore-backup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName: selectedBackup }),
      });

      if (!response.ok) {
        alert('Failed to restore backup');
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert('Database restored successfully!');
      } else {
        alert(`Restore failed: ${data.message}`);
      }
    } catch (err) {
      console.error('Error restoring backup:', err);
      alert('Error restoring backup');
    }
  };

  // Function to delete selected backup
  const handleDeleteBackup = async () => {
    if (!selectedBackup) {
      alert('Please select a backup to delete');
      return;
    }
    try {
      const response = await fetch(`${REACT_APP_SERVER}/admin/delete-backup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName: selectedBackup }),
      });

      if (!response.ok) {
        alert('Failed to delete backup');
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert('Backup deleted successfully!');
        setSelectedBackup('');
        fetchBackups();
      } else {
        alert(`Deletion failed: ${data.message}`);
      }
    } catch (err) {
      console.error('Error deleting backup:', err);
      alert('Error deleting backup');
    }
  };

  // Fetch the list of tables when the component mounts
  useEffect(() => {
    const fetchTables = async () => {
      try {
        let response = await fetch(`${REACT_APP_SERVER}/admin/tables`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          navigate('/403'); //! Forbidden
        }

        response = await response.json();

        if (response.success) {
          if (Array.isArray(response.data)) {
            setTables(response.data);
          } else {
            throw new AdminPageError('Tables data is not an array');
          }
        } else {
          throw new AdminPageError('Failed to fetch tables');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching table list:', err);
        setError('Error fetching table list');
        setLoading(false);
      }
    };

    fetchTables();
  }, []);

  // Fetch records when a table is selected or keyword is updated
  const fetchRecords = async (tableName, keyword = '') => {
    setLoading(true);
    setError('');
    try {
      let url = `${REACT_APP_SERVER}/admin/tables/${tableName}`;
      if (keyword) {
        url += `?keyword=${encodeURIComponent(keyword)}`;
      }

      let response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
      });

      response = await response.json();

      if (response.success) {
        if (Array.isArray(response.data)) {
          setRecords(response.data);
          if (response.data.length > 0) {
            setColumns(Object.keys(response.data[0]));
          } else {
            setColumns([]);
          }
        } else {
          throw new AdminPageError('Records data is not an array');
        }
      } else {
        throw new AdminPageError('Failed to fetch records');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching table records:', err);
      setError('Error fetching table records');
      setLoading(false);
    }
  };

  const handleSearch = (searchKeyword) => {
    //setKeyword(searchKeyword);
    if (selectedTable) {
      fetchRecords(selectedTable, searchKeyword);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    fetchRecords(tableName);
  };

  /**This function is used to seed data into the database.
   *  The data is not being send from the client.
   *  Rather the server is using .json files that  are already present on the server (Back-End/course-data/course-list/updated_courses).**/
  const handleSeedData = async () => {
    try {
      const response = await fetch(`${REACT_APP_SERVER}/admin/seed-data`, {
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
    }
  };

  if (loading) {
    return (
      <div className="spinner-container">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <div className="admin-container">
        <Row className="mt-4">
          {/* Tables List Column */}
          <Col md={3} className="d-flex flex-column">
            <h5>Tables</h5>
            <ul className="list-group table-list">
              {tables.length > 0 ? (
                tables.map((table) => (
                  <li
                    key={table}
                    className={`list-group-item list-group-item-action ${selectedTable === table ? 'active' : ''}`}
                    onClick={() => handleTableSelect(table)}
                    style={{ cursor: 'pointer' }}
                  >
                    {table}
                  </li>
                ))
              ) : (
                <li className="list-group-item">No tables available.</li>
              )}
            </ul>
          </Col>

          {/* Records Table Column */}
          <Col md={12} className="records-table-container">
            {selectedTable ? (
              <div>
                <h3>{selectedTable}</h3>
                <div className="search-bar">
                  <SearchBar onSearch={handleSearch} />
                </div>
                {records.length === 0 ? (
                  <Alert variant="info">No records found.</Alert>
                ) : (
                  <Table striped bordered hover responsive className="records-table">
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record, idx) => (
                        <tr key={idx}>
                          {columns.map((col) => (
                            <td key={col} data-label={col}>
                              {record[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            ) : (
              <Alert variant="info">Select a table to view its records.</Alert>
            )}
          </Col>
        </Row>
        {/* Backup Section */}
        <Row className="mt-4">
          <Col md={12}>
            <h4>Database Backups</h4>
            <div className="backup-controls">
              <Button variant="primary" onClick={handleCreateBackup}>
                Create Backup
              </Button>
              <Form.Select
                value={selectedBackup}
                onChange={(e) => setSelectedBackup(e.target.value)}
                style={{ width: '300px', display: 'inline-block', margin: '0 10px' }}
              >
                <option value="">Select a backup...</option>
                {backups.map((backup) => (
                  <option key={backup} value={backup}>
                    {backup}
                  </option>
                ))}
              </Form.Select>
              <Button variant="success" onClick={handleRestoreBackup}>
                Restore Backup
              </Button>
              <Button variant="danger" onClick={handleDeleteBackup}>
                Delete Backup
              </Button>
            </div>
          </Col>
        </Row>
        <div style={{ marginTop: '20px' }}>
          {/* The new button for seeding data */}
          <button className="btn btn-primary" onClick={handleSeedData}>
            Seed Database with JSON
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminPage;
