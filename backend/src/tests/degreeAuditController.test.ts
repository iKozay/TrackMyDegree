/* eslint-disable */
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
  });
  describe('getAuditByCachedTimeline', () => {
  const { getJobResult } = require('../lib/cache');

  beforeEach(() => {
    getJobResult.mockReset();
  });

  it('should throw when cached audit not found', async () => {
    getJobResult.mockResolvedValue(null);

    await expect(controller.getAuditByCachedTimeline('job123'))
      .rejects.toThrow('No cached result found for job ID: job123'); 
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
});
