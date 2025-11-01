const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  BaseMongoController,
} = require('../controllers/mondoDBControllers/BaseMongoController');

// Create a test model for BaseMongoController
const TestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format',
    },
  },
  age: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  tags: [String],
  metadata: {
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
  },
});

const TestModel = mongoose.model('TestModel', TestSchema);

// Test implementation of BaseMongoController
class TestController extends BaseMongoController {
  constructor() {
    super(TestModel, 'TestModel');
  }
}

describe('BaseMongoController', () => {
  let mongoServer, mongoUri, testController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    testController = new TestController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await TestModel.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with model and modelName', () => {
      expect(testController.model).toBe(TestModel);
      expect(testController.modelName).toBe('TestModel');
    });
  });

  describe('create', () => {
    it('should create a new document successfully', async () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = await testController.create(data);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(data);
      expect(result.message).toBe('TestModel created successfully');
      expect(result.data._id).toBeDefined();
    });

    it('should handle creation errors', async () => {
      const invalidData = {
        // Missing required fields
        age: 30,
      };

      const result = await testController.create(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-Error exceptions during create', async () => {
      const originalCreate = TestModel.create;
      TestModel.create = jest.fn().mockRejectedValue('String error');

      const result = await testController.create({
        name: 'Test',
        email: 'test@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');

      TestModel.create = originalCreate;
    });
  });

  describe('findById', () => {
    let testDoc;

    beforeEach(async () => {
      testDoc = await TestModel.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25,
      });
    });

    it('should find document by ID', async () => {
      const result = await testController.findById(testDoc._id.toString());

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 25,
      });
    });

    it('should find document with field selection', async () => {
      const result = await testController.findById(
        testDoc._id.toString(),
        'name email',
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Jane Doe');
      expect(result.data.email).toBe('jane@example.com');
      expect(result.data.age).toBeUndefined();
    });

    it('should return error for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await testController.findById(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle invalid ID format', async () => {
      const result = await testController.findById('invalid-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors in findById catch block', async () => {
      // Mock findOne to throw an error
      const originalFindOne = TestModel.findOne;
      TestModel.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const result = await testController.findById(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database query failed');

      // Restore original method
      TestModel.findOne = originalFindOne;
    });
  });

  describe('findOne', () => {
    beforeEach(async () => {
      await TestModel.create({
        name: 'Alice Smith',
        email: 'alice@example.com',
        age: 28,
      });
    });

    it('should find document by filter', async () => {
      const result = await testController.findOne({
        email: 'alice@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Alice Smith');
    });

    it('should find document with field selection', async () => {
      const result = await testController.findOne(
        { email: 'alice@example.com' },
        'name age',
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Alice Smith');
      expect(result.data.age).toBe(28);
      expect(result.data.email).toBeUndefined();
    });

    it('should return error when no document found', async () => {
      const result = await testController.findOne({
        email: 'nonexistent@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle database errors in findOne catch block', async () => {
      const originalFindOne = TestModel.findOne;
      TestModel.findOne = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Query failed')),
      }));

      const result = await testController.findOne({
        email: 'alice@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');

      TestModel.findOne = originalFindOne;
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 30 },
        { name: 'Alice', email: 'alice@example.com', age: 25 },
        { name: 'Bob', email: 'bob@example.com', age: 35 },
      ]);
    });

    it('should find all documents', async () => {
      const result = await testController.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should find documents with filter', async () => {
      const result = await testController.findAll({ age: { $gte: 30 } });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should find documents with search', async () => {
      const result = await testController.findAll(
        {},
        {
          search: 'alice',
          fields: ['name', 'email'],
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Alice');
    });

    it('should skip search when fields are not provided', async () => {
      const result = await testController.findAll(
        {},
        {
          search: 'alice',
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should skip search when fields array is empty', async () => {
      const result = await testController.findAll(
        {},
        {
          search: 'alice',
          fields: [],
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should find documents with pagination', async () => {
      const result = await testController.findAll(
        {},
        {
          page: 1,
          limit: 2,
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should ignore pagination when limit is missing', async () => {
      const result = await testController.findAll(
        {},
        {
          page: 1,
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should ignore pagination when page is missing', async () => {
      const result = await testController.findAll(
        {},
        {
          limit: 2,
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
    });

    it('should find documents with sorting', async () => {
      const result = await testController.findAll(
        {},
        {
          sort: { age: -1 },
        },
      );

      expect(result.success).toBe(true);
      expect(result.data[0].age).toBe(35);
      expect(result.data[1].age).toBe(30);
    });

    it('should find documents with field selection', async () => {
      const result = await testController.findAll(
        {},
        {
          select: 'name email',
        },
      );

      expect(result.success).toBe(true);
      expect(result.data[0].name).toBeDefined();
      expect(result.data[0].email).toBeDefined();
      expect(result.data[0].age).toBeUndefined();
    });

    it('should handle complex search with multiple fields', async () => {
      const result = await testController.findAll(
        {},
        {
          search: 'user',
          fields: ['name', 'email'],
        },
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should handle database errors in findAll catch block', async () => {
      const originalFind = TestModel.find;
      TestModel.find = jest.fn(() => ({
        or: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Query failed')),
      }));

      const result = await testController.findAll();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query failed');

      TestModel.find = originalFind;
    });
  });

  describe('updateById', () => {
    let testDoc;

    beforeEach(async () => {
      testDoc = await TestModel.create({
        name: 'Original Name',
        email: 'original@example.com',
        age: 20,
      });
    });

    it('should update document by ID', async () => {
      const update = { name: 'Updated Name', age: 25 };
      const result = await testController.updateById(
        testDoc._id.toString(),
        update,
      );

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Name');
      expect(result.data.age).toBe(25);
      expect(result.message).toBe('TestModel updated successfully');
    });

    it('should return error for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await testController.updateById(fakeId, {
        name: 'New Name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle validation errors', async () => {
      const invalidUpdate = { email: 'invalid-email' };
      const result = await testController.updateById(
        testDoc._id.toString(),
        invalidUpdate,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors in updateById catch block', async () => {
      const originalFindByIdAndUpdate = TestModel.findByIdAndUpdate;
      TestModel.findByIdAndUpdate = jest.fn(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Update failed')),
      }));

      const result = await testController.updateById(testDoc._id.toString(), {
        name: 'New Name',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');

      TestModel.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  describe('updateOne', () => {
    beforeEach(async () => {
      await TestModel.create({
        name: 'Test User',
        email: 'test@example.com',
        age: 20,
      });
    });

    it('should update document by filter', async () => {
      const filter = { email: 'test@example.com' };
      const update = { age: 25 };
      const result = await testController.updateOne(filter, update);

      expect(result.success).toBe(true);
      expect(result.data.age).toBe(25);
      expect(result.message).toBe('TestModel updated successfully');
    });

    it('should return error when no document found', async () => {
      const filter = { email: 'nonexistent@example.com' };
      const update = { age: 25 };
      const result = await testController.updateOne(filter, update);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle database errors in updateOne catch block', async () => {
      // Mock findOneAndUpdate to throw an error
      const originalFindOneAndUpdate = TestModel.findOneAndUpdate;
      TestModel.findOneAndUpdate = jest.fn().mockImplementation(() => {
        throw new Error('Update failed');
      });

      const result = await testController.updateOne(
        { email: 'test@example.com' },
        { age: 25 },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');

      // Restore original method
      TestModel.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('upsert', () => {
    it('should create new document when none exists', async () => {
      const filter = { email: 'new@example.com' };
      const update = { name: 'New User', age: 30 };
      const result = await testController.upsert(filter, update);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('New User');
      expect(result.data.email).toBe('new@example.com');
      expect(result.message).toBe('TestModel saved successfully');
    });

    it('should update existing document', async () => {
      const doc = await TestModel.create({
        name: 'Existing User',
        email: 'existing@example.com',
        age: 20,
      });

      const filter = { email: 'existing@example.com' };
      const update = { age: 25 };
      const result = await testController.upsert(filter, update);

      expect(result.success).toBe(true);
      expect(result.data.age).toBe(25);
      expect(result.data.name).toBe('Existing User');
    });

    it('should handle database errors in upsert catch block', async () => {
      const originalFindOneAndUpdate = TestModel.findOneAndUpdate;
      TestModel.findOneAndUpdate = jest.fn(() => ({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Upsert failed')),
      }));

      const result = await testController.upsert(
        { email: 'test@example.com' },
        { age: 25 },
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upsert failed');

      TestModel.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('deleteById', () => {
    let testDoc;

    beforeEach(async () => {
      testDoc = await TestModel.create({
        name: 'To Delete',
        email: 'delete@example.com',
        age: 20,
      });
    });

    it('should delete document by ID', async () => {
      const result = await testController.deleteById(testDoc._id.toString());

      expect(result.success).toBe(true);
      expect(result.message).toBe('TestModel deleted successfully');

      // Verify document is deleted
      const deletedDoc = await TestModel.findById(testDoc._id);
      expect(deletedDoc).toBeNull();
    });

    it('should return error for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await testController.deleteById(fakeId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle database errors in deleteById catch block', async () => {
      // Mock findByIdAndDelete to throw an error
      const originalFindByIdAndDelete = TestModel.findByIdAndDelete;
      TestModel.findByIdAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = await testController.deleteById(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');

      // Restore original method
      TestModel.findByIdAndDelete = originalFindByIdAndDelete;
    });
  });

  describe('deleteOne', () => {
    beforeEach(async () => {
      await TestModel.create({
        name: 'To Delete',
        email: 'delete@example.com',
        age: 20,
      });
    });

    it('should delete document by filter', async () => {
      const filter = { email: 'delete@example.com' };
      const result = await testController.deleteOne(filter);

      expect(result.success).toBe(true);
      expect(result.message).toBe('TestModel deleted successfully');

      // Verify document is deleted
      const deletedDoc = await TestModel.findOne(filter);
      expect(deletedDoc).toBeNull();
    });

    it('should return error when no document found', async () => {
      const filter = { email: 'nonexistent@example.com' };
      const result = await testController.deleteOne(filter);

      expect(result.success).toBe(false);
      expect(result.error).toBe('TestModel not found');
    });

    it('should handle database errors in deleteOne catch block', async () => {
      // Mock findOneAndDelete to throw an error
      const originalFindOneAndDelete = TestModel.findOneAndDelete;
      TestModel.findOneAndDelete = jest.fn().mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = await testController.deleteOne({
        email: 'delete@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');

      // Restore original method
      TestModel.findOneAndDelete = originalFindOneAndDelete;
    });
  });

  describe('deleteMany', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 20 },
        { name: 'User 3', email: 'user3@example.com', age: 30 },
      ]);
    });

    it('should delete multiple documents', async () => {
      const filter = { age: 20 };
      const result = await testController.deleteMany(filter);

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
      expect(result.message).toBe('2 TestModel(s) deleted successfully');

      // Verify documents are deleted
      const remainingDocs = await TestModel.find({ age: 20 });
      expect(remainingDocs).toHaveLength(0);
    });

    it('should return 0 when no documents match filter', async () => {
      const filter = { age: 99 };
      const result = await testController.deleteMany(filter);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
      expect(result.message).toBe('0 TestModel(s) deleted successfully');
    });

    it('should handle database errors in deleteMany catch block', async () => {
      // Mock deleteMany to throw an error
      const originalDeleteMany = TestModel.deleteMany;
      TestModel.deleteMany = jest.fn().mockImplementation(() => {
        throw new Error('Delete failed');
      });

      const result = await testController.deleteMany({ age: 20 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');

      // Restore original method
      TestModel.deleteMany = originalDeleteMany;
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 30 },
        { name: 'User 3', email: 'user3@example.com', age: 20 },
      ]);
    });

    it('should count all documents', async () => {
      const result = await testController.count();

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
    });

    it('should count documents with filter', async () => {
      const result = await testController.count({ age: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toBe(2);
    });

    it('should handle database errors in count catch block', async () => {
      // Mock countDocuments to throw an error
      const originalCountDocuments = TestModel.countDocuments;
      TestModel.countDocuments = jest.fn().mockImplementation(() => {
        throw new Error('Count failed');
      });

      const result = await testController.count();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count failed');

      // Restore original method
      TestModel.countDocuments = originalCountDocuments;
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await TestModel.create({
        name: 'Existing User',
        email: 'existing@example.com',
        age: 20,
      });
    });

    it('should return true when document exists', async () => {
      const result = await testController.exists({
        email: 'existing@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when document does not exist', async () => {
      const result = await testController.exists({
        email: 'nonexistent@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should handle database errors in exists catch block', async () => {
      const originalExists = TestModel.exists;
      TestModel.exists = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue(new Error('Exists check failed')),
      }));

      const result = await testController.exists({ email: 'test@example.com' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Exists check failed');

      TestModel.exists = originalExists;
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple documents', async () => {
      const documents = [
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 30 },
        { name: 'User 3', email: 'user3@example.com', age: 25 },
      ];

      const result = await testController.bulkCreate(documents);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.message).toBe('3 TestModel(s) created successfully');

      // Verify documents were created
      const count = await TestModel.countDocuments();
      expect(count).toBe(3);
    });

    it('should handle partial failures in bulk create', async () => {
      const documents = [
        { name: 'Valid User', email: 'valid@example.com', age: 20 },
        { email: 'invalid@example.com', age: 30 }, // Missing required name
        { name: 'Another Valid', email: 'another@example.com', age: 25 },
      ];

      const result = await testController.bulkCreate(documents);

      // With ordered: false, valid documents will still be created
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Only valid documents
      expect(result.message).toBe('2 TestModel(s) created successfully');
    });

    it('should handle database errors in bulkCreate catch block', async () => {
      // Mock insertMany to throw an error
      const originalInsertMany = TestModel.insertMany;
      TestModel.insertMany = jest.fn().mockImplementation(() => {
        throw new Error('Bulk create failed');
      });

      const documents = [
        { name: 'User 1', email: 'user1@example.com', age: 20 },
        { name: 'User 2', email: 'user2@example.com', age: 30 },
      ];

      const result = await testController.bulkCreate(documents);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk create failed');

      // Restore original method
      TestModel.insertMany = originalInsertMany;
    });
  });

  describe('aggregate', () => {
    beforeEach(async () => {
      await TestModel.create([
        { name: 'User 1', email: 'user1@example.com', age: 20, active: true },
        { name: 'User 2', email: 'user2@example.com', age: 30, active: false },
        { name: 'User 3', email: 'user3@example.com', age: 25, active: true },
      ]);
    });

    it('should execute aggregation pipeline', async () => {
      const pipeline = [
        { $match: { active: true } },
        { $group: { _id: null, count: { $sum: 1 }, avgAge: { $avg: '$age' } } },
      ];

      const result = await testController.aggregate(pipeline);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].count).toBe(2);
      expect(result.data[0].avgAge).toBe(22.5);
    });

    it('should handle aggregation errors', async () => {
      const invalidPipeline = [{ $invalidStage: { field: 'value' } }];

      const result = await testController.aggregate(invalidPipeline);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-Error exceptions during aggregate', async () => {
      const originalAggregate = TestModel.aggregate;
      TestModel.aggregate = jest.fn(() => ({
        exec: jest.fn().mockRejectedValue('String error'),
      }));

      const result = await testController.aggregate([{ $match: {} }]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Aggregation failed');

      TestModel.aggregate = originalAggregate;
    });
  });

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message');

      expect(() => {
        testController.handleError(error, 'test operation');
      }).toThrow('Test error message');
    });

    it('should handle non-Error objects', () => {
      const error = 'String error message';

      expect(() => {
        testController.handleError(error, 'test operation');
      }).toThrow('String error message');
    });

    it('should handle undefined/null errors', () => {
      expect(() => {
        testController.handleError(undefined, 'test operation');
      }).toThrow('undefined');
    });
  });
});
