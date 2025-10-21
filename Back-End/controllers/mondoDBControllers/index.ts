/**
 * Exports all MongoDB controllers that extend BaseMongoController.
 * These controllers provide consistent interfaces and reduce code duplication.
 */

export { BaseMongoController } from './BaseMongoController';
export { CourseController, courseController } from './CourseController';
export { DegreeController, degreeController } from './DegreeController';
export { UserController, userController } from './UserController';
export { TimelineController, timelineController } from './TimelineController';
export { FeedbackController, feedbackController } from './FeedbackController';
export { AdminController, adminController } from './AdminController';
export { AuthController, authController } from './AuthController';
export {
  CoursePoolController,
  coursePoolController,
} from './CoursePoolController';
export {
  CourseXCPController,
  courseXCPController,
} from './CourseXCPController';
export {
  DegreeXCPController,
  degreeXCPController,
} from './DegreeXCPController';
export {
  RequisiteController,
  requisiteController,
} from './RequisiteController';