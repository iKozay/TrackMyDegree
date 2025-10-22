/**
 * Optimized DegreeXCP Controller
 *
 * Handles degree-coursepool mappings with improved performance.
 * Manages course pools within degree documents.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import * as Sentry from '@sentry/node';

export interface DegreeXCPData {
  degree_id: string;
  coursepool_id: string;
  credits: number;
}

export interface CoursePoolInfo {
  id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
}

export class DegreeXCPController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'DegreeXCP');
  }

  /**
   * Add a course pool to a degree
   * Optimized with atomic operation
   */
  async createDegreeXCP(
    degree_id: string,
    coursepool_id: string,
    name: string,
    credits: number,
  ): Promise<boolean> {
    try {
      // Check if pool already exists in this degree
      const exists = await Degree.exists({
        _id: degree_id,
        'coursePools.id': coursepool_id,
      }).exec();

      if (exists) {
        console.error(
          `[DegreeXCPController] Pool ${coursepool_id} already exists in degree ${degree_id}`,
        );
        return false;
      }

      const result = await Degree.updateOne(
        { _id: degree_id },
        {
          $push: {
            coursePools: {
              id: coursepool_id,
              name,
              creditsRequired: credits,
              courses: [],
            },
          },
        },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error creating degree-pool mapping:',
        error,
      );
      return false;
    }
  }

  /**
   * Get all course pools for a specific degree
   */
  async getAllDegreeXCP(degree_id: string): Promise<CoursePoolInfo[]> {
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
        courses: cp.courses || [],
      }));
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error fetching degree course pools:',
        error,
      );
      return [];
    }
  }

  /**
   * Update course pool credits for a degree
   */
  async updateDegreeXCP(
    degree_id: string,
    coursepool_id: string,
    credits: number,
  ): Promise<boolean> {
    try {
      const result = await Degree.updateOne(
        { _id: degree_id, 'coursePools.id': coursepool_id },
        { $set: { 'coursePools.$.creditsRequired': credits } },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error updating degree-pool mapping:',
        error,
      );
      return false;
    }
  }

  /**
   * Remove a course pool from a degree
   */
  async removeDegreeXCP(
    degree_id: string,
    coursepool_id: string,
  ): Promise<boolean> {
    try {
      const result = await Degree.updateOne(
        { _id: degree_id },
        { $pull: { coursePools: { id: coursepool_id } } },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error removing degree-pool mapping:',
        error,
      );
      return false;
    }
  }

  /**
   * Check if a course pool exists in a degree
   */
  async degreeHasCoursePool(
    degree_id: string,
    coursepool_id: string,
  ): Promise<boolean> {
    try {
      const exists = await Degree.exists({
        _id: degree_id,
        'coursePools.id': coursepool_id,
      }).exec();

      return !!exists;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error checking degree-pool mapping:',
        error,
      );
      return false;
    }
  }

  /**
   * Get credits required for a specific pool in a degree
   */
  async getPoolCredits(
    degree_id: string,
    coursepool_id: string,
  ): Promise<number | undefined> {
    try {
      const result = await this.aggregate([
        { $match: { _id: degree_id } },
        { $unwind: '$coursePools' },
        { $match: { 'coursePools.id': coursepool_id } },
        {
          $project: {
            _id: 0,
            creditsRequired: '$coursePools.creditsRequired',
          },
        },
      ]);

      // @ts-ignore
      return result.data?.[0]?.creditsRequired;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeXCPController] Error fetching pool credits:',
        error,
      );
      return undefined;
    }
  }
}

export const degreeXCPController = new DegreeXCPController();
