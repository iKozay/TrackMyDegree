/**
 * Provides course-specific operations using MongoDB.
 * Includes requisite (prerequisites/corequisites) functionality.
 * Decoupled from Express for better reusability.
 */

import { BaseMongoController } from './BaseMongoController';
import { Course } from '../../models';

export interface CourseData {
  _id: string;
  code?: string;
  title: string;
  description?: string;
  credits: number;
  prerequisites?: string[];
  corequisites?: string[];
  offeredIn?: string[];
  [key: string]: unknown;
}

export type RequisiteType = 'pre' | 'co';

export interface RequisiteData {
  code1: string;
  code2: string;
  type: RequisiteType;
}

export class CourseController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Course');
  }

  // ==========================
  // COURSE OPERATIONS
  // ==========================

  /**
   * Create a new course
   */
  async createCourse(courseData: CourseData): Promise<CourseData> {
    try {
      // Check if course with the same id already exists
      const existingCourse = await this.findById(courseData._id);
      if (existingCourse) {
        throw new Error('Course with this id already exists.');
      }
      const result = await this.create(courseData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create course');
      }
      return result.data;
    } catch (error) {
      this.handleError(error, 'createCourse');
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(
    _id: string,
    updateData: Partial<CourseData>,
  ): Promise<CourseData | null> {
    try {
      const result = await this.updateById(_id, updateData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update course');
      }
      return result.data;
    } catch (error) {
      this.handleError(error, 'updateCourse');
      return null;
    }
  }

  /**
   * Get all courses with optional filtering and pagination
   */
  async getAllCourses(
    params: {
      pool?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
    try {
      const { pool, search, page, limit, sort } = params;

      const filter: Record<string, unknown> = {};
      if (pool) {
        filter.offeredIn = pool;
      }

      const options = {
        page,
        limit,
        sort: sort ? { [sort]: 1 as const } : { title: 1 as const },
        search,
        fields: ['title', 'description', '_id'],
      };

      const result = await this.findAll(filter, options);
      return result.data || [];
    } catch (error) {
      this.handleError(error, 'getAllCourses');
    }
  }

  /**
   * Get course by code
   */
  async getCourseByCode(code: string) {
    try {
      const result = await this.findById(code);

      if (!result.success) {
        throw new Error(result.error || 'Course not found');
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'getCourseByCode');
    }
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(poolName: string) {
    try {
      const result = await this.findAll({ offeredIn: poolName });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }

      return result.data || [];
    } catch (error) {
      this.handleError(error, 'getCoursesByPool');
    }
  }

  /**
   * Delete a course by code
   */
  async deleteCourse(code: string): Promise<string> {
    try {
      const result = await this.deleteById(code);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete course');
      }
      return `Course '${code}' deleted successfully.`;
    } catch (error) {
      this.handleError(error, 'deleteCourse');
    }
  }

  // ==========================
  // REQUISITE OPERATIONS
  // ==========================

  /**
   * Create a new course requisite
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
}

export const courseController = new CourseController();
