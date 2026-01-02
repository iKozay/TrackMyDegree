import mongoose from 'mongoose';
import { BaseMongoController } from './baseMongoController';
import { User, Course, Degree, Timeline } from '@models';

const USER_WITH_ID_DOES_NOT_EXIST = 'User with this id does not exist.';
const USER_DOES_NOT_EXIST = 'User does not exist.';

export interface UserData {
  _id: string;
  email: string;
  password?: string;
  fullname: string;
  type: 'student' | 'advisor' | 'admin';
}
export interface CreateUserData {
  email: string;
  password?: string;
  fullname: string;
  type: 'student' | 'advisor'; 
}



export interface UserDataResponse {
  user: {
    _id: string;
    email: string;
    fullname: string;
    type: string;
  };
  timelines: TimelineResponse[];
}
interface TimelineResponse {
  _id:string;
  name: string;
  degreeId: string;
  isExtendedCredit: boolean;
  isCoop: boolean;
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
  async createUser(userData: CreateUserData): Promise<UserData> {
    try {
      // Check if user already exists
      const existsResult = await this.exists({ email: userData.email });
      if (existsResult.data) {
        throw new Error('User with this email already exists.');
      }

      if(userData.type!== 'student' && userData.type !== 'advisor') 
        throw new Error(`User type (${userData.type}) is not supported through this route. Allowed types: "student", "advisor".`)

      const result = await this.create(userData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      const user = result.data
      return {
        _id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
      };
    } catch (error) {
      this.handleError(error, 'createUser');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(_id: string): Promise<UserData> {
    try {
      const result = await this.findById(_id);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }
      const user = result.data
      return {
        _id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
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
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        type: user.type
      }));
    } catch (error) {
      this.handleError(error, 'getAllUsers');
    }
  }

  /**
   * Update user information
   * Note: User type cannot be updated through this method for security reasons
   */
  async updateUser(_id: string, updates: Partial<UserData>) {
    try {
      // Remove type from updates to prevent unauthorized user type changes
      const { type, ...safeUpdates } = updates;

      if (type !== undefined) {
        console.warn(
          `Attempted to update user type for user ${_id}. This change was blocked.`,
        );
      }

      const result = await this.updateById(_id, safeUpdates);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      return {
        _id: result.data._id,
        email: result.data.email,
        password: result.data.password,
        fullname: result.data.fullname,
      };
    } catch (error) {
      this.handleError(error, 'updateUser');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(_id: string) {
    try {
      const result = await this.deleteById(_id);

      if (!result.success) {
        throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
      }

      return `User with id ${_id} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteUser');
    }
  }

  /**
   * Get comprehensive user data including timeline, deficiencies, exemptions, and degree info
   */
  async getUserData(_id: string): Promise<UserDataResponse> {
  try {
    // Fetch user and timeline in parallel
    const [userResult, timelineResult] = await Promise.all([
      this.findById(_id), // keep as-is if you want the full user object
      Timeline.find({ userId: _id })
        .select('degreeId name isExtendedCredit isCoop')
        .lean<TimelineResponse[]>()
        .exec(),
    ]);

    if (!userResult.success || !userResult.data) {
      throw new Error(USER_WITH_ID_DOES_NOT_EXIST);
    }

    const user = userResult.data;

    return {
      user: {
        _id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
      },
      timelines: (timelineResult || []).map(timeline => ({
        _id: timeline._id.toString(),
        degreeId: timeline.degreeId,
        name: timeline.name,
        isExtendedCredit: timeline.isExtendedCredit,
        isCoop: timeline.isCoop,
      })), // only contains the selected fields
    };
  } catch (error) {
    this.handleError(error, 'getUserData');
  }
}


}

export const userController = new UserController();
