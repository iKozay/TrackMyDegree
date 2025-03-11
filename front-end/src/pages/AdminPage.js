// src/components/AdminPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Table, Spinner, Alert } from 'react-bootstrap';
import SearchBar from '../components/SearchBar'; // Assuming you have a SearchBar component
import '../css/AdminPage.css'; // Import the CSS file
import {motion} from "framer-motion"

const AdminPage = () => {
    const [tables, setTables] = useState([]);
    const [records, setRecords] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    // Fetch the list of tables when the component mounts
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const response = await axios.post(`${process.env.REACT_APP_SERVER}/admin/tables`);
                console.log('Tables Response:', response.data); // Debugging Line

                if (response.data.success) {
                    if (Array.isArray(response.data.data)) {
                        setTables(response.data.data);
                    } else {
                        throw new Error('Tables data is not an array');
                    }
                } else {
                    throw new Error('Failed to fetch tables');
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
            let url = `${process.env.REACT_APP_SERVER}/admin/tables/${tableName}`;
            if (keyword) {
                url += `?keyword=${encodeURIComponent(keyword)}`;
            }

            const response = await axios.post(url);
            console.log('Records Response:', response.data); // Debugging Line

            if (response.data.success) {
                if (Array.isArray(response.data.data)) {
                    setRecords(response.data.data);
                    if (response.data.data.length > 0) {
                        setColumns(Object.keys(response.data.data[0]));
                    } else {
                        setColumns([]);
                    }
                } else {
                    throw new Error('Records data is not an array');
                }
            } else {
                throw new Error('Failed to fetch records');
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching table records:', err);
            setError('Error fetching table records');
            setLoading(false);
        }
    };

    const handleSearch = (searchKeyword) => {
        setKeyword(searchKeyword);
        if (selectedTable) {
            fetchRecords(selectedTable, searchKeyword);
        }
    };

    const handleTableSelect = (tableName) => {
        setSelectedTable(tableName);
        fetchRecords(tableName);
    };

    const handleSeedData = async () => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_SERVER}/admin/seed-data`);
            if (response.data.success) {
                alert('Data seeding successful!');
            } else {
                alert(`Data seeding failed: ${response.data.message}`);
            }
        } catch (err) {
            console.error(err);
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
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
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
                                    className={`list-group-item list-group-item-action ${selectedTable === table ? 'active' : ''
                                        }`}
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
