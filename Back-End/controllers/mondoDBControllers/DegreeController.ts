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
}

export interface CoursePoolData {
  _id: string;
  name: string;
  creditsRequired?: number;
  courses?: string[];
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

  // ==========================
  // COURSE POOL OPERATIONS
  // ==========================

  /**
   * Get all course pools from all degrees (aggregated and deduplicated)
   */
  async getAllCoursePools(): Promise<CoursePoolData[]> {
    try {
      const result = await this.aggregate<CoursePoolData>([
        { $unwind: '$coursePools' },
        {
          $group: {
            _id: '$coursePools._id',
            name: { $first: '$coursePools.name' },
            creditsRequired: { $first: '$coursePools.creditsRequired' },
          },
        },
        {
          $project: {
            _id: '$_id',
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
        '[DegreeController] Error fetching all course pools:',
        error,
      );
      return [];
    }
  }

  /**
   * Get a specific course pool by ID
   */
  async getCoursePool(pool_id: string): Promise<CoursePoolData | undefined> {
    try {
      const result = await this.aggregate<CoursePoolData>([
        { $unwind: '$coursePools' },
        { $match: { 'coursePools._id': pool_id } },
        {
          $project: {
            _id: '$coursePools._id',
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
      console.error('[DegreeController] Error fetching course pool:', error);
      return undefined;
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
        _id: cp._id,
        name: cp.name,
        creditsRequired: cp.creditsRequired,
        courses: cp.courses,
      }));
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[DegreeController] Error fetching degree course pools:',
        error,
      );
      return [];
    }
  }
}

export const degreeController = new DegreeController();
