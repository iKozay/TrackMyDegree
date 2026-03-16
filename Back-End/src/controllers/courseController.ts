import { BaseMongoController } from './baseMongoController';
import { Course } from '@models';
import { resolveEntityVersion } from '@services/catalogVersionService';

export interface CourseData {
  _id: string;
  title: string;
  description?: string;
  credits: number;
  offeredIn?: string[];
  prereqCoreqText?: string;
  rules?: {
    prereq?: string[][];
    coreq?: string[][];
    not_taken?: string[];
    min_credits?: number;
  };
  notes?: string;
  components?: string[];
  baseAcademicYear?: string;
}

export class CourseController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Course');
  }

  // ==========================
  // COURSE OPERATIONS
  // ==========================

  /**
   * Create multiple courses in bulk
   */
  async bulkCreateCourses(courseData: CourseData[]): Promise<boolean> {
    try {
      const result = await this.bulkWrite(courseData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create courses');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'bulkCreateCourse');
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
      academicYear?: string;
    } = {},
  ) {
    try {
      const { pool, search, page, limit, sort, academicYear } = params;

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
      const courses = result.data || [];

      return Promise.all(
        courses.map(async (course) => {
          const resolved = await resolveEntityVersion({
            entityType: 'Course',
            entityId: course._id,
            baseEntity: course,
            academicYear,
          });
          return resolved.entity;
        }),
      );
    } catch (error) {
      this.handleError(error, 'getAllCourses');
    }
  }

  async getAllCourseCodes(): Promise<string[]> {
    try {
      const result = await this.findAll({}, { fields: ['_id'] });

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map((course: any) => course._id);
    } catch (error) {
      this.handleError(error, 'getAllCourseCodes');
      return [];
    }
  }

  /**
   * Get course by code
   */
  async getCourseByCode(code: string, academicYear?: string) {
    try {
      const result = await this.findById(code);

      if (!result.success) {
        throw new Error(result.error || 'Course not found');
      }

      const resolved = await resolveEntityVersion({
        entityType: 'Course',
        entityId: code,
        baseEntity: result.data,
        academicYear,
      });

      return resolved.entity;
    } catch (error) {
      this.handleError(error, 'getCourseByCode');
    }
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(poolName: string, academicYear?: string) {
    try {
      const result = await this.findAll({ offeredIn: poolName });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }

      return Promise.all(
        (result.data || []).map(async (course) => {
          const resolved = await resolveEntityVersion({
            entityType: 'Course',
            entityId: course._id,
            baseEntity: course,
            academicYear,
          });
          return resolved.entity;
        }),
      );
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
}

export const courseController = new CourseController();
