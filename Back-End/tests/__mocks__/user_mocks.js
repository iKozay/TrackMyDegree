const mockUser = {
  id: 'random-uuid',
  email: 'newuser@example.com',
  fullname: 'New User',
  type: 'student',
};

const mockDBRecord = {
  id: 'random uuid',
  email: 'example@example.com',
  password: 'Hashed password',
  fullname: 'Random User',
  type: 'student',
};

const resetPassMock = {
  otp: '1234',
  password: 'newpassword',
  confirmPassword: 'newpassword',
};

module.exports = {
  mockUser,
  mockDBRecord,
  resetPassMock,
};
