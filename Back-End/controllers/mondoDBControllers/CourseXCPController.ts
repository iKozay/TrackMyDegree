/**
 * Optimized CourseXCP Controller
 *
 * Handles course-coursepool mappings with improved error handling.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import CourseXCPTypes from '../CourseXCPController/CourseXCP_types';
import DB_OPS from '@Util/DB_Ops';
import * as Sentry from '@sentry/node';

export class CourseXCPController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'CourseXCP');
  }

  /**
   * Insert a new course in CoursePool record.
   */
  async createCourseXCP(new_record: CourseXCPTypes.CourseXCP): Promise<DB_OPS> {
    try {
      const { coursecode, coursepool_id } = new_record;

      const degree = await Degree.findOne({ 'coursePools.id': coursepool_id });
      if (!degree) {
        console.log('CoursePool not found: ' + coursepool_id);
        Sentry.captureMessage('CoursePool not found: ' + coursepool_id);
        return DB_OPS.MOSTLY_OK;
      }

      const coursePool = degree.coursePools.find(
        (pool) => pool.id === coursepool_id,
      );
      if (coursePool && !coursePool.courses.includes(coursecode)) {
        coursePool.courses.push(coursecode);
        await degree.save();
        return DB_OPS.SUCCESS;
      } else {
        return DB_OPS.MOSTLY_OK;
      }
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in courseXcoursepool creation\n', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Fetch all course codes for a given course pool id
   */
  async getAllCourseXCP(
    coursepool_id: string,
  ): Promise<{ course_codes: string[] } | undefined> {
    try {
      const degree = await Degree.findOne({ 'coursePools.id': coursepool_id });
      if (!degree) {
        return { course_codes: [] };
      }

      const coursePool = degree.coursePools.find(
        (pool) => pool.id === coursepool_id,
      );
      const codes = [];

      if (coursePool && coursePool.courses) {
        for (let i = 0; i < coursePool.courses.length; i++) {
          codes.push(coursePool.courses[i]);
        }
      }

      return {
        course_codes: codes,
      };
    } catch (error) {
      Sentry.captureException(error);
      console.log(
        'Error fetching all course codes for given coursepool id\n',
        error,
      );
      return undefined;
    }
  }

  /**
   * Update existing CourseXCoursePool row.
   */
  async updateCourseXCP(
    update_record: CourseXCPTypes.CourseXCPItem,
  ): Promise<DB_OPS> {
    try {
      const { coursecode, coursepool_id } = update_record;

      const degree = await Degree.findOne({ 'coursePools.id': coursepool_id });
      console.log(degree);
      if (!degree) {
        return DB_OPS.MOSTLY_OK;
      }

      const coursePool = degree.coursePools.find(
        (pool) => pool.id === coursepool_id,
      );
      if (coursePool && !coursePool?.courses.includes(coursecode)) {
        coursePool.courses.push(coursecode);
        await degree.save();
        return DB_OPS.SUCCESS;
      } else {
        return DB_OPS.MOSTLY_OK;
      }
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in updating courseXcoursepool item\n', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Delete a CourseXCoursePool mapping
   */
  async removeCourseXCP(
    delete_record: CourseXCPTypes.CourseXCP,
  ): Promise<DB_OPS> {
    try {
      const { coursecode, coursepool_id } = delete_record;

      const degree = await Degree.findOne({ 'coursePools.id': coursepool_id });

      if (!degree) {
        return DB_OPS.MOSTLY_OK;
      }

      const coursePool = degree.coursePools.find(
        (pool) => pool.id === coursepool_id,
      );
      const courseIndex = coursePool?.courses.indexOf(coursecode);

      console.log(courseIndex);

      if (coursePool && courseIndex && courseIndex > -1) {
        coursePool.courses.splice(courseIndex, 1);
        await degree.save();
        return DB_OPS.SUCCESS;
      } else {
        return DB_OPS.MOSTLY_OK;
      }
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error in deleting courseXcoursepool item\n', error);
      return DB_OPS.FAILURE;
    }
  }
}

export const courseXCPController = new CourseXCPController();
