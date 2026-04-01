import { BaseMongoController } from './baseMongoController';
import { Degree, CoursePool, Course } from '@models';
import { DEGREE_WITH_ID_DOES_NOT_EXIST } from '@utils/constants';
import { CourseData, DegreeData, CoursePoolData } from '@trackmydegree/shared';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';
import { AlreadyExistsError } from '@utils/errors';

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
      const pools = await this.getCoursePoolsForDegree(_id, academicYear);

      // 3. Gather all course IDs
      const courseIds = [...new Set(pools.flatMap((p) => p.courses || []))];

      // 4. Fetch all courses
      const baseCourses = await Course.find({ _id: { $in: courseIds } })
        .lean<CourseData[]>()
        .exec();

      return resolveEntityVersions('Course', baseCourses, academicYear);
  }

  /**
   * Create a new degree
   */
  async createDegree(degreeData: DegreeData): Promise<boolean> {
      // Check if degree with the same ID already exists throws error if degreeData._id is provided and already exists
      const exists = await this.exists({ _id: degreeData._id })
      if(exists){
        throw new AlreadyExistsError('Degree with this ID already exists.');
      }
      await this.create(degreeData);
      return true;
  }

  /**
   * Update an existing degree
   */
  async updateDegree(
    _id: string,
    updateData: Partial<DegreeData>,
  ): Promise<DegreeData> {
      const result = await this.updateById(_id, updateData);

      return {
        _id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
        degreeType: result.data.degreeType,
        coursePools: result.data.coursePools || [],
        ecpDegreeId: result.data.ecpDegreeId,
      };
  }

  /**
   * Get degree by ID
   */
  async readDegree(_id: string, academicYear?: string): Promise<DegreeData> {
      const result = await this.findById(_id);


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
  }

  /**
   * Get all degrees (excluding ECP)
   */
  async readAllDegrees(academicYear?: string): Promise<DegreeData[]> {
      const result = await this.findAll(
        { degreeType: { $nin: ['ECP', 'Co-op'] } },
        {
          select:
            'name totalCredits degreeType coursePools ecpDegreeId baseAcademicYear',
          sort: { name: 1 },
        },
      );

      return resolveEntityVersions(
        'Degree',
        (result || []).map((degree) => ({
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
  }

  /**
   * Get credits for degree (optimized - only fetches totalCredits field)
   */
  async getCreditsForDegree(
    _id: string,
    academicYear?: string,
  ): Promise<number> {
      const degree = await this.readDegree(_id, academicYear);
      return degree.totalCredits;
  }

  /**
   * Get course pools for a degree (optimized - only fetches coursePools field)
   */
  async getCoursePoolsForDegree(
    _id: string,
    academicYear?: string,
  ): Promise<CoursePoolData[]> {
      const degree = await this.readDegree(_id, academicYear);
      const basePools = await CoursePool.find({
        _id: { $in: degree.coursePools || [] },
      })
        .lean<CoursePoolData[]>()
        .exec();

      const resolvedPools = await resolveEntityVersions(
        'CoursePool',
        basePools,
        academicYear,
      );

      return resolvedPools.map((coursePool) => ({
        _id: coursePool._id,
        name: coursePool.name,
        creditsRequired: coursePool.creditsRequired,
        courses: coursePool.courses || [],
        rules: coursePool.rules || [],
        baseAcademicYear: coursePool.baseAcademicYear,
      }));
  }

  /**
   * Delete a degree by ID
   */
  async deleteDegree(_id: string): Promise<string> {
      return await this.deleteById(_id);
  }
}

export const degreeController = new DegreeController();
