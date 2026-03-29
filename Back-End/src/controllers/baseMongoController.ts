import { Document, Model, FilterQuery, UpdateQuery } from 'mongoose';
import * as Sentry from '@sentry/node';
import { ObjectId } from 'bson';
import { QUERY_FAILED, DELETE_FAILED, NotFoundError } from '@utils/errors';

export interface BaseDocument extends Document {
  _id: ObjectId;
}

export interface ControllerResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

export interface SearchOptions {
  search?: string;
  fields?: string[];
}

export interface QueryOptions extends PaginationOptions, SearchOptions {
  /** Fields to select/project from the query */
  select?: string | string[];
}

/**
 * Generic base controller class for MongoDB operations
 */
export abstract class BaseMongoController<T extends BaseDocument> {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Sanitize an update object by removing MongoDB operator keys and
   * dangerous prototype-pollution keys at any depth.
   * This helps ensure that user-controlled data is interpreted purely
   * as literal field values and not as a query/update object.
   */
  protected sanitizeUpdate(update: UpdateQuery<T>): UpdateQuery<T> {
    const unsafeKeys = new Set(['__proto__', 'constructor', 'prototype']);

    const isPlainObject = (value: unknown): value is Record<string, unknown> => {
      if (value === null || typeof value !== 'object') {
        return false;
      }
      const proto = Object.getPrototypeOf(value);
      return proto === Object.prototype || proto === null;
    };

    const sanitize = (value: unknown): unknown => {
      if (value === null || value === undefined) {
        return value;
      }

      // Primitives are safe
      if (typeof value !== 'object') {
        return value;
      }

      // Arrays: sanitize each element
      if (Array.isArray(value)) {
        return value.map((item) => sanitize(item));
      }

      // Only process plain objects; anything else is treated as-is
      if (!isPlainObject(value)) {
        return value;
      }

      const result: Record<string, unknown> = {};

      for (const [key, v] of Object.entries(value)) {
        // Drop MongoDB operator keys (start with '$')
        if (key.startsWith('$')) {
          continue;
        }
        // Drop prototype-pollution related keys
        if (unsafeKeys.has(key)) {
          continue;
        }

        result[key] = sanitize(v);
      }

      return result;
    };

    return sanitize(update) as UpdateQuery<T>;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
      const document = await this.model.create(data);
      return document.toObject() as T;
  }

  /**
   * Find document by ID with optional field selection
   */
  async findById(
    id: string,
    select?: string | string[],
  ): Promise<T> {
      let query = this.model.findById(id);

      if (select) {
        query = query.select(select) as typeof query;
      }

      const document = await query.lean<T>().exec();

      if (!document) {
         throw new NotFoundError(`${this.modelName} not found`) ;
      }

      return document ;
  }

  /**
   * Find document by custom filter
   */
  async findOne(
    filter: FilterQuery<T>,
    select?: string | string[],
  ): Promise<T> {
      let query = this.model.findOne(filter);

      if (select) {
        query = query.select(select) as typeof query;
      }

      const document = await query.lean<T>().exec();

      if (!document) {
         throw new NotFoundError(`${this.modelName} not found`) ;
      }

      return document ;
  }

  /**
   * Find all documents with optional filtering, search, and pagination
   * Optimized with lean() and proper indexing
   */
  async findAll(
    filter: FilterQuery<T> = {},
    options: QueryOptions = {},
  ): Promise<T[]> {
      let query = this.model.find(filter);

      // Apply search if provided
      if (options.search && options.fields && options.fields.length > 0) {
        const searchRegex = new RegExp(options.search, 'i');
        const searchConditions = options.fields.map((field) => ({
          [field]: searchRegex,
        }));
        query = query.or(searchConditions as FilterQuery<T>[]);
      }

      // Apply field selection
      if (options.select) {
        query = query.select(options.select) as typeof query;
      }

      // Apply sorting
      if (options.sort) {
        query = query.sort(options.sort);
      }

      // Apply pagination
      if (options.page && options.limit) {
        const skip = (options.page - 1) * options.limit;
        query = query.skip(skip).limit(options.limit);
      }

      const documents = await query.lean<T[]>().exec();

      return  documents ;
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
  ): Promise<T> {
      const sanitizedUpdate = this.sanitizeUpdate(update);
      const document = await this.model
        .findByIdAndUpdate(id, sanitizedUpdate, {
          new: true,
          runValidators: true,
        })
        .lean<T>()
        .exec();

      if (!document) {
         throw new NotFoundError(`${this.modelName} not found`) ;
      }

      return document;
  }

  /**
   * Update document by custom filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<T> {
      const sanitizedUpdate = this.sanitizeUpdate(update);
      const document = await this.model
        .findOneAndUpdate(filter, sanitizedUpdate, {
          new: true,
          runValidators: true,
          upsert: false,
        })
        .lean<T>()
        .exec();

      if (!document) {
         throw new NotFoundError(`${this.modelName} not found`) ;
      }

      return document;
  }

  /**
   * Update or create document (upsert)
   */
  async upsert(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<T> {
      const sanitizedUpdate = this.sanitizeUpdate(update);
      const document = await this.model
        .findOneAndUpdate(filter, sanitizedUpdate, {
          new: true,
          upsert: true,
          runValidators: true,
        })
        .lean<T>()
        .exec();

      return document;
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<string> {
      const document = await this.model.findByIdAndDelete(id).exec();

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`);
      }
      return `$${this.modelName} with id ${id} has been successfully deleted.`;
  }

  /**
   * Delete document by custom filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<void> {
      const document = await this.model.findOneAndDelete(filter).exec();

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`);
      }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: FilterQuery<T>,
  ): Promise<number> {
      const result = await this.model.deleteMany(filter).exec();
      if (result.deletedCount === 0) {
        throw new NotFoundError(`${this.modelName} not found`);
      }
      return  result.deletedCount;
  }

  /**
   * Count documents with optional filter
   * Uses countDocuments (not deprecated count method)
   */
  async count(
    filter: FilterQuery<T> = {},
  ): Promise<number> {
      return await this.model.countDocuments(filter).exec();
  }

  /**
   * Check if document exists (optimized - only checks _id field)
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
      const exists = await this.model.exists(filter).exec();
      return !!exists;
  }

  /**
   * Bulk write documents
   */
  async bulkWrite(documents: Partial<T>[]): Promise<void> {
      const operations = documents
        .filter((doc) => doc._id !== undefined)
        .map((doc) => ({
          updateOne: {
            filter: { _id: doc._id! },
            update: { $set: doc },
            upsert: true,
          },
        }));
      await this.model.bulkWrite(operations as any, { ordered: false });
  }

  /**
   * Aggregate query helper
   */
  async aggregate<R = unknown>(
    pipeline: Record<string, unknown>[],
  ): Promise<R[]> {
      // Type assertion needed for flexibility with aggregation pipelines
      const results = await this.model.aggregate<R>(pipeline as any[]).exec();

      return  results ;
  }
}
