/**
 * Provides user-specific operations including deficiencies and exemptions.
 */

import { BaseMongoController } from './BaseMongoController';
import { User, Course, Degree, Timeline } from '../../models';

const USER_WITH_ID_DOES_NOT_EXIST = 'User with this id does not exist.';
const USER_DOES_NOT_EXIST = 'User does not exist.';

export interface UserData {
  id?: string;
  email: string;
  password?: string;
  fullname: string;
  degree?: string;
  type: 'student' | 'advisor' | 'admin';
  deficiencies?: Array<{ coursepool: string; creditsRequired: number }>;
  exemptions?: string[];
}

export interface DeficiencyData {
  coursepool: string;
  user_id: string;
  creditsRequired: number;
}

export interface ExemptionData {
  coursecode: string;
  user_id: string;
}

export interface UserDataResponse {
  user: {
    id: string;
    email: string;
    fullname: string;
    type: string;
    degree: string | null;
  };
  timeline: Array<{ season: string; year: number; coursecode: string }>;
  deficiencies: Array<{ coursepool: string; creditsRequired: number }>;
  exemptions: Array<{ coursecode: string }>;
  degree: { id: string; name: string; totalCredits: number } | null;
}

export class UserController extends BaseMongoController<any> {
  constructor() {
    super(User, 'User');
  }

  // ==========================
  // USER CRUD OPERATIONS
  // ==========================

