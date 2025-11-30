import { Document, Model, FilterQuery, UpdateQuery } from 'mongoose';
import * as Sentry from '@sentry/node';
import { ObjectId } from 'bson';

const QUERY_FAILED = 'Query failed';
const DELETE_FAILED = 'Delete failed';

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
   * Generic error handler with Sentry integration
   */
  protected handleError(error: unknown, operation: string): never {
    Sentry.captureException(error, {
      tags: {
        model: this.modelName,
        operation,
      },
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${this.modelName}] Error in ${operation}:`, errorMessage);
    throw error;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<ControllerResponse<T>> {
    try {
      const document = await this.model.create(data);

      return {
        success: true,
        data: document.toObject() as T,
        message: `${this.modelName} created successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Creation failed',
      };
    }
  }

  /**
   * Find document by ID with optional field selection
   */
  async findById(
    id: string,
    select?: string | string[],
  ): Promise<ControllerResponse<T>> {
    try {
      let query = this.model.findById(id);

      if (select) {
        query = query.select(select);
      }

      const document = await query.lean<T>().exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return { success: true, data: document };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : QUERY_FAILED,
      };
    }
  }

  /**
   * Find document by custom filter
   */
  async findOne(
    filter: FilterQuery<T>,
    select?: string | string[],
  ): Promise<ControllerResponse<T>> {
    try {
      let query = this.model.findOne(filter);

      if (select) {
        query = query.select(select);
      }

      const document = await query.lean<T>().exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return { success: true, data: document };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : QUERY_FAILED,
      };
    }
  }

  /**
   * Find all documents with optional filtering, search, and pagination
   * Optimized with lean() and proper indexing
   */
  async findAll(
    filter: FilterQuery<T> = {},
    options: QueryOptions = {},
  ): Promise<ControllerResponse<T[]>> {
    try {
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
        query = query.select(options.select);
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

      return { success: true, data: documents };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : QUERY_FAILED,
      };
    }
  }

  /**
   * Update document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
  ): Promise<ControllerResponse<T>> {
    try {
      const document = await this.model
        .findByIdAndUpdate(id, update, {
          new: true,
          runValidators: true,
        })
        .lean<T>()
        .exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document,
        message: `${this.modelName} updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Update document by custom filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<ControllerResponse<T>> {
    try {
      const document = await this.model
        .findOneAndUpdate(filter, update, {
          new: true,
          runValidators: true,
          upsert: false,
        })
        .lean<T>()
        .exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document,
        message: `${this.modelName} updated successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  /**
   * Update or create document (upsert)
   */
  async upsert(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
  ): Promise<ControllerResponse<T>> {
    try {
      const document = await this.model
        .findOneAndUpdate(filter, update, {
          new: true,
          upsert: true,
          runValidators: true,
        })
        .lean<T>()
        .exec();

      return {
        success: true,
        data: document!,
        message: `${this.modelName} saved successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upsert failed',
      };
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<ControllerResponse<string>> {
    try {
      const document = await this.model.findByIdAndDelete(id).exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        message: `${this.modelName} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : DELETE_FAILED,
      };
    }
  }

  /**
   * Delete document by custom filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<ControllerResponse<string>> {
    try {
      const document = await this.model.findOneAndDelete(filter).exec();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        message: `${this.modelName} deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : DELETE_FAILED,
      };
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(
    filter: FilterQuery<T>,
  ): Promise<ControllerResponse<number>> {
    try {
      const result = await this.model.deleteMany(filter).exec();

      return {
        success: true,
        data: result.deletedCount,
        message: `${result.deletedCount} ${this.modelName}(s) deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : DELETE_FAILED,
      };
    }
  }

  /**
   * Count documents with optional filter
   * Uses countDocuments (not deprecated count method)
   */
  async count(
    filter: FilterQuery<T> = {},
  ): Promise<ControllerResponse<number>> {
    try {
      const count = await this.model.countDocuments(filter).exec();

      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Count failed',
      };
    }
  }

  /**
   * Check if document exists (optimized - only checks _id field)
   */
  async exists(filter: FilterQuery<T>): Promise<ControllerResponse<boolean>> {
    try {
      const exists = await this.model.exists(filter).exec();

      return { success: true, data: !!exists };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Exists check failed',
      };
    }
  }

  /**
   * Bulk write documents
   */
  async bulkWrite(documents: Partial<T>[]): Promise<ControllerResponse<T[]>> {
    try {
      const operations = documents.map((doc) => ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        }));

        await this.model.bulkWrite(operations, { ordered: false });

        return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk write failed',
      };
    }
  }

  /**
   * Aggregate query helper
   */
  async aggregate<R = unknown>(
    pipeline: Record<string, unknown>[],
  ): Promise<ControllerResponse<R[]>> {
    try {
      // Type assertion needed for flexibility with aggregation pipelines
      const results = await this.model.aggregate<R>(pipeline as any[]).exec();

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Aggregation failed',
      };
    }
  }
}
