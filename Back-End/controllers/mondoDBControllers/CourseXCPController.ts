/**
 * Handles course-coursepool mappings with improved performance.
 * Manages the relationship between courses and course pools within degrees.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import * as Sentry from '@sentry/node';

export interface CourseXCPData {
  coursecode: string;
  coursepool_id: string;
}

export class CourseXCPController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'CourseXCP');
  }

  /**
   * Add a course to a course pool
   * Optimized with atomic array update
   */
  async createCourseXCP(
    coursecode: string,
    coursepool_id: string,
  ): Promise<boolean> {
    try {
      const result = await Degree.updateOne(
        { 'coursePools.id': coursepool_id },
        { $addToSet: { 'coursePools.$.courses': coursecode } },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CourseXCPController] Error creating course-pool mapping:',
        error,
      );
      return false;
    }
  }

  /**
   * Get all courses for a given course pool
   * Optimized with aggregation
   */
  async getAllCourseXCP(coursepool_id: string): Promise<string[]> {
    try {
      const result = await this.aggregate([
        { $unwind: '$coursePools' },
        { $match: { 'coursePools.id': coursepool_id } },
        {
          $project: {
            _id: 0,
            courses: '$coursePools.courses',
          },
        },
        { $limit: 1 },
      ]);

      // @ts-ignore
      return result.data?.[0]?.courses || [];
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CourseXCPController] Error fetching courses for pool:',
        error,
      );
      return [];
    }
  }

  /**
   * Remove a course from a course pool
   * Optimized with atomic operation
   */
  async removeCourseXCP(
    coursecode: string,
    coursepool_id: string,
  ): Promise<boolean> {
    try {
      const result = await Degree.updateOne(
        { 'coursePools.id': coursepool_id },
        { $pull: { 'coursePools.$.courses': coursecode } },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CourseXCPController] Error removing course from pool:',
        error,
      );
      return false;
    }
  }

  /**
   * Check if a course exists in a pool
   */
  async courseExistsInPool(
    coursecode: string,
    coursepool_id: string,
  ): Promise<boolean> {
    try {
      const exists = await Degree.exists({
        'coursePools.id': coursepool_id,
        'coursePools.courses': coursecode,
      }).exec();

      return !!exists;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[CourseXCPController] Error checking course in pool:',
        error,
      );
      return false;
    }
  }

  /**
   * Bulk add courses to a pool
   */
  async bulkCreateCourseXCP(
    coursecodes: string[],
    coursepool_id: string,
  ): Promise<number> {
    try {
      const result = await Degree.updateOne(
        { 'coursePools.id': coursepool_id },
        { $addToSet: { 'coursePools.$.courses': { $each: coursecodes } } },
      ).exec();

      return result.modifiedCount || 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error('[CourseXCPController] Error bulk adding courses:', error);
      return 0;
    }
  }
}

export const courseXCPController = new CourseXCPController();
