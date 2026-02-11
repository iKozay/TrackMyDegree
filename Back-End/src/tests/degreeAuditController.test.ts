import * as Sentry from '@sentry/node';
import { DegreeAuditController } from '@controllers/degreeAuditController';
import * as degreeAuditService from '../services/audit/degreeAuditService';
import * as cache from '../lib/cache'; // wherever redisClient.get is exported

jest.mock('../lib/cache', () => ({
  getJobResult: jest.fn(),
  resultKey: jest.fn((jobId) => `job:${jobId}`),
}));
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

jest.mock('../services/audit/degreeAuditService', () => ({
  generateDegreeAudit: jest.fn(),
  generateDegreeAuditForUser: jest.fn(),
  generateDegreeAuditFromTimeline: jest.fn(),
}));

describe('DegreeAuditController', () => {
  let controller: DegreeAuditController;

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
      {
        id: 'notice-1',
        type: 'info' as const,
        message: 'On track for graduation',
      },
    ],
    requirements: [
      {
        id: 'req-1',
        title: 'Core CS',
        status: 'In Progress' as const,
        creditsCompleted: 15,
        creditsTotal: 24,
        courses: [],
      },
    ],
  };

  beforeEach(() => {
    controller = new DegreeAuditController();
    jest.clearAllMocks();
  });

  describe('getAuditByTimeline', () => {
    it('should return audit data for valid timeline and user', async () => {
      (degreeAuditService.generateDegreeAudit as jest.Mock).mockResolvedValue(
        mockAuditData,
      );

      const result = await controller.getAuditByTimeline(
        'timeline123',
        'user456',
      );

      expect(result).toEqual(mockAuditData);
      expect(degreeAuditService.generateDegreeAudit).toHaveBeenCalledWith({
        timelineId: 'timeline123',
        userId: 'user456',
      });
    });

    it('should handle and rethrow errors', async () => {
      const error = new Error('Timeline not found');
      (degreeAuditService.generateDegreeAudit as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        controller.getAuditByTimeline('timeline123', 'user456'),
      ).rejects.toThrow('Timeline not found');

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          model: 'DegreeAudit',
          operation: 'getAuditByTimeline',
        },
      });
    });

    it('should handle non-Error objects', async () => {
      const errorString = 'Something went wrong';
      (degreeAuditService.generateDegreeAudit as jest.Mock).mockRejectedValue(
        errorString,
      );

      await expect(
        controller.getAuditByTimeline('timeline123', 'user456'),
      ).rejects.toBe(errorString);

      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should log error to console', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');
      (degreeAuditService.generateDegreeAudit as jest.Mock).mockRejectedValue(
        error,
      );

      await expect(
        controller.getAuditByTimeline('timeline123', 'user456'),
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DegreeAudit] Error in getAuditByTimeline:',
        'Database error',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getAuditForUser', () => {
    it('should return audit data for valid user', async () => {
      (
        degreeAuditService.generateDegreeAuditForUser as jest.Mock
      ).mockResolvedValue(mockAuditData);

      const result = await controller.getAuditForUser('user456');

      expect(result).toEqual(mockAuditData);
      expect(
        degreeAuditService.generateDegreeAuditForUser,
      ).toHaveBeenCalledWith('user456');
    });

    it('should handle and rethrow errors', async () => {
      const error = new Error('No timeline found for this user');
      (
        degreeAuditService.generateDegreeAuditForUser as jest.Mock
      ).mockRejectedValue(error);

      await expect(controller.getAuditForUser('user456')).rejects.toThrow(
        'No timeline found for this user',
      );

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          model: 'DegreeAudit',
          operation: 'getAuditForUser',
        },
      });
    });

    it('should handle non-Error objects', async () => {
      const errorObject = { message: 'Unknown error' };
      (
        degreeAuditService.generateDegreeAuditForUser as jest.Mock
      ).mockRejectedValue(errorObject);

      await expect(controller.getAuditForUser('user456')).rejects.toBe(
        errorObject,
      );

      expect(Sentry.captureException).toHaveBeenCalled();
    });

    it('should log error to console with stringified error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorNumber = 404;
      (
        degreeAuditService.generateDegreeAuditForUser as jest.Mock
      ).mockRejectedValue(errorNumber);

      await expect(controller.getAuditForUser('user456')).rejects.toBe(
        errorNumber,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '[DegreeAudit] Error in getAuditForUser:',
        '404',
      );

      consoleSpy.mockRestore();
    });
  });
  describe('getAuditByCachedTimeline', () => {
  const { getJobResult } = require('../lib/cache');

  beforeEach(() => {
    getJobResult.mockReset();
  });

  it('should throw when cached audit not found', async () => {
    getJobResult.mockResolvedValue(null);

    await expect(controller.getAuditByCachedTimeline('job123'))
      .rejects.toThrow('RESULT_EXPIRED'); // matches controller

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('should handle non-Error objects', async () => {
    const cachedTimeline = {
      payload: { data: { degree: {}, pools: [], semesters: [], courses: {} } },
    };
    getJobResult.mockResolvedValue(cachedTimeline);

    const errorString = 'Cache error';
    (degreeAuditService.generateDegreeAuditFromTimeline as jest.Mock)
      .mockRejectedValue(errorString);

    await expect(controller.getAuditByCachedTimeline('job123'))
      .rejects.toBe(errorString);

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('should log error to console', async () => {
    const cachedTimeline = {
      payload: { data: { degree: {}, pools: [], semesters: [], courses: {} } },
    };
    getJobResult.mockResolvedValue(cachedTimeline);

    const error = new Error('Cache failure');
    (degreeAuditService.generateDegreeAuditFromTimeline as jest.Mock)
      .mockRejectedValue(error);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(controller.getAuditByCachedTimeline('job123'))
      .rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      '[DegreeAudit] Error in getAuditByCachedTimelineJob:',
      'Cache failure',
    );

    consoleSpy.mockRestore();
  });

  it('should return audit data for valid jobId', async () => {
    const cachedTimeline = {
      payload: { data: { degree: {}, pools: [], semesters: [], courses: {} } },
    };
    getJobResult.mockResolvedValue(cachedTimeline);

    (degreeAuditService.generateDegreeAuditFromTimeline as jest.Mock)
      .mockResolvedValue(mockAuditData);

    const result = await controller.getAuditByCachedTimeline('job123');

    expect(result).toEqual(mockAuditData);
    expect(getJobResult).toHaveBeenCalledWith('job123');
    expect(degreeAuditService.generateDegreeAuditFromTimeline)
      .toHaveBeenCalledWith(cachedTimeline.payload.data);
  });
});


  describe('handleError', () => {
    it('should capture exception with correct tags', async () => {
      const error = new Error('Test error');
      (degreeAuditService.generateDegreeAudit as jest.Mock).mockRejectedValue(
        error,
      );

      try {
        await controller.getAuditByTimeline('timeline123', 'user456');
      } catch {
        // Expected to throw
      }

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        tags: {
          model: 'DegreeAudit',
          operation: 'getAuditByTimeline',
        },
      });
    });
  });
});
