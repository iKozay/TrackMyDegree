/**
 * Purpose:
 *  - Mongoose version of CourseXCPController for managing course-coursepool mappings.
 *  - Provides functions to create, read, update and delete CourseXCoursePool records.
 * Notes:
 *  - Uses Mongoose models instead of SQL database
 *  - Maintains same method signatures as SQL version
 *  - Returns DB_OPS enum for consistency
 */

import { Degree } from '../../models/Degree';
import CourseXCPTypes from '@controllers/CourseXCPController/CourseXCP_types';
import DB_OPS from '@Util/DB_Ops';
import * as Sentry from '@sentry/node';

const log = console.log;

/**
 * Insert a new course in CoursePool record.
 */
async function createCourseXCP(
  new_record: CourseXCPTypes.CourseXCP,
): Promise<DB_OPS> {
  try {
    const { coursecode, coursepool_id } = new_record;

    const degree = await Degree.findOne({ 'coursePools.id': coursepool_id });
    if (!degree) {
      log('CoursePool not found: ' + coursepool_id);
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
    log('Error in courseXcoursepool creation\n', error);
    return DB_OPS.FAILURE;
  }
}

/**
 * Fetch all course codes for a given course pool id
 */
async function getAllCourseXCP(
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
      for (const course of coursePool.courses) {
        codes.push(course);
      }
    }

    return {
      course_codes: codes,
    };
  } catch (error) {
    Sentry.captureException(error);
    log('Error fetching all course codes for given coursepool id\n', error);
    return undefined;
  }
}

/**
 * Update existing CourseXCoursePool row.
 */
async function updateCourseXCP(
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
    log('Error in updating courseXcoursepool item\n', error);
    return DB_OPS.FAILURE;
  }
}

/**
 * Delete a CourseXCoursePool mapping
 */
async function removeDegreeXCP(
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
    log('Error in deleting courseXcoursepool item\n', error);
    return DB_OPS.FAILURE;
  }
}

const CourseXCPController = {
  createCourseXCP,
  getAllCourseXCP,
  updateCourseXCP,
  removeDegreeXCP,
};

export default CourseXCPController;
