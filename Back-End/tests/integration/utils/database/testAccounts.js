const mongoose = require('mongoose');
const { User } = require('../../../../models/user');
const bcrypt = require('bcryptjs');
/*
  * Helper that creates a test admin user in the database.
 */
const MONGODB_URI = process.env.MONGODB_URI;

// Function to create a test admin user
async function createTestAdminUser() {
  // Connect to the test database if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  // Check if admin user already exists
  const existingAdmin = await User.findOne({ email: 'admin@test.com' });
  if (existingAdmin) {
    console.log('Test admin user already exists');
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash('testpassword', 10);

  // Create admin user
  const adminUser = new User({
    fullname: 'Test Admin',
    email: 'admin@test.com',
    password: hashedPassword,
    type: 'admin',
    isVerified: true,
    degreeId: null
  });

  await adminUser.save();
  console.log('Test admin user created successfully');
}

module.exports = { createTestAdminUser };
