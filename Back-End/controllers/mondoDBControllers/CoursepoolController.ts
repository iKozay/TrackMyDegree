

import { BaseMongoController } from './BaseMongoController';
import { CoursePool } from '../../models';
import * as Sentry from '@sentry/node';

export interface CoursePoolData {
  _id: string;
  name: string;
  creditsRequired: number;
  courses?: string[];
}

export class CoursePoolController extends BaseMongoController<any> {
  constructor() {
    super(CoursePool, 'CoursePool');
  }

  // ==========================
  // COURSE POOL OPERATIONS
  // ==========================

  /**
   * Create a new course pool
   */
  async createCoursePool(coursePoolData: CoursePoolData): Promise<CoursePoolData> {
    try {
      const result = await this.create(coursePoolData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create course pool');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        creditsRequired: result.data.creditsRequired,
        courses: result.data.courses || []
      };
    } catch (error) {
      this.handleError(error, 'createCoursePool');
    }
  }

  /**
   * Update an existing course pool
   */

  async updateCoursePool(
    pool_id: string,
    updateData: Partial<CoursePoolData>
  ): Promise<CoursePoolData | null> {
    try {
      const coursePool = await this.findById(pool_id);

      if (!coursePool) {
        throw new Error('Course pool not found');
      }

      const result = await this.updateById(pool_id, updateData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update course pool');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        creditsRequired: result.data.creditsRequired,
        courses: result.data.courses || []
      };
    } catch (error) {
      this.handleError(error, 'updateCoursePool');
      return null;
    }
  }

  /**
   * Get all course pools
   */
  async getAllCoursePools(): Promise<CoursePoolData[]> {
    try {
      const result = await this.findAll();

      if (!result.success) {
        throw new Error('Failed to fetch course pools');
      }

      return (result.data || []).map((cp: any) => ({
        _id: cp._id,
        name: cp.name,
        creditsRequired: cp.creditsRequired,
        courses: cp.courses || [],
      }));
    } catch (error) {
      Sentry.captureException(error);
      console.error('[CoursePoolController] Error fetching all course pools:', error);
      return [];
    }
  }

  /**
   * Get a specific course pool by ID
   */
  async getCoursePool(pool_id: string): Promise<CoursePoolData | undefined> {
    try {
        const result = await this.findById(pool_id);

        if (!result.success) {
            throw new Error(result.error || 'Course pool not found');
        }

        return {
            _id: result.data._id,
            name: result.data.name,
            creditsRequired: result.data.creditsRequired,
            courses: result.data.courses || []
        };
    } catch (error) {
      Sentry.captureException(error);
      console.error('[CoursePoolController] Error fetching course pool:', error);
      return undefined;
    }
  }

  /**
   * Delete a course pool by ID
   */
    async deleteCoursePool(pool_id: string): Promise<boolean> {
    try {
      const result = await this.deleteById(pool_id);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete course pool');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'deleteCoursePool');
      return false;
    }
  }
}

export const coursepoolController = new CoursePoolController();