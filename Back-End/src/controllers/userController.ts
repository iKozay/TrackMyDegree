import { BaseMongoController } from './baseMongoController';
import { User, Timeline } from '@models';
import { AlreadyExistsError, BadRequestError } from '@utils/errors';

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
      // Check if user already exists
      const exists = await this.exists({ email: userData.email });
      if (exists) {
        throw new AlreadyExistsError('User with this email already exists.');
      }

      if(userData.type!== 'student' && userData.type !== 'advisor') 
        throw new BadRequestError(`User type (${userData.type}) is not supported through this route. Allowed types: "student", "advisor".`)

      const user = await this.create(userData);

      return {
        _id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
      };
  }

  /**
   * Get user by ID
   */
  async getUserById(_id: string): Promise<UserData> {
      const user = await this.findById(_id);

      return {
        _id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
      };
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<UserData[]> {
      const result = await this.findAll(
        {},
        { select: 'email fullname degree type' },
      );

      return (result || []).map((user) => ({
        _id: user._id,
        email: user.email,
        fullname: user.fullname,
        type: user.type
      }));
  }

  /**
   * Update user information
   * Note: User type cannot be updated through this method for security reasons
   */
  async updateUser(_id: string, updates: Partial<UserData>) {
      // Remove type from updates to prevent unauthorized user type changes
      const { type, ...safeUpdates } = updates;

      if (type !== undefined) {
        console.warn(
          `Attempted to update user type for user ${_id}. This change was blocked.`,
        );
      }

      const result = await this.updateById(_id, safeUpdates);

      return {
        _id: result.data._id,
        email: result.data.email,
        password: result.data.password,
        fullname: result.data.fullname,
      };
  }

  /**
   * Delete user
   */
  async deleteUser(_id: string) {
      return await this.deleteById(_id);
  }

  /**
   * Get comprehensive user data including timeline, deficiencies, exemptions, and degree info
   */
  async getUserData(_id: string): Promise<UserDataResponse> {
    // Fetch user and timeline in parallel
    const [userResult, timelineResult] = await Promise.all([
      this.findById(_id), 
      Timeline.find({ userId: _id })
        .select('degreeId name isExtendedCredit isCoop')
        .lean<TimelineResponse[]>()
        .exec(),
    ]);

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
}


}

export const userController = new UserController();
