import React from 'react';
import PropTypes from 'prop-types';
import { Col, Table, Alert } from 'react-bootstrap';
import SearchBar from '../../../components/SearchBar';

/**
 * Component for displaying table records
 * Shows records in a searchable table format
 */
const RecordsTable = ({ selectedTable, records = [], columns = [], onSearch }) => {
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
              <tr>{Array.isArray(columns) && columns.map((col) => <th key={col}>{col}</th>)}</tr>
            </thead>
            <tbody>
              {Array.isArray(records) &&
                records.map((record) => (
                  <tr key={record.id || record._id || JSON.stringify(record)}>
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

/**
 * Prop type validation for RecordsTable
 */
RecordsTable.propTypes = {
  /** Name of the selected table */
  selectedTable: PropTypes.string,

  /** Array of record objects to display */
  records: PropTypes.arrayOf(PropTypes.object),

  /** Array of column names to display as headers */
  columns: PropTypes.arrayOf(PropTypes.string),

  /** Function triggered when user searches */
  onSearch: PropTypes.func,
};

export default RecordsTable;
