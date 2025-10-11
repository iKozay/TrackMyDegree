jest.mock('../dist/controllers/timelineController/timelineController', () => ({
  __esModule: true,
  default: {
    saveTimeline: jest.fn(),
    removeUserTimeline: jest.fn(),
    getTimelinesByUser: jest.fn(),
  },
}));

import request from 'supertest';
import express from 'express';
import router from '../dist/routes/timeline';
import timelineController from '../dist/controllers/timelineController/timelineController';
import { validMockTimeline } from './__mocks__/timeline_mocks';

const app = express();
app.use(express.json());
app.use('/timeline', router);
