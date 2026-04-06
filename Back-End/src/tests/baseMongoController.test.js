// __tests__/baseMongoController.test.ts
import { BaseMongoController, BaseDocument } from '../controllers/baseMongoController';
import { NotFoundError } from '@utils/errors';
import { ObjectId } from 'bson';

const mockData = {
  _id: new ObjectId(),
  name: 'Test Name',
  email: 'test@example.com',
  age: 25,
};

function createMockModel() {
  return {
    create: jest.fn().mockResolvedValue({ ...mockData, toObject: () => mockData }),
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([mockData]),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockData),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockData) }),
    findOneAndDelete: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockData) }),
    deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }),
    countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(42) }),
    exists: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
    bulkWrite: jest.fn().mockResolvedValue(true),
    aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([mockData]) }),
  };
}

describe('BaseMongoController', () => {
  let controller;
  let mockModel;

  beforeEach(() => {
    mockModel = createMockModel();
    controller = new BaseMongoController(mockModel, 'TestModel');
  });

  describe('sanitizeUpdate', () => {
    it('removes unsafe keys and Mongo operators', () => {
      const input = {
        name: 'New Name',
        $set: { foo: 'bar' },
        nested: { constructor: 'bad' },
      };
      const sanitized = controller['sanitizeUpdate'](input);
      expect(sanitized).toEqual({ name: 'New Name', nested: {} });
    });
  });

  describe('create', () => {
    it('creates document', async () => {
      const result = await controller.create({ name: 'Test' });
      expect(result).toEqual(mockData);
      expect(mockModel.create).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns document', async () => {
      const result = await controller.findById(mockData._id.toHexString());
      expect(result).toEqual(mockData);
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findById().lean().exec.mockResolvedValueOnce(null);
      await expect(controller.findById('123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findOne', () => {
    it('returns document', async () => {
      const result = await controller.findOne({ email: 'test@example.com' });
      expect(result).toEqual(mockData);
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findOne().lean().exec.mockResolvedValueOnce(null);
      await expect(controller.findOne({ email: 'missing@example.com' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('returns documents', async () => {
      const result = await controller.findAll({}, { page: 1, limit: 10, select: ['name'], sort: { age: 1 }, search: 'test', fields: ['name'] });
      expect(result).toEqual([mockData]);
    });
  });

  describe('updateById', () => {
    it('updates document', async () => {
      const result = await controller.updateById(mockData._id.toHexString(), { name: 'Updated' });
      expect(result).toEqual(mockData);
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findByIdAndUpdate().lean().exec.mockResolvedValueOnce(null);
      await expect(controller.updateById('123', { name: 'Fail' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateOne', () => {
    it('updates document', async () => {
      const result = await controller.updateOne({ email: 'test@example.com' }, { name: 'Updated' });
      expect(result).toEqual(mockData);
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findOneAndUpdate().lean().exec.mockResolvedValueOnce(null);
      await expect(controller.updateOne({ email: 'missing' }, { name: 'Fail' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('upsert', () => {
    it('creates or updates document', async () => {
      const result = await controller.upsert({ email: 'test@example.com' }, { name: 'Upserted' });
      expect(result).toEqual(mockData);
    });
  });

  describe('deleteById', () => {
    it('deletes document', async () => {
      const result = await controller.deleteById(mockData._id.toHexString());
      expect(result).toContain('successfully deleted');
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findByIdAndDelete().exec.mockResolvedValueOnce(null);
      await expect(controller.deleteById('123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteOne', () => {
    it('deletes document', async () => {
      await expect(controller.deleteOne({ email: 'test@example.com' })).resolves.toBeUndefined();
    });

    it('throws NotFoundError if not found', async () => {
      mockModel.findOneAndDelete().exec.mockResolvedValueOnce(null);
      await expect(controller.deleteOne({ email: 'missing' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteMany', () => {
    it('deletes multiple documents', async () => {
      const result = await controller.deleteMany({ active: true });
      expect(result).toBe(1);
    });

    it('throws NotFoundError if none deleted', async () => {
      mockModel.deleteMany().exec.mockResolvedValueOnce({ deletedCount: 0 });
      await expect(controller.deleteMany({ active: false })).rejects.toThrow(NotFoundError);
    });
  });

  describe('count', () => {
    it('returns document count', async () => {
      const result = await controller.count();
      expect(result).toBe(42);
    });
  });

  describe('exists', () => {
    it('returns true if document exists', async () => {
      const result = await controller.exists({ email: 'test@example.com' });
      expect(result).toBe(true);
    });
  });

  describe('bulkWrite', () => {
    it('performs bulk write', async () => {
      await expect(controller.bulkWrite([{ _id: mockData._id, name: 'Bulk' }])).resolves.toBeUndefined();
      expect(mockModel.bulkWrite).toHaveBeenCalled();
    });
  });

  describe('aggregate', () => {
    it('performs aggregation', async () => {
      const result = await controller.aggregate([{ $match: {} }]);
      expect(result).toEqual([mockData]);
    });
  });
});