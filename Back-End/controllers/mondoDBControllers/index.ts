/**
 * Exports all optimized MongoDB controllers
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
export type {
  CourseData,
  RequisiteType,
  RequisiteData,
} from './CourseController';

export { DegreeController, degreeController } from './DegreeController';
export type {
  DegreeData,
  CoursePoolData,
  DegreeXCPData,
  CoursePoolInfo,
} from './DegreeController';

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
