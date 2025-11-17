const { MongoDBContainer } = require('@testcontainers/mongodb');
const mongoose = require('mongoose');

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
    console.log('Container ID:', mongo.getId());
    console.log('Container name:', mongo.getName());

    const host = mongo.getHost();
    const port = mongo.getMappedPort(27017);

    console.log('Host:', host);
    console.log('Mapped port:', port);

    const uri = `mongodb://${host}:${port}/${dbName}?directConnection=true`;
    console.log('Connection URI:', uri);

    process.env.MONGO_URI = uri;

    console.log('Attempting to connect to MongoDB...');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 1,
      directConnection: true
    });

    console.log('MongoDB connected successfully');
    console.log('Connected to database:', mongoose.connection.db.databaseName);

    console.log('Initializing database schema...');
    await initializeDatabaseSchema();
    console.log('Database schema initialized successfully');

    return mongo;
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

async function initializeDatabaseSchema() {
  try {
    // Import models to register them with mongoose
    const DegreeModule = require('../../../models/degree');
    const Degree = DegreeModule.Degree || DegreeModule.default || DegreeModule;

    const CoursePoolModule = require('../../../models/coursepool');
    const CoursePool = CoursePoolModule.CoursePool || CoursePoolModule.default || CoursePoolModule;

    const CourseModule = require('../../../models/course');
    const Course = CourseModule.Course || CourseModule.default || CourseModule;

    const UserModule = require('../../../models/user');
    const User = UserModule.User || UserModule.default || UserModule;

    const FeedbackModule = require('../../../models/feedback');
    const Feedback = FeedbackModule.Feedback || FeedbackModule.default || FeedbackModule;

    const TimelineModule = require('../../../models/timeline');
    const Timeline = TimelineModule.Timeline || TimelineModule.default || TimelineModule;

    // Create collections by ensuring indexes (this creates empty collections)
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
  getMongoContainer: () => mongo,
};
