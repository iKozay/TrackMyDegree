/**
 * Optimized User Controller
 *
 * Extends BaseMongoController and consolidates user-related operations including deficiencies and exemptions
 */

import { BaseMongoController } from './BaseMongoController';
import { User, Course, Degree, Timeline } from '../../models';
import appUserTypes from '../appUserController/appUser_types';
import DeficiencyTypes from '../deficiencyController/deficiency_types';
import { randomUUID } from 'crypto';
import {
  TimelineEntry,
  UserDataResponse,
} from '@controllers/userDataController/user_data_types';

export interface ExemptionDoc {
  coursecode: string;
  user_id: string;
}

export class UserController extends BaseMongoController<any> {
  constructor() {
    super(User, 'User');
  }

  /**
   * Update user information
   */
  async updateUser(
    id: string,
    email: string,
    password: string,
    fullname: string,
    degree: string,
    type: appUserTypes.UserType,
  ): Promise<appUserTypes.AppUser | undefined> {
    try {
      const result = await this.updateById(id, {
        email,
        password,
        fullname,
        degree,
        type,
      });

      if (!result.success) {
        throw new Error('AppUser with this id does not exist.');
      }

      return {
        id: result.data._id,
        email: result.data.email,
        password: result.data.password,
        fullname: result.data.fullname,
        degree: result.data.degree,
        type: result.data.type,
      };
    } catch (error) {
      this.handleError(error, 'updateAppUser');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<string | undefined> {
    try {
      const result = await this.deleteById(id);

      if (!result.success) {
        throw new Error('AppUser with this id does not exist.');
      }

      return `AppUser with id ${id} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteAppUser');
    }
  }

  /**
   * Get user data including profile, timeline, deficiencies, exemptions, and degree info
   */
  async getUserData(id: string): Promise<UserDataResponse> {
    try {
      // Check if the user exists and retrieve basic profile info
      const user = await User.findById(id);

      if (!user) {
        throw new Error('User with this id does not exist.');
      }

      // Fetch the user's timeline (flatten nested structure to match SQL output format)
      const timelineResult = await Timeline.find({ userId: id });
      const timeline: TimelineEntry[] = [];

      // Flatten timeline items to match the SQL structure (season, year, coursecode)
      for (const tl of timelineResult) {
        for (const item of tl.items) {
          for (const coursecode of item.courses) {
            timeline.push({
              season: item.season,
              year: item.year,
              coursecode: coursecode,
            });
          }
        }
      }

      // Fetch all deficiencies from the user document (already embedded)
      const deficiencies = user.deficiencies.map((def) => ({
        coursepool: def.coursepool,
        creditsRequired: def.creditsRequired,
      }));

      // Fetch all exemptions from the user document (already embedded as course references)
      const exemptions = user.exemptions.map((coursecode) => ({
        coursecode: coursecode,
      }));

      // Fetch detailed degree information if user has a degree assigned
      let degree = null;
      if (user.degree) {
        const degreeDoc = await Degree.findById(user.degree);
        if (degreeDoc) {
          degree = {
            id: degreeDoc._id,
            name: degreeDoc.name,
            totalCredits: degreeDoc.totalCredits,
          };
        }
      }

      // Combine all retrieved data into a structured response object
      return {
        user: {
          id: user._id as string,
          email: user.email,
          fullname: user.fullname,
          type: user.type,
          degree: user.degree || null,
        },
        timeline,
        deficiencies,
        exemptions,
        degree: degree
          ? {
              id: degree.id as string,
              name: degree.name,
              totalCredits: degree.totalCredits,
            }
          : null,
      };
    } catch (error) {
      this.handleError(error, 'getUserData');
    }
  }

  // ==========================
  // DEFICIENCY OPERATIONS
  // ==========================

  /**
   * Create deficiency for user
   */
  async createDeficiency(
    coursepool: string,
    user_id: string,
    creditsRequired: number,
  ): Promise<DeficiencyTypes.Deficiency | undefined> {
    try {
      // Verify user exists
      const userResult = await this.findById(user_id);
      if (!userResult.success) {
        throw new Error('AppUser does not exist.');
      }

      // Check if deficiency already exists
      const user = userResult.data;
      if (
        Array.isArray(user.deficiencies) &&
        user.deficiencies.some((d: any) => d.coursepool === coursepool)
      ) {
        throw new Error(
          'Deficiency with this coursepool and user_id already exists. Please use the update endpoint',
        );
      }

      // Verify course pool exists in degrees
      const degreeResult = await Degree.findOne({
        'coursePools.id': coursepool,
      }).lean();
      if (!degreeResult) {
        throw new Error('CoursePool does not exist.');
      }

      // Add deficiency to user
      const deficiencies = user.deficiencies || [];
      deficiencies.push({ coursepool, creditsRequired });

      const updateResult = await this.updateById(user_id, { deficiencies });
      if (!updateResult.success) {
        throw new Error('Failed to update user deficiencies');
      }

      return {
        id: randomUUID(),
        coursepool,
        user_id,
        creditsRequired,
      };
    } catch (error) {
      this.handleError(error, 'createDeficiency');
    }
  }

  /**
   * Get all deficiencies for user
   */
  async getAllDeficienciesByUser(
    user_id: string,
  ): Promise<DeficiencyTypes.Deficiency[] | undefined> {
    try {
      const result = await this.findById(user_id);
      if (!result.success) {
        throw new Error('AppUser does not exist.');
      }

      const user = result.data;
      const allDeficiencies = (user.deficiencies || []).map((def: any) => ({
        id: randomUUID(),
        coursepool: def.coursepool,
        user_id: user_id,
        creditsRequired: def.creditsRequired,
      }));

      return allDeficiencies;
    } catch (error) {
      this.handleError(error, 'getAllDeficienciesByUser');
    }
  }

  /**
   * Delete deficiency
   */
  async deleteDeficiencyByCoursepoolAndUserId(
    coursepool: string,
    user_id: string,
  ): Promise<string | undefined> {
    try {
      const result = await this.findById(user_id);
      if (!result.success) {
        throw new Error('AppUser does not exist.');
      }

      const user = result.data;
      if (!Array.isArray(user.deficiencies)) {
        throw new Error('Deficiency with this id does not exist.');
      }

      const idx = user.deficiencies.findIndex(
        (d: any) => d.coursepool === coursepool,
      );
      if (idx === -1) {
        throw new Error('Deficiency with this id does not exist.');
      }

      // Remove deficiency and update user
      const deficiencies = [...user.deficiencies];
      deficiencies.splice(idx, 1);

      const updateResult = await this.updateById(user_id, { deficiencies });
      if (!updateResult.success) {
        throw new Error('Failed to update user deficiencies');
      }

      return `Deficiency with appUser ${user_id} and coursepool ${coursepool} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteDeficiencyByCoursepoolAndUserId');
    }
  }

  // ==========================
  // EXEMPTION OPERATIONS
  // ==========================

  /**
   * Create exemptions for user
   */
  async createExemptions(
    coursecodes: string[],
    user_id: string,
  ): Promise<{ created: ExemptionDoc[]; alreadyExists: string[] }> {
    try {
      if (!this.checkConnection()) {
        return { created: [], alreadyExists: [] };
      }

      const result = await this.findById(user_id);
      if (!result.success) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      const user = result.data;
      const created: ExemptionDoc[] = [];
      const alreadyExists: string[] = [];

      for (const code of coursecodes) {
        // Verify course exists
        const courseResult = await Course.findById(code);
        if (!courseResult) {
          throw new Error(`Course with code '${code}' does not exist.`);
        }

        if (user.exemptions.includes(code)) {
          alreadyExists.push(code);
          continue;
        }

        user.exemptions.push(code);
        created.push({ coursecode: code, user_id });
      }

      // Update user with new exemptions
      const updateResult = await this.updateById(user_id, {
        exemptions: user.exemptions,
      });
      if (!updateResult.success) {
        throw new Error('Failed to update user exemptions');
      }

      return { created, alreadyExists };
    } catch (error) {
      this.handleError(error, 'createExemptions');
    }
  }

  /**
   * Get all exemptions for user
   */
  async getAllExemptionsByUser(
    user_id: string,
  ): Promise<ExemptionDoc[] | undefined> {
    try {
      if (!this.checkConnection()) {
        return undefined;
      }

      const result = await this.findById(user_id);
      if (!result.success) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      const user = result.data;
      if (!user.exemptions || user.exemptions.length === 0) {
        throw new Error(`No exemptions found for user with id '${user_id}'.`);
      }

      return user.exemptions.map((code: string) => ({
        coursecode: code,
        user_id,
      }));
    } catch (error) {
      this.handleError(error, 'getAllExemptionsByUser');
    }
  }

  /**
   * Delete exemption
   */
  async deleteExemptionByCoursecodeAndUserId(
    coursecode: string,
    user_id: string,
  ): Promise<string | undefined> {
    try {
      if (!this.checkConnection()) {
        return undefined;
      }

      const result = await this.findById(user_id);
      if (!result.success) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      const user = result.data;
      if (!user.exemptions.includes(coursecode)) {
        throw new Error(
          'Exemption with this coursecode and user_id does not exist.',
        );
      }

      const exemptions = user.exemptions.filter(
        (c: string) => c !== coursecode,
      );
      const updateResult = await this.updateById(user_id, { exemptions });

      if (!updateResult.success) {
        throw new Error('Failed to update user exemptions');
      }

      return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteExemptionByCoursecodeAndUserId');
    }
  }
}

export const userController = new UserController();
