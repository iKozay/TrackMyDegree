const mongoControllers = require('..controllers/mondoDBControllers/index');

describe('MongoDB Controllers Index', () => {
  it('should export all controller classes', () => {
    expect(mongoControllers.BaseMongoController).toBeDefined();
    expect(mongoControllers.CourseController).toBeDefined();
    expect(mongoControllers.DegreeController).toBeDefined();
    expect(mongoControllers.UserController).toBeDefined();
    expect(mongoControllers.TimelineController).toBeDefined();
    expect(mongoControllers.FeedbackController).toBeDefined();
    expect(mongoControllers.AdminController).toBeDefined();
    expect(mongoControllers.AuthController).toBeDefined();
  });

  it('should export all controller instances', () => {
    expect(mongoControllers.courseController).toBeDefined();
    expect(mongoControllers.degreeController).toBeDefined();
    expect(mongoControllers.userController).toBeDefined();
    expect(mongoControllers.timelineController).toBeDefined();
    expect(mongoControllers.feedbackController).toBeDefined();
    expect(mongoControllers.adminController).toBeDefined();
    expect(mongoControllers.authController).toBeDefined();
  });

  it('should export UserType enum', () => {
    expect(mongoControllers.UserType).toBeDefined();
    expect(mongoControllers.UserType.STUDENT).toBe('student');
    expect(mongoControllers.UserType.ADVISOR).toBe('advisor');
    expect(mongoControllers.UserType.ADMIN).toBe('admin');
  });

  it('should export all type definitions', () => {
    // Test that type definitions are exported (they won't exist at runtime in JS)
    // but we can verify the module structure
    expect(typeof mongoControllers.BaseMongoController).toBe('function');
    expect(typeof mongoControllers.CourseController).toBe('function');
    expect(typeof mongoControllers.DegreeController).toBe('function');
    expect(typeof mongoControllers.UserController).toBe('function');
    expect(typeof mongoControllers.TimelineController).toBe('function');
    expect(typeof mongoControllers.FeedbackController).toBe('function');
    expect(typeof mongoControllers.AdminController).toBe('function');
    expect(typeof mongoControllers.AuthController).toBe('function');
  });

  it('should export controller instances as objects', () => {
    expect(typeof mongoControllers.courseController).toBe('object');
    expect(typeof mongoControllers.degreeController).toBe('object');
    expect(typeof mongoControllers.userController).toBe('object');
    expect(typeof mongoControllers.timelineController).toBe('object');
    expect(typeof mongoControllers.feedbackController).toBe('object');
    expect(typeof mongoControllers.adminController).toBe('object');
    expect(typeof mongoControllers.authController).toBe('object');
  });
});
