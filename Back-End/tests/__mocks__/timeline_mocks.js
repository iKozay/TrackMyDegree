const validMockTimeline = {
  id: 'timeline123',
  user_id: 'user456',
  degree_id: 'degree789',
  name: 'My Engineering Timeline',
  last_modified: new Date().toISOString(), // Current timestamp in ISO format
  items: [
    {
      id: 'item1',
      course: 'COMP 248',
      semester: 'Fall 2025',
      status: 'completed',
    },
    {
      id: 'item2',
      course: 'COMP 249',
      semester: 'Winter 2026',
      status: 'planned',
    },
  ],
  isExtendedCredit: false,
};

module.exports = {
  validMockTimeline,
};
