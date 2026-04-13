import express from 'express';
import request from 'supertest';

import coopvalidationRouter from '../routes/coopvalidationRoutes';
import { getJobResult } from '../lib/cache';
import { validateCoopTimeline } from '../services/coop/coopvalidationService';
import { buildFilledCoopSequenceForm } from '../services/coop/coopFormService';
import { errorHandler } from '@middleware/errorHandler';

jest.mock('../lib/cache', () => ({
  getJobResult: jest.fn(),
}));

jest.mock('../services/coop/coopvalidationService', () => ({
  validateCoopTimeline: jest.fn(),
}));

jest.mock('../services/coop/coopFormService', () => ({
  buildFilledCoopSequenceForm: jest.fn(),
}));

describe('coopvalidationRoutes', () => {
  const app = express();
  app.use(express.json());
  app.use('/coop', coopvalidationRouter);
  app.use(errorHandler); // Use the error handling middleware

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /coop/validate/:jobId returns validation payload', async () => {
    (getJobResult as jest.Mock).mockResolvedValue({
      payload: {
        status: 'done',
        data: { semesters: [] },
      },
    });

    (validateCoopTimeline as jest.Mock).mockReturnValue({
      valid: true,
      errors: [],
      warnings: [],
      metadata: {
        totalTerms: 0,
        studyTerms: 0,
        workTerms: 0,
      },
    });

    const response = await request(app).get('/coop/validate/job-123');

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(getJobResult).toHaveBeenCalledWith('job-123');
    expect(validateCoopTimeline).toHaveBeenCalledWith({ semesters: [] });
  });

  it('GET /coop/validate/:jobId returns 404 when cache miss occurs', async () => {
    (getJobResult as jest.Mock).mockResolvedValue(null);

    const response = await request(app).get('/coop/validate/job-404');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: "NotFoundError", message: 'Timeline not found in cache' });
  });

  it('GET /coop/form/:jobId returns a PDF attachment and notes header', async () => {
    (getJobResult as jest.Mock).mockResolvedValue({
      payload: {
        status: 'done',
        data: { semesters: [] },
      },
    });

    (buildFilledCoopSequenceForm as jest.Mock).mockResolvedValue({
      pdfBytes: new Uint8Array([37, 80, 68, 70]), // %PDF
      notes: ['Overflow note'],
    });

    const response = await request(app).get('/coop/form/job-777');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(
      'sequence-change-request-job-777.pdf',
    );

    const notesHeader = response.headers['x-coop-form-notes'];
    expect(notesHeader).toBeDefined();
    expect(decodeURIComponent(notesHeader)).toContain('Overflow note');
    expect(buildFilledCoopSequenceForm).toHaveBeenCalledWith({ semesters: [] });
  });

  it('GET /coop/form/:jobId returns 404 when cached timeline is unavailable', async () => {
    (getJobResult as jest.Mock).mockResolvedValue(null);

    const response = await request(app).get('/coop/form/job-404');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: "NotFoundError", message:  'Timeline not found in cache' });
  });

  it('GET /coop/form/:jobId returns 500 when PDF generation fails', async () => {
    (getJobResult as jest.Mock).mockResolvedValue({
      payload: {
        status: 'done',
        data: { semesters: [] },
      },
    });

    (buildFilledCoopSequenceForm as jest.Mock).mockRejectedValue(
      new Error('pdf failed'),
    );

    const response = await request(app).get('/coop/form/job-500');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({ error: 'InternalServerError' });
  });
});
