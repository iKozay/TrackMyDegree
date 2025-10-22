/**
 * Exports all optimized MongoDB controllers
 *
 * These controllers are fully decoupled from other controller implementations
 */

export { BaseMongoController } from './BaseMongoController';
export type {
  BaseDocument,
  ControllerResponse,
  PaginationOptions,
  SearchOptions,
  QueryOptions,
} from './BaseMongoController';

export { CourseController, courseController } from './CourseController';
export type { CourseData } from './CourseController';

export { DegreeController, degreeController } from './DegreeController';
export type { DegreeData } from './DegreeController';

export { UserController, userController } from './UserController';
export type {
  UserData,
  DeficiencyData,
  ExemptionData,
  UserDataResponse,
} from './UserController';

export { TimelineController, timelineController } from './TimelineController';
export type { TimelineData, TimelineItem } from './TimelineController';

export { FeedbackController, feedbackController } from './FeedbackController';
export type { FeedbackData } from './FeedbackController';

export { AdminController, adminController } from './AdminController';

export { AuthController, authController, UserType } from './AuthController';
export type {
  Credentials,
  UserInfo,
  PasswordResetRequest,
} from './AuthController';

export {
  CoursePoolController,
  coursePoolController,
} from './CoursePoolController';
export type { CoursePoolData } from './CoursePoolController';

export {
  CourseXCPController,
  courseXCPController,
} from './CourseXCPController';
export type { CourseXCPData } from './CourseXCPController';

export {
  DegreeXCPController,
  degreeXCPController,
} from './DegreeXCPController';
export type { DegreeXCPData, CoursePoolInfo } from './DegreeXCPController';

export {
  RequisiteController,
  requisiteController,
} from './RequisiteController';
export type { RequisiteType, RequisiteData } from './RequisiteController';
