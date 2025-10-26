import React from 'react';
import { Col, Table, Alert } from 'react-bootstrap';
import SearchBar from './SearchBar';

/**
 * Component for displaying table records
 * Shows records in a searchable table format
 */
const RecordsTable = ({
  selectedTable,
  records,
  columns,
  onSearch,
}) => {
  if (!selectedTable) {
    return (
      <Col md={12} className="records-table-container">
        <Alert variant="info">Select a table to view its records.</Alert>
      </Col>
    );
  }

  return (
    <Col md={12} className="records-table-container">
      <div>
        <h3>{selectedTable}</h3>
        <div className="search-bar">
          <SearchBar onSearch={onSearch} />
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
    </Col>
  );
};

export default RecordsTable;