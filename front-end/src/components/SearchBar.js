// src/components/SearchBar.js
import React, { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';

const SearchBar = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');

  // Handle the search form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(keyword); // Pass the keyword to the onSearch handler
  };

  // Handle input change
  const handleInputChange = (e) => {
    setKeyword(e.target.value);
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-3">
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="Search by keyword..."
          value={keyword}
          onChange={handleInputChange}
        />
        <Button variant="primary" type="submit">
          Search
        </Button>
      </InputGroup>
    </Form>
  );
};

export default SearchBar;
