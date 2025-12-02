const { MongoDBContainer } = require('@testcontainers/mongodb');
const mongoose = require('mongoose');
/*
 * Starts a MongoDB test container, connects via mongoose,
 * and initializes the database schema.
 * Returns connection info for globalSetup to set MONGODB_URI.
 */

let mongo;

async function startMongoTestContainer(dbName) {
  try {
    console.log('Starting MongoDB container...');

    mongo = await new MongoDBContainer('mongo:7')
      .withExposedPorts(27017)
      .withStartupTimeout(120000)
      .withCommand(['--replSet', 'rs0', '--bind_ip_all'])
      .start();

    console.log('MongoDB container started successfully');
    const host = mongo.getHost();
    const mappedPort = mongo.getMappedPort(27017);
    const uri = `mongodb://${host}:${mappedPort}/${dbName}?directConnection=true`;

    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 1,
      directConnection: true,
    });

    console.log('MongoDB connected successfully');
    console.log('Initializing database schema...');
    await initializeDatabaseSchema();
    console.log('Database schema initialized successfully');

    // Return connection info that globalSetup expects
    return {
      container: mongo,
      host,
      port: mappedPort,
      uri,
      dbName,
    };
  } catch (error) {
    console.error('MongoDB container startup failed:', error);
    console.error('Error stack:', error.stack);

    if (mongo) {
      console.log('Attempting to stop failed container...');
      try {
        await mongo.stop();
        console.log('Failed container stopped');
      } catch (stopError) {
        console.error('Error stopping failed container:', stopError);
      }
    }
    throw error;
  }
}
// Initialize database schema by loading models and creating collections
async function initializeDatabaseSchema() {
  try {
    // Load models once to register schemas
    const { Degree } = require('../../../../models/degree');
    const { CoursePool } = require('../../../../models/coursepool');
    const { Course } = require('../../../../models/course');
    const { User } = require('../../../../models/user');
    const { Feedback } = require('../../../../models/feedback');
    const { Timeline } = require('../../../../models/timeline');

    const models = [CoursePool, Course, Degree, User, Feedback, Timeline];

    for (const Model of models) {
      await Model.createIndexes();
      console.log(`Created collection: ${Model.collection.name}`);
    }

    // Verify database and collections were created
    const dbName = mongoose.connection.db.databaseName;
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();

    if (!dbs.databases.some((d) => d.name === dbName)) {
      throw new Error(`Database ${dbName} was not created`);
    }

    console.log(`Database ${dbName} created with all required collections`);
  } catch (error) {
    console.error('Schema initialization failed:', error);
    throw error;
  }
}
// Stops the MongoDB test container and disconnects mongoose
async function stopMongoTestContainer() {
  console.log('Stopping MongoDB test container...');

  try {
    if (mongoose.connection.readyState !== 0) {
      console.log('Disconnecting mongoose...');
      await mongoose.disconnect();
      console.log('Mongoose disconnected');
    }
  } catch (error) {
    console.warn('Error disconnecting mongoose:', error);
  }

  try {
    if (mongo) {
      console.log('Stopping container:', mongo.getId());
      await mongo.stop();
      console.log('Container stopped successfully');
      mongo = undefined;
    }
  } catch (error) {
    console.warn('Error stopping container:', error);
  }
}

module.exports = {
  startMongoTestContainer,
  stopMongoTestContainer,
};
