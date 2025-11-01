/**
 * Provides degree-specific operations with improved error handling and query optimization.
 * Includes course pool and degree-course pool mapping functionality.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import * as Sentry from '@sentry/node';

export interface DegreeData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
}

export interface DegreeXCPData {
  degree_id: string;
  coursepool_id: string;
  credits: number;
}

export interface CoursePoolInfo {
  _id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
}

export class DegreeController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'Degree');
  }

  // ==========================
  // DEGREE OPERATIONS
  // ==========================

  /**
   * Create a new degree
   */
  async createDegree(degreeData: DegreeData): Promise<DegreeData> {
    try {
      // Check if degree with the same id already exists
      const existingDegree = await this.findById(degreeData._id);

      if (existingDegree) {
        throw new Error('Degree with this id already exists.');
      }

      const result = await this.create(degreeData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create degree');
      }

      // Note: isAddon (from model) is being omitted for now. Might be removed altogether later.
      return {
        _id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
        coursePools: result.data.coursePools || []
      };
    } catch (error) {
      this.handleError(error, 'createDegree');
    }
  }

  /**
   * Update an existing degree
   */
  async updateDegree(_id: string, updateData: Partial<DegreeData>): Promise<DegreeData> {
    try {
      const result = await this.updateById(_id, updateData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update degree');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
        coursePools: result.data.coursePools || []
      };
    } catch (error) {
      this.handleError(error, 'updateDegree');
    }
  }

  /**
   * Get degree by ID
   */
  async readDegree(_id: string): Promise<DegreeData> {
    try {
      const result = await this.findById(_id, 'name totalCredits');

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
        coursePools: result.data.coursePools || [],
      };
    } catch (error) {
      this.handleError(error, 'readDegree');
    }
  }

  /**
   * Get all degrees (excluding ECP)
   */
  async readAllDegrees(): Promise<DegreeData[]> {
    try {
      const result = await this.findAll(
        { _id: { $ne: 'ECP' } },
        { select: 'name totalCredits', sort: { name: 1 } },
      );

      if (!result.success) {
        throw new Error('Failed to fetch degrees');
      }

      return (result.data || []).map((degree) => ({
        _id: degree._id,
        name: degree.name,
        totalCredits: degree.totalCredits,
        coursePools: degree.coursePools
      }));
    } catch (error) {
      this.handleError(error, 'readAllDegrees');
    }
  }

  /**
   * Get credits for degree (optimized - only fetches totalCredits field)
   */
  async getCreditsForDegree(_id: string): Promise<number> {
    try {
      const result = await this.findById(_id, 'totalCredits');

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return result.data.totalCredits;
    } catch (error) {
      this.handleError(error, 'getCreditsForDegree');
    }
  }

  /**
   * Get course pools for a degree (optimized - only fetches coursePools field)
   */
  async getCoursePoolsForDegree(_id: string): Promise<string[]> {
    try {
      // Using populate to get full course pool details
      const result = await this.findById(_id, 'coursePools');

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return result.data.coursePools || [];
    } catch (error) {
      this.handleError(error, 'getCoursePoolsForDegree');
    }
  }

  /**
   * Delete a degree by ID
   */
  async deleteDegree(_id: string): Promise<boolean> {
    try {
      const result = await this.deleteById(_id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete degree');
      }
      return true;
    } catch (error) {
      this.handleError(error, 'deleteDegree');
    }
  }
}

export const degreeController = new DegreeController();
