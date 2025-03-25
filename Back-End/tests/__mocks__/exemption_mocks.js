const newExemption = {
  coursecodes: ['COMP335'],
  user_id: '1',
};

const mockExemption = {
  created: [newExemption],
  alreadyExists: [],
};

const exemptionRequest = {
  user_id: '1',
};

const deleteExemptionRequest = {
  coursecode: 'COMP335',
  user_id: '1',
};

module.exports = {
  newExemption,
  mockExemption,
  exemptionRequest,
  deleteExemptionRequest,
};
