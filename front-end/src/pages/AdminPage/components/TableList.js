import React from 'react';
import PropTypes from 'prop-types';
import { Col } from 'react-bootstrap';

/**
 * Component for displaying the list of database tables
 * Shows tables in a sidebar with selection highlighting
 */
const TablesList = ({ tables = [], selectedTable, onTableSelect }) => {
  return (
    <Col md={3} className="d-flex flex-column">
      <h5>Tables</h5>
      <ul className="list-group table-list">
        {tables.length > 0 ? (
          tables.map((table) => (
            <button
              key={table}
              type="button"
              className={`list-group-item list-group-item-action text-start ${
                selectedTable === table ? 'active' : ''
              }`}
              onClick={() => onTableSelect(table)}
            >
              {table}
            </button>
          ))
        ) : (
          <li className="list-group-item">No tables available.</li>
        )}
      </ul>
    </Col>
  );
};

/**
 * Prop validation for TablesList
 */
TablesList.propTypes = {
  /** Array of table names */
  tables: PropTypes.arrayOf(PropTypes.string),

  /** Name of the currently selected table */
  selectedTable: PropTypes.string,

  /** Function called when a table is selected */
  onTableSelect: PropTypes.func.isRequired,
};

export default TablesList;
