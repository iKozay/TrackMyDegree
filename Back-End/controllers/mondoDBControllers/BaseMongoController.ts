/**
 * Generic Base MongoDB Controller
 *
 * Provides common CRUD operations and utilities for all MongoDB controllers.
 */

import mongoose, { Document, Model } from 'mongoose';
import * as Sentry from '@sentry/node';

export interface BaseDocument extends Document {
  _id: string;
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
   * Generic error handler
   */
  protected handleError(error: any, operation: string): never {
    Sentry.captureException(error);
    console.error(`Error in ${this.modelName} ${operation}:`, error);
    throw error;
  }

  /**
   * Check MongoDB connection
   */
  protected checkConnection(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<ControllerResponse<T>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = new this.model(data);
      const saved = await document.save();

      return {
        success: true,
        data: saved,
        message: `${this.modelName} created successfully`,
      };
    } catch (error) {
      this.handleError(error, 'create');
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string): Promise<ControllerResponse<T>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model.findById(id).lean();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document as T,
      };
    } catch (error) {
      this.handleError(error, 'findById');
    }
  }

  /**
   * Find document by custom filter
   */
  async findOne(filter: any): Promise<ControllerResponse<T>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model.findOne(filter).lean();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document as T,
      };
    } catch (error) {
      this.handleError(error, 'findOne');
    }
  }

  /**
   * Find all documents with optional filtering and pagination
   */
  async findAll(
    filter: any = {},
    options: PaginationOptions & SearchOptions = {},
  ): Promise<ControllerResponse<T[]>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      let query = this.model.find(filter);

      // Apply search if provided
      if (options.search && options.fields) {
        const searchRegex = new RegExp(options.search, 'i');
        const searchConditions = options.fields.map((field) => ({
          [field]: searchRegex,
        }));
        query = query.or(searchConditions as any);
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

      const documents = await query.lean();

      return {
        success: true,
        data: documents as T[],
      };
    } catch (error) {
      this.handleError(error, 'findAll');
    }
  }

  /**
   * Update document by ID
   */
  async updateById(id: string, update: any): Promise<ControllerResponse<T>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model
        .findByIdAndUpdate(id, update, { new: true, runValidators: true })
        .lean();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document as T,
        message: `${this.modelName} updated successfully`,
      };
    } catch (error) {
      this.handleError(error, 'updateById');
    }
  }

  /**
   * Update document by custom filter
   */
  async updateOne(filter: any, update: any): Promise<ControllerResponse<T>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model
        .findOneAndUpdate(filter, update, { new: true, runValidators: true })
        .lean();

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        data: document as T,
        message: `${this.modelName} updated successfully`,
      };
    } catch (error) {
      this.handleError(error, 'updateOne');
    }
  }

  /**
   * Delete document by ID
   */
  async deleteById(id: string): Promise<ControllerResponse<string>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model.findByIdAndDelete(id);

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        message: `${this.modelName} deleted successfully`,
      };
    } catch (error) {
      this.handleError(error, 'deleteById');
    }
  }

  /**
   * Delete document by custom filter
   */
  async deleteOne(filter: any): Promise<ControllerResponse<string>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const document = await this.model.findOneAndDelete(filter);

      if (!document) {
        return { success: false, error: `${this.modelName} not found` };
      }

      return {
        success: true,
        message: `${this.modelName} deleted successfully`,
      };
    } catch (error) {
      this.handleError(error, 'deleteOne');
    }
  }

  /**
   * Count documents with optional filter
   */
  async count(filter: any = {}): Promise<ControllerResponse<number>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const count = await this.model.countDocuments(filter);

      return {
        success: true,
        data: count,
      };
    } catch (error) {
      this.handleError(error, 'count');
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: any): Promise<ControllerResponse<boolean>> {
    try {
      if (!this.checkConnection()) {
        return { success: false, error: 'Database connection not available' };
      }

      const exists = await this.model.exists(filter);

      return {
        success: true,
        data: !!exists,
      };
    } catch (error) {
      this.handleError(error, 'exists');
    }
  }
}