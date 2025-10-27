const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const TimelineController = require('../dist/controllers/timelineController/timelineController_mongo').default;

describe('TimelineController (MongoDB)', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  let createdTimelineId;

  const testTimeline = {
    user_id: 'user123',
    name: 'Test Timeline',
    degree_id: 'degreeABC',
    items: [
      {
        season: 'fall',
        year: 2025,
        courses: ['COMP479', 'COMP6791'],
      },
    ],
    isExtendedCredit: false,
  };

  it('should save a new timeline', async () => {
    const saved = await TimelineController.saveTimeline(testTimeline);
    expect(saved).toHaveProperty('id');
    expect(saved.user_id).toBe(testTimeline.user_id);
    expect(saved.items.length).toBe(1);
    createdTimelineId = saved.id;
  });

  it('should fetch timelines by user', async () => {
    const timelines = await TimelineController.getTimelinesByUser(testTimeline.user_id);
    expect(timelines.length).toBeGreaterThan(0);
    const fetched = timelines.find((t) => t.id === createdTimelineId);
    expect(fetched).toBeDefined();
    expect(fetched.name).toBe(testTimeline.name);
  });

  it('should delete a timeline', async () => {
    const result = await TimelineController.removeUserTimeline(createdTimelineId);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/deleted successfully/);

    const timelinesAfterDelete = await TimelineController.getTimelinesByUser(testTimeline.user_id);
    const deleted = timelinesAfterDelete.find((t) => t.id === createdTimelineId);
    expect(deleted).toBeUndefined();
  });

  it('should return failure if deleting non-existing timeline', async () => {
    const result = await TimelineController.removeUserTimeline('nonexistentid123');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not found|Error occurred/);
  });
});