  /**
   * Create a new user
   */
  async createUser(userData: UserData): Promise<UserData> {
    try {
      // Check if user already exists
      const existsResult = await this.exists({ email: userData.email });
      if (existsResult.data) {
        throw new Error('User with this email already exists.');
      }

      const result = await this.create(userData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      return {
        id: result.data._id,
        email: result.data.email,
        fullname: result.data.fullname,
        degree: result.data.degree,
        type: result.data.type,
        deficiencies: result.data.deficiencies,
        exemptions: result.data.exemptions,
      };
    } catch (error) {
      this.handleError(error, 'createUser');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserData> {
    try {
      const result = await this.findById(id);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      return {
        id: result.data._id,
        email: result.data.email,
        fullname: result.data.fullname,
        degree: result.data.degree,
        type: result.data.type,
        deficiencies: result.data.deficiencies,
        exemptions: result.data.exemptions,
      };
    } catch (error) {
      this.handleError(error, 'getUserById');
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const result = await this.findAll(
        {},
        { select: 'email fullname degree type' },
      );

      if (!result.success) {
        throw new Error('Failed to fetch users');
      }

      return (result.data || []).map((user) => ({
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        degree: user.degree,
        type: user.type,
        deficiencies: user.deficiencies,
        exemptions: user.exemptions,
      }));
    } catch (error) {
      this.handleError(error, 'getAllUsers');
    }
  }

  /**
   * Update user information
   * Note: User type cannot be updated through this method for security reasons
   */
  async updateUser(id: string, updates: Partial<UserData>) {
    try {
      // Remove type from updates to prevent unauthorized user type changes
      const { type, ...safeUpdates } = updates;

      if (type !== undefined) {
        console.warn(
          `Attempted to update user type for user ${id}. This change was blocked.`,
        );
      }

      const result = await this.updateById(id, safeUpdates);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      return {
        id: result.data._id,
        email: result.data.email,
        password: result.data.password,
        fullname: result.data.fullname,
        degree: result.data.degree,
      };
    } catch (error) {
      this.handleError(error, 'updateUser');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    try {
      const result = await this.deleteById(id);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      return `User with id ${id} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteUser');
    }
  }

  /**
   * Get comprehensive user data including timeline, deficiencies, exemptions, and degree info
   */
  async getUserData(id: string): Promise<UserDataResponse> {
    try {
      // Fetch user and timeline in parallel
      const [userResult, timelineResult] = await Promise.all([
        this.findById(id),
        Timeline.find({ userId: id }).lean().exec(),
      ]);

      if (!userResult.success || !userResult.data) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      const user = userResult.data;

      // Flatten timeline structure
      const timeline: Array<{
        season: string;
        year: number;
        coursecode: string;
      }> = [];
      for (const tl of timelineResult) {
        for (const item of tl.items || []) {
          for (const coursecode of item.courses || []) {
            timeline.push({
              season: item.season,
              year: item.year,
              coursecode,
            });
          }
        }
      }

      // Process deficiencies
      const deficiencies = (user.deficiencies || []).map(
        (def: { coursepool: string; creditsRequired: number }) => ({
          coursepool: def.coursepool,
          creditsRequired: def.creditsRequired,
        }),
      );

      // Process exemptions
      const exemptions = (user.exemptions || []).map((coursecode: string) => ({
        coursecode,
      }));

      // Fetch degree info if available
      let degree = null;
      if (user.degree) {
        const degreeDoc = await Degree.findById(user.degree).lean().exec();
        if (degreeDoc) {
          degree = {
            id: degreeDoc._id,
            name: degreeDoc.name,
            totalCredits: degreeDoc.totalCredits,
          };
        }
      }

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
        degree,
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
  ): Promise<DeficiencyData> {
    try {
      const userResult = await this.findById(user_id);
      if (!userResult.success) {
        throw new Error(USER_DOES_NOT_EXIST);
      }

      const user = userResult.data;

      // Check if deficiency already exists
      if (
        user.deficiencies?.some(
          (d: { coursepool: string }) => d.coursepool === coursepool,
        )
      ) {
        throw new Error(
          'Deficiency with this coursepool already exists. Please use the update endpoint',
        );
      }

      // Add deficiency using atomic operation
      const updateResult = await this.model
        .findByIdAndUpdate(
          user_id,
          { $push: { deficiencies: { coursepool, creditsRequired } } },
          { new: true },
        )
        .lean()
        .exec();

      if (!updateResult) {
        throw new Error('Failed to update user deficiencies');
      }

      return { coursepool, user_id, creditsRequired };
    } catch (error) {
      this.handleError(error, 'createDeficiency');
    }
  }

  /**
   * Get all deficiencies for user
   */
  async getAllDeficienciesByUser(user_id: string): Promise<DeficiencyData[]> {
    try {
      const result = await this.findById(user_id, 'deficiencies');
      if (!result.success) {
        throw new Error(USER_DOES_NOT_EXIST);
      }

      return (result.data?.deficiencies || []).map(
        (def: { coursepool: string; creditsRequired: number }) => ({
          coursepool: def.coursepool,
          user_id,
          creditsRequired: def.creditsRequired,
        }),
      );
    } catch (error) {
      this.handleError(error, 'getAllDeficienciesByUser');
    }
  }

  /**
   * Update deficiency
   */
  async updateDeficiency(
    coursepool: string,
    user_id: string,
    creditsRequired: number,
  ): Promise<DeficiencyData> {
    try {
      const result = await this.model
        .findOneAndUpdate(
          { _id: user_id, 'deficiencies.coursepool': coursepool },
          { $set: { 'deficiencies.$.creditsRequired': creditsRequired } },
          { new: true },
        )
        .lean()
        .exec();

      if (!result) {
        throw new Error('Deficiency not found.');
      }

      return { coursepool, user_id, creditsRequired };
    } catch (error) {
      this.handleError(error, 'updateDeficiency');
    }
  }

  /**
   * Delete deficiency
   */
  async deleteDeficiency(coursepool: string, user_id: string): Promise<string> {
    try {
      const result = await this.model
        .findByIdAndUpdate(
          user_id,
          { $pull: { deficiencies: { coursepool } } },
          { new: true },
        )
        .lean()
        .exec();

      if (!result) {
        throw new Error(USER_DOES_NOT_EXIST);
      }

      return `Deficiency with coursepool ${coursepool} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteDeficiency');
    }
  }

  // ==========================
  // EXEMPTION OPERATIONS
  // ==========================

  /**
   * Create exemptions for user (bulk operation)
   */
  async createExemptions(coursecodes: string[], user_id: string) {
    try {
      const userResult = await this.findById(user_id, 'exemptions');
      if (!userResult.success) {
        throw new Error(`User with id '${user_id}' does not exist.`);
      }

      const existingExemptions = new Set(userResult.data?.exemptions || []);
      const created: ExemptionData[] = [];
      const alreadyExists: string[] = [];

      // Validate all courses exist (parallel query)
      const courseChecks = await Promise.all(
        coursecodes.map((code) => Course.exists({ _id: code }).exec()),
      );

      coursecodes.forEach((code, index) => {
        if (!courseChecks[index]) {
          throw new Error(`Course with code '${code}' does not exist.`);
        }

        if (existingExemptions.has(code)) {
          alreadyExists.push(code);
        } else {
          created.push({ coursecode: code, user_id });
        }
      });

      // Bulk add new exemptions
      if (created.length > 0) {
        await this.model
          .findByIdAndUpdate(user_id, {
            $addToSet: {
              exemptions: { $each: created.map((e) => e.coursecode) },
            },
          })
          .exec();
      }

      return { created, alreadyExists };
    } catch (error) {
      this.handleError(error, 'createExemptions');
    }
  }

  /**
   * Get all exemptions for user
   */
  async getAllExemptionsByUser(user_id: string): Promise<ExemptionData[]> {
    try {
      const result = await this.findById(user_id, 'exemptions');
      if (!result.success) {
        throw new Error(`User with id '${user_id}' does not exist.`);
      }

      if (!result.data?.exemptions || result.data.exemptions.length === 0) {
        return [];
      }

      return result.data.exemptions.map((code: string) => ({
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
  async deleteExemption(coursecode: string, user_id: string): Promise<string> {
    try {
      const result = await this.model
        .findByIdAndUpdate(
          user_id,
          { $pull: { exemptions: coursecode } },
          { new: true },
        )
        .lean()
        .exec();

      if (!result) {
        throw new Error(`User with id '${user_id}' does not exist.`);
      }

      return `Exemption with coursecode ${coursecode} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteExemption');
    }
  }
}

export const userController = new UserController();
