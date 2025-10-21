/**
 * Optimized Course Pool Controller
 *
 * Handles course pool operations with improved error handling.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import DB_OPS from '@Util/DB_Ops';
import CoursePoolTypes from '../coursepoolController/coursepool_types';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

export class CoursePoolController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'CoursePool');
  }

  /**
   * Creates a new course pool.
   * NOTE: In MongoDB implementation, course pools are embedded in Degree documents.
   * This function only generates and logs a new pool ID. To actually use the pool,
   * it must be added to a Degree document via DegreeXCPController.
   */
  async createCoursePool(pool_name: string): Promise<DB_OPS> {
    try {
      const record: CoursePoolTypes.CoursePoolItem = {
        id: randomUUID(),
        name: pool_name,
      };

      // Placeholder: actual persistence logic may depend on Degree model usage
      console.log(
        `CoursePool '${pool_name}' with id '${record.id}' created successfully`,
      );
      return DB_OPS.SUCCESS;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in coursepool creation\n', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Retrieves all course pools from all degrees.
   * Aggregates coursePools from all Degree documents and removes duplicates.
   */
  async getAllCoursePools(): Promise<
    { course_pools: CoursePoolTypes.CoursePoolItem[] } | undefined
  > {
    try {
      const degrees = await Degree.find().lean();

      const allPoolsMap = new Map<string, CoursePoolTypes.CoursePoolItem>();
      for (const degree of degrees) {
        if (!degree.coursePools) continue;
        for (const pool of degree.coursePools) {
          if (!allPoolsMap.has(pool.id)) {
            allPoolsMap.set(pool.id, { id: pool.id, name: pool.name });
          }
        }
      }

      const course_pools = Array.from(allPoolsMap.values());
      return { course_pools };
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error fetching all course pools\n', error);
      return undefined;
    }
  }

  /**
   * Retrieves a specific course pool by ID.
   */
  async getCoursePool(
    pool_id: string,
  ): Promise<CoursePoolTypes.CoursePoolItem | undefined> {
    try {
      const degrees = await Degree.find({ 'coursePools.id': pool_id }).lean();

      if (degrees.length === 0) {
        console.log(`CoursePool with id '${pool_id}' not found`);
        return undefined;
      }

      for (const degree of degrees) {
        const pool = degree.coursePools?.find((cp) => cp.id === pool_id);
        if (pool) {
          return { id: pool.id, name: pool.name };
        }
      }

      return undefined;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error fetching course pool by ID\n', error);
      return undefined;
    }
  }

  /**
   * Updates an existing course pool across all degrees that contain it.
   */
  async updateCoursePool(
    update_info: CoursePoolTypes.CoursePoolItem,
  ): Promise<DB_OPS> {
    const { id, name } = update_info;

    try {
      const degrees = await Degree.find({ 'coursePools.id': id });

      if (degrees.length === 0) {
        console.log(`CoursePool with id '${id}' not found in any degree`);
        return DB_OPS.MOSTLY_OK;
      }

      let updated = false;

      await Promise.all(
        degrees.map(async (degree) => {
          const pool = degree.coursePools.find((cp) => cp.id === id);
          if (pool) {
            pool.name = name;
            await degree.save();
            updated = true;
          }
        }),
      );

      return updated ? DB_OPS.SUCCESS : DB_OPS.MOSTLY_OK;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in updating course pool item\n', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Removes a course pool by ID from all degrees.
   */
  async removeCoursePool(pool_id: string): Promise<DB_OPS> {
    try {
      const degrees = await Degree.find({ 'coursePools.id': pool_id });
      if (degrees.length === 0) {
        console.log(`CoursePool with id '${pool_id}' not found in any degree`);
        return DB_OPS.MOSTLY_OK;
      }
      let removed = false;
      await Promise.all(
        degrees.map(async (degree) => {
          const initialLength = degree.coursePools.length;

          // Find the index and remove using splice
          const index = degree.coursePools.findIndex((cp) => cp.id === pool_id);
          if (index !== -1) {
            degree.coursePools.splice(index, 1);
            await degree.save();
            removed = true;
          }
        }),
      );
      return removed ? DB_OPS.SUCCESS : DB_OPS.MOSTLY_OK;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in deleting course pool item\n', error);
      return DB_OPS.FAILURE;
    }
  }
}

export const coursePoolController = new CoursePoolController();
