/**
 * Optimized Course Pool Controller
 *
 * Handles course pool operations with improved error handling.
 * Note: Course pools are embedded in Degree documents in MongoDB.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import * as Sentry from '@sentry/node';

export interface CoursePoolData {
  id: string;
  name: string;
  creditsRequired?: number;
  courses?: string[];
}

export class CoursePoolController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'CoursePool');
  }

  /**
   * Get all course pools from all degrees (aggregated and deduplicated)
   * Optimized with aggregation pipeline
   */
  async getAllCoursePools(): Promise<CoursePoolData[]> {
    try {
      const result = await this.aggregate<CoursePoolData>([
        { $unwind: '$coursePools' },
        {
          $group: {
            _id: '$coursePools.id',
            name: { $first: '$coursePools.name' },
            creditsRequired: { $first: '$coursePools.creditsRequired' },
          },
        },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            creditsRequired: 1,
          },
        },
        { $sort: { name: 1 } },
      ]);

      return result.data || [];
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CoursePoolController] Error fetching all course pools:',
        error,
      );
      return [];
    }
  }

  /**
   * Get a specific course pool by ID
   * Optimized to find in any degree
   */
  async getCoursePool(pool_id: string): Promise<CoursePoolData | undefined> {
    try {
      const result = await this.aggregate<CoursePoolData>([
        { $unwind: '$coursePools' },
        { $match: { 'coursePools.id': pool_id } },
        {
          $project: {
            _id: 0,
            id: '$coursePools.id',
            name: '$coursePools.name',
            creditsRequired: '$coursePools.creditsRequired',
            courses: '$coursePools.courses',
          },
        },
        { $limit: 1 },
      ]);

      return result.data?.[0];
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CoursePoolController] Error fetching course pool:',
        error,
      );
      return undefined;
    }
  }

  /**
   * Update a course pool across all degrees that contain it
   * Optimized with bulk update
   */
  async updateCoursePool(pool_id: string, name: string): Promise<boolean> {
    try {
      const result = await Degree.updateMany(
        { 'coursePools.id': pool_id },
        { $set: { 'coursePools.$[elem].name': name } },
        { arrayFilters: [{ 'elem.id': pool_id }] },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CoursePoolController] Error updating course pool:',
        error,
      );
      return false;
    }
  }

  /**
   * Remove a course pool from all degrees
   * Optimized with single bulk operation
   */
  async removeCoursePool(pool_id: string): Promise<boolean> {
    try {
      const result = await Degree.updateMany(
        { 'coursePools.id': pool_id },
        { $pull: { coursePools: { id: pool_id } } },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CoursePoolController] Error removing course pool:',
        error,
      );
      return false;
    }
  }

  /**
   * Get all course pools for a specific degree
   */
  async getCoursePoolsByDegree(degree_id: string): Promise<CoursePoolData[]> {
    try {
      const degree = await Degree.findById(degree_id)
        .select('coursePools')
        .lean()
        .exec();

      if (!degree || !degree.coursePools) {
        return [];
      }

      return degree.coursePools.map((cp: any) => ({
        id: cp.id,
        name: cp.name,
        creditsRequired: cp.creditsRequired,
        courses: cp.courses,
      }));
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CoursePoolController] Error fetching degree course pools:',
        error,
      );
      return [];
    }
  }
}

export const coursePoolController = new CoursePoolController();
