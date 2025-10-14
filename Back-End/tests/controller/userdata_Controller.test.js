const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const { User } = require('../../dist/models/User');
const { Degree } = require('../../dist/models/Degree');
const { Timeline } = require('../../dist/models/Timeline');
const getUserData = require('../../dist/controllers/userDataController/userDataController_mongo').default;
describe('UserDataController', () => {
  let mongoServer;
  let app;
  let testUserId;
  let testDegreeId;
  let testTimelineId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.post('/user-data', getUserData);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Degree.deleteMany({});
    await Timeline.deleteMany({});

    // Create test degree
    const testDegree = new Degree({
      _id: 'test-degree-1',
      name: 'Computer Science',
      totalCredits: 120,
      isAddon: false,
      coursePools: [
        {
          id: 'pool-1',
          name: 'Core Courses',
          creditsRequired: 60,
          courses: ['CS101', 'CS102']
        }
      ]
    });
    await testDegree.save();
    testDegreeId = 'test-degree-1';

    // Create test user
    const testUser = new User({
      _id: 'test-user-1',
      email: 'test@example.com',
      password: 'hashedpassword',
      fullname: 'Test User',
      degree: testDegreeId,
      type: 'student',
      deficiencies: [
        {
          coursepool: 'pool-1',
          creditsRequired: 12
        },
        {
          coursepool: 'pool-2',
          creditsRequired: 6
        }
      ],
      exemptions: ['CS101', 'MATH101']
    });
    await testUser.save();
    testUserId = 'test-user-1';

    // Create test timeline
    const testTimeline = new Timeline({
      _id: 'test-timeline-1',
      userId: testUserId,
      degreeId: testDegreeId,
      name: 'My Timeline',
      isExtendedCredit: false,
      last_modified: new Date(),
      items: [
        {
          id: 'item-1',
          season: 'fall',
          year: 2024,
          courses: ['CS101', 'MATH101']
        },
        {
          id: 'item-2',
          season: 'winter',
          year: 2025,
          courses: ['CS102']
        }
      ]
    });
    await testTimeline.save();
    testTimelineId = 'test-timeline-1';
  });

  describe('getUserData', () => {
    it('should successfully fetch complete user data', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body).toHaveProperty('deficiencies');
      expect(response.body).toHaveProperty('exemptions');
      expect(response.body).toHaveProperty('degree');

      // Verify user data
      expect(response.body.user.id).toBe(testUserId);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.fullname).toBe('Test User');
      expect(response.body.user.type).toBe('student');
      expect(response.body.user.degree).toBe(testDegreeId);
    });

    it('should return flattened timeline entries', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveLength(3); // 2 courses in fall + 1 in winter

      // Verify timeline structure
      const fallCourses = response.body.timeline.filter(t => t.season === 'fall' && t.year === 2024);
      expect(fallCourses).toHaveLength(2);
      expect(fallCourses.map(t => t.coursecode)).toContain('CS101');
      expect(fallCourses.map(t => t.coursecode)).toContain('MATH101');

      const winterCourses = response.body.timeline.filter(t => t.season === 'winter' && t.year === 2025);
      expect(winterCourses).toHaveLength(1);
      expect(winterCourses[0].coursecode).toBe('CS102');
    });

    it('should return deficiencies from user document', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.deficiencies).toHaveLength(2);
      
      const deficiency1 = response.body.deficiencies.find(d => d.coursepool === 'pool-1');
      expect(deficiency1).toBeDefined();
      expect(deficiency1.creditsRequired).toBe(12);

      const deficiency2 = response.body.deficiencies.find(d => d.coursepool === 'pool-2');
      expect(deficiency2).toBeDefined();
      expect(deficiency2.creditsRequired).toBe(6);
    });

    it('should return exemptions from user document', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.exemptions).toHaveLength(2);
      
      const coursecodes = response.body.exemptions.map(e => e.coursecode);
      expect(coursecodes).toContain('CS101');
      expect(coursecodes).toContain('MATH101');
    });

    it('should return degree information when user has a degree', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      expect(response.body.degree).not.toBeNull();
      expect(response.body.degree.id).toBe(testDegreeId);
      expect(response.body.degree.name).toBe('Computer Science');
      expect(response.body.degree.totalCredits).toBe(120);
    });

    it('should return null degree when user has no degree assigned', async () => {
      // Create user without degree
      const userWithoutDegree = new User({
        _id: 'user-no-degree',
        email: 'nodegree@example.com',
        password: 'hashedpassword',
        fullname: 'No Degree User',
        type: 'student',
        deficiencies: [],
        exemptions: []
      });
      await userWithoutDegree.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: 'user-no-degree' });

      expect(response.status).toBe(200);
      expect(response.body.degree).toBeNull();
      expect(response.body.user.degree).toBeNull();
    });

    it('should return empty timeline when user has no timelines', async () => {
      // Create user without timeline
      const userWithoutTimeline = new User({
        _id: 'user-no-timeline',
        email: 'notimeline@example.com',
        password: 'hashedpassword',
        fullname: 'No Timeline User',
        degree: testDegreeId,
        type: 'student',
        deficiencies: [],
        exemptions: []
      });
      await userWithoutTimeline.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: 'user-no-timeline' });

      expect(response.status).toBe(200);
      expect(response.body.timeline).toHaveLength(0);
    });

    it('should return empty deficiencies array when user has none', async () => {
      // Create user without deficiencies
      const userNoDeficiencies = new User({
        _id: 'user-no-def',
        email: 'nodef@example.com',
        password: 'hashedpassword',
        fullname: 'No Deficiencies User',
        degree: testDegreeId,
        type: 'student',
        deficiencies: [],
        exemptions: []
      });
      await userNoDeficiencies.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: 'user-no-def' });

      expect(response.status).toBe(200);
      expect(response.body.deficiencies).toHaveLength(0);
    });

    it('should return empty exemptions array when user has none', async () => {
      // Create user without exemptions
      const userNoExemptions = new User({
        _id: 'user-no-exempt',
        email: 'noexempt@example.com',
        password: 'hashedpassword',
        fullname: 'No Exemptions User',
        degree: testDegreeId,
        type: 'student',
        deficiencies: [],
        exemptions: []
      });
      await userNoExemptions.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: 'user-no-exempt' });

      expect(response.status).toBe(200);
      expect(response.body.exemptions).toHaveLength(0);
    });

    it('should return 400 when user ID is not provided', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User ID is required');
    });

    it('should return 404 when user does not exist', async () => {
      const response = await request(app)
        .post('/user-data')
        .send({ id: 'non-existent-user' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle multiple timelines for the same user', async () => {
      // Create additional timeline for the same user
      const additionalTimeline = new Timeline({
        _id: 'test-timeline-2',
        userId: testUserId,
        degreeId: testDegreeId,
        name: 'Alternative Timeline',
        isExtendedCredit: true,
        last_modified: new Date(),
        items: [
          {
            id: 'item-3',
            season: 'summer',
            year: 2024,
            courses: ['CS103']
          }
        ]
      });
      await additionalTimeline.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      // Should have 4 timeline entries: 3 from first timeline + 1 from second
      expect(response.body.timeline).toHaveLength(4);
      
      const summerCourse = response.body.timeline.find(t => t.season === 'summer' && t.coursecode === 'CS103');
      expect(summerCourse).toBeDefined();
    });

    it('should handle timeline items with no courses', async () => {
      // Create timeline with empty courses
      const emptyTimeline = new Timeline({
        _id: 'empty-timeline',
        userId: testUserId,
        degreeId: testDegreeId,
        name: 'Empty Timeline',
        isExtendedCredit: false,
        last_modified: new Date(),
        items: [
          {
            id: 'empty-item',
            season: 'fall',
            year: 2024,
            courses: []
          }
        ]
      });
      await emptyTimeline.save();

      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(200);
      // Should still have 3 entries from the original timeline (empty item adds 0)
      expect(response.body.timeline).toHaveLength(3);
    });

    it('should return 500 when database error occurs', async () => {
      // Force a database error by disconnecting
      await mongoose.disconnect();

      const response = await request(app)
        .post('/user-data')
        .send({ id: testUserId });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });
  });
});