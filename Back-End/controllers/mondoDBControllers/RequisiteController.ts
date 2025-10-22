/**
 * Optimized Requisite Controller
 *
 * Handles course prerequisites and corequisites with improved performance.
 */

import { BaseMongoController } from './BaseMongoController';
import { Course } from '../../models';
import * as Sentry from '@sentry/node';

export type RequisiteType = 'pre' | 'co';

export interface RequisiteData {
  code1: string;
  code2: string;
  type: RequisiteType;
}

export class RequisiteController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Requisite');
  }

  /**
   * Create a new course requisite
   * Optimized with atomic operation and validation
   */
  async createRequisite(
    code1: string,
    code2: string,
    type: RequisiteType,
  ): Promise<RequisiteData> {
    try {
      // Validate both courses exist (parallel query)
      const [exists1, exists2] = await Promise.all([
        Course.exists({ _id: code1 }).exec(),
        Course.exists({ _id: code2 }).exec(),
      ]);

      if (!exists1 || !exists2) {
        throw new Error(
          `One or both courses ('${code1}', '${code2}') do not exist.`,
        );
      }

      const field = type === 'pre' ? 'prerequisites' : 'corequisites';

      // Add requisite atomically (won't add if already exists)
      const result = await Course.updateOne(
        { _id: code1 },
        { $addToSet: { [field]: code2 } },
      ).exec();

      if (result.modifiedCount === 0) {
        throw new Error('Requisite already exists or course not found.');
      }

      return { code1, code2, type };
    } catch (error) {
      this.handleError(error, 'createRequisite');
    }
  }

  /**
   * Get all requisites for a course
   * Optimized with field projection
   */
  async getRequisites(code1: string): Promise<RequisiteData[]> {
    try {
      const course = await Course.findById(code1)
        .select('prerequisites corequisites')
        .lean()
        .exec();

      if (!course) {
        throw new Error(`Course '${code1}' does not exist.`);
      }

      const requisites: RequisiteData[] = [];

      // Add prerequisites
      (course.prerequisites || []).forEach((code2: string) => {
        requisites.push({ code1, code2, type: 'pre' });
      });

      // Add corequisites
      (course.corequisites || []).forEach((code2: string) => {
        requisites.push({ code1, code2, type: 'co' });
      });

      return requisites;
    } catch (error) {
      this.handleError(error, 'getRequisites');
    }
  }

  /**
   * Check if a specific requisite exists
   */
  async requisiteExists(
    code1: string,
    code2: string,
    type: RequisiteType,
  ): Promise<boolean> {
    try {
      const field = type === 'pre' ? 'prerequisites' : 'corequisites';

      const exists = await Course.exists({
        _id: code1,
        [field]: code2,
      }).exec();

      return !!exists;
    } catch (error) {
      Sentry.captureException(error);
      console.error('[RequisiteController] Error checking requisite:', error);
      return false;
    }
  }

  /**
   * Delete a requisite
   * Optimized with atomic operation
   */
  async deleteRequisite(
    code1: string,
    code2: string,
    type: RequisiteType,
  ): Promise<string> {
    try {
      const field = type === 'pre' ? 'prerequisites' : 'corequisites';

      const result = await Course.updateOne(
        { _id: code1 },
        { $pull: { [field]: code2 } },
      ).exec();

      if (result.modifiedCount === 0) {
        throw new Error('Requisite not found or already deleted.');
      }

      return `Requisite deleted successfully.`;
    } catch (error) {
      this.handleError(error, 'deleteRequisite');
    }
  }

  /**
   * Get all courses that have a specific course as prerequisite
   */
  async getCoursesRequiring(coursecode: string): Promise<string[]> {
    try {
      const courses = await Course.find({
        $or: [{ prerequisites: coursecode }, { corequisites: coursecode }],
      })
        .select('_id')
        .lean()
        .exec();

      return courses.map((c) => c._id).filter((id): id is string => id != null);
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[RequisiteController] Error fetching dependent courses:',
        error,
      );
      return [];
    }
  }

  /**
   * Bulk add prerequisites to a course
   */
  async bulkAddPrerequisites(
    code1: string,
    prerequisites: string[],
  ): Promise<number> {
    try {
      const result = await Course.updateOne(
        { _id: code1 },
        { $addToSet: { prerequisites: { $each: prerequisites } } },
      ).exec();

      return result.modifiedCount || 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error(
        '[RequisiteController] Error bulk adding prerequisites:',
        error,
      );
      return 0;
    }
  }

  /**
   * Remove all requisites for a course
   */
  async clearRequisites(code1: string, type?: RequisiteType): Promise<boolean> {
    try {
      const update: any = {};

      if (!type || type === 'pre') {
        update.prerequisites = [];
      }
      if (!type || type === 'co') {
        update.corequisites = [];
      }

      const result = await Course.updateOne(
        { _id: code1 },
        { $set: update },
      ).exec();

      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      Sentry.captureException(error);
      console.error('[RequisiteController] Error clearing requisites:', error);
      return false;
    }
  }
}

export const requisiteController = new RequisiteController();
