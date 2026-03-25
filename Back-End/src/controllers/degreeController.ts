import { BaseMongoController } from './baseMongoController';
import { Degree, CoursePool, Course } from '@models';
import { DEGREE_WITH_ID_DOES_NOT_EXIST } from '@utils/constants';
import { DegreeData, CoursePoolInfo, CourseData } from '@shared/degree';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';

export interface DegreeXCPData {
  degree_id: string;
  coursepool_id: string;
  credits: number;
}

export class DegreeController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'Degree');
  }

  // ==========================
  // DEGREE OPERATIONS
  // ==========================

  async getCoursesForDegree(
    _id: string,
    academicYear?: string,
  ): Promise<CourseData[]> {
    try {
      const pools = await this.getCoursePoolsForDegree(_id, academicYear);

      // 3. Gather all course IDs
      const courseIds = [...new Set(pools.flatMap((p) => p.courses || []))];

      // 4. Fetch all courses
      const baseCourses = await Course.find({ _id: { $in: courseIds } })
        .lean<CourseData[]>()
        .exec();

      return resolveEntityVersions('Course', baseCourses, academicYear);
    } catch (error) {
      this.handleError(error, 'readDegreeData');
    }
  }

  /**
   * Create a new degree
   */
  async createDegree(degreeData: DegreeData): Promise<boolean> {
    try {
      // Check if degree with the same ID already exists
      const existingDegree = await this.findById(degreeData._id);

      if (existingDegree.data) {
        console.error(`Degree with ID ${degreeData._id} already exists.`);
        return false;
      }

      const result = await this.create(degreeData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create degree');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'createDegree');
    }
  }

  /**
   * Update an existing degree
   */
  async updateDegree(
    _id: string,
    updateData: Partial<DegreeData>,
  ): Promise<DegreeData> {
    try {
      const result = await this.updateById(_id, updateData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update degree');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
        degreeType: result.data.degreeType,
        coursePools: result.data.coursePools || [],
        ecpDegreeId: result.data.ecpDegreeId,
      };
    } catch (error) {
      this.handleError(error, 'updateDegree');
    }
  }

  /**
   * Get degree by ID
   */
  async readDegree(_id: string, academicYear?: string): Promise<DegreeData> {
    try {
      const result = await this.findById(_id);

      if (!result.success) {
        throw new Error(DEGREE_WITH_ID_DOES_NOT_EXIST);
      }

      const resolved = await resolveEntityVersion({
        entityType: 'Degree',
        entityId: _id,
        baseEntity: {
          _id: result.data._id,
          name: result.data.name,
          totalCredits: result.data.totalCredits,
          degreeType: result.data.degreeType,
          coursePools: result.data.coursePools || [],
          ecpDegreeId: result.data.ecpDegreeId,
          baseAcademicYear: result.data.baseAcademicYear,
        },
        academicYear,
      });

      return resolved.entity;
    } catch (error) {
      this.handleError(error, 'readDegree');
    }
  }

  /**
   * Get all degrees (excluding ECP)
   */
  async readAllDegrees(academicYear?: string): Promise<DegreeData[]> {
    try {
      const result = await this.findAll(
        { degreeType: { $nin: ['ECP', 'Co-op'] } },
        {
          select:
            'name totalCredits degreeType coursePools ecpDegreeId baseAcademicYear',
          sort: { name: 1 },
        },
      );

      if (!result.success) {
        throw new Error('Failed to fetch degrees');
      }

      return resolveEntityVersions(
        'Degree',
        (result.data || []).map((degree) => ({
          _id: degree._id,
          name: degree.name,
          totalCredits: degree.totalCredits,
          degreeType: degree.degreeType,
          coursePools: degree.coursePools,
          ecpDegreeId: degree.ecpDegreeId,
          baseAcademicYear: degree.baseAcademicYear,
        })),
        academicYear,
      );
    } catch (error) {
      this.handleError(error, 'readAllDegrees');
    }
  }

  /**
   * Get credits for degree (optimized - only fetches totalCredits field)
   */
  async getCreditsForDegree(
    _id: string,
    academicYear?: string,
  ): Promise<number> {
    try {
      const degree = await this.readDegree(_id, academicYear);
      return degree.totalCredits;
    } catch (error) {
      this.handleError(error, 'getCreditsForDegree');
    }
  }

  /**
   * Get course pools for a degree (optimized - only fetches coursePools field)
   */
  async getCoursePoolsForDegree(
    _id: string,
    academicYear?: string,
  ): Promise<CoursePoolInfo[]> {
    try {
      const degree = await this.readDegree(_id, academicYear);
      const basePools = await CoursePool.find({
        _id: { $in: degree.coursePools || [] },
      })
        .lean<CoursePoolInfo[]>()
        .exec();

      return resolveEntityVersions('CoursePool', basePools, academicYear);
    } catch (error) {
      this.handleError(error, 'getCoursePoolsForDegree');
    }
  }

  /**
   * Delete a degree by ID
   */
  async deleteDegree(_id: string): Promise<boolean> {
    try {
      const result = await this.deleteById(_id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete degree');
      }
      return true;
    } catch (error) {
      this.handleError(error, 'deleteDegree');
    }
  }
}

export const degreeController = new DegreeController();
