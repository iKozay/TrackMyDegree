import React from 'react';
import { Col } from 'react-bootstrap';

/**
 * Component for displaying the list of database tables
 * Shows tables in a sidebar with selection highlighting
 */
const TablesList = ({ tables, selectedTable, onTableSelect }) => {
  return (
    <Col md={3} className="d-flex flex-column">
      <h5>Tables</h5>
      <ul className="list-group table-list">
        {tables.length > 0 ? (
          tables.map((table) => (
            <li
              key={table}
              className={`list-group-item list-group-item-action ${
                selectedTable === table ? 'active' : ''
              }`}
              onClick={() => onTableSelect(table)}
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
  );
};

export default TablesList;