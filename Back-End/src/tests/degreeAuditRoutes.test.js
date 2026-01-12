const { Types } = require('mongoose');
const request = require('supertest');
const express = require('express');
const { json } = express;
const degreeAuditRoutes = require('../routes/degreeAuditRoutes');
const { degreeAuditController } = require('@controllers/degreeAuditController');

const app = express();
app.use(json());
app.use('/audit', degreeAuditRoutes);

jest.mock('../controllers/degreeAuditController', () => ({
  degreeAuditController: {
    getAuditByTimeline: jest.fn(),
    getAuditForUser: jest.fn(),
  },
}));

describe('Degree Audit Routes', () => {
  const mockAuditData = {
    student: {
      name: 'Test Student',
      program: 'Bachelor of Computer Science',
      admissionTerm: 'Fall 2022',
      expectedGraduation: 'Spring 2026',
    },
    progress: {
      completed: 60,
      inProgress: 15,
      remaining: 45,
      total: 120,
      percentage: 50,
    },
    notices: [
      { id: 'notice-1', type: 'info', message: 'On track for graduation' },
    ],
    requirements: [
      {
        id: 'req-1',
        title: 'Core CS',
        status: 'In Progress',
        creditsCompleted: 15,
        creditsTotal: 24,
        courses: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /audit/timeline/:timelineId', () => {
    const validTimelineId = new Types.ObjectId().toString();
    const validUserId = new Types.ObjectId().toString();

    it('should return audit data for valid timeline and user', async () => {
      degreeAuditController.getAuditByTimeline.mockResolvedValue(mockAuditData);

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(200);

      expect(response.body).toEqual(mockAuditData);
      expect(degreeAuditController.getAuditByTimeline).toHaveBeenCalledWith(
        validTimelineId,
        validUserId,
      );
    });

    it('should return 400 for invalid timeline ID', async () => {
      const response = await request(app)
        .get('/audit/timeline/invalid-id')
        .query({ userId: validUserId })
        .expect(400);

      expect(response.body.error).toContain('Invalid id format');
      expect(response.body.error).toContain('timelineId');
    });

    it('should return 400 for missing user ID', async () => {
      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .expect(400);

      expect(response.body.error).toBe(
        'User ID is required as a query parameter',
      );
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: 'invalid-user-id' })
        .expect(400);

      expect(response.body.error).toContain('Invalid id format');
      expect(response.body.error).toContain('userId');
    });

    it('should return 404 when timeline is not found', async () => {
      degreeAuditController.getAuditByTimeline.mockRejectedValue(
        new Error('Timeline not found'),
      );

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(404);

      expect(response.body.error).toBe('Timeline not found');
    });

    it('should return 401 when user is not authorized', async () => {
      degreeAuditController.getAuditByTimeline.mockRejectedValue(
        new Error('Unauthorized: Timeline does not belong to this user'),
      );

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(401);

      expect(response.body.error).toBe(
        'Unauthorized: Timeline does not belong to this user',
      );
    });

    it('should return 500 for internal server errors', async () => {
      degreeAuditController.getAuditByTimeline.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 500 for non-Error exceptions', async () => {
      degreeAuditController.getAuditByTimeline.mockRejectedValue(
        'Unknown error',
      );

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 404 for user not found errors', async () => {
      degreeAuditController.getAuditByTimeline.mockRejectedValue(
        new Error('User not found'),
      );

      const response = await request(app)
        .get(`/audit/timeline/${validTimelineId}`)
        .query({ userId: validUserId })
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /audit/user/:userId', () => {
    const validUserId = new Types.ObjectId().toString();

    it('should return audit data for valid user', async () => {
      degreeAuditController.getAuditForUser.mockResolvedValue(mockAuditData);

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(200);

      expect(response.body).toEqual(mockAuditData);
      expect(degreeAuditController.getAuditForUser).toHaveBeenCalledWith(
        validUserId,
      );
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/audit/user/invalid-id')
        .expect(400);

      expect(response.body.error).toContain('Invalid id format');
      expect(response.body.error).toContain('userId');
    });

    it('should return 404 when no timeline found for user', async () => {
      degreeAuditController.getAuditForUser.mockRejectedValue(
        new Error('No timeline found for this user'),
      );

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(404);

      expect(response.body.error).toBe('No timeline found for this user');
    });

    it('should return 404 when user is not found', async () => {
      degreeAuditController.getAuditForUser.mockRejectedValue(
        new Error('User not found'),
      );

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should return 500 for internal server errors', async () => {
      degreeAuditController.getAuditForUser.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 500 for non-Error exceptions', async () => {
      degreeAuditController.getAuditForUser.mockRejectedValue({ code: 'ERR' });

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle empty user ID path parameter', async () => {
      // This tests empty path - should 404 as route doesn't match
      const response = await request(app).get('/audit/user/').expect(404);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent requests', async () => {
      const validUserId1 = new Types.ObjectId().toString();
      const validUserId2 = new Types.ObjectId().toString();

      degreeAuditController.getAuditForUser
        .mockResolvedValueOnce(mockAuditData)
        .mockResolvedValueOnce({
          ...mockAuditData,
          student: { ...mockAuditData.student, name: 'Test Student 2' },
        });

      const [response1, response2] = await Promise.all([
        request(app).get(`/audit/user/${validUserId1}`),
        request(app).get(`/audit/user/${validUserId2}`),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it('should handle special characters in error messages', async () => {
      const validUserId = new Types.ObjectId().toString();
      degreeAuditController.getAuditForUser.mockRejectedValue(
        new Error('Error with <special> "characters" & symbols'),
      );

      const response = await request(app)
        .get(`/audit/user/${validUserId}`)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });
});
