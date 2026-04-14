import {
  generateDegreeAudit,
  generateDegreeAuditForUser,
  generateDegreeAuditFromTimeline,
} from '@services/audit';
import { TimelineResult, DegreeAuditData, GenerateAuditParams } from '@trackmydegree/shared';
import { getJobResult } from '../lib/cache';
import { NotFoundError } from '@utils/errors';

export class DegreeAuditController {

  /**
   * Generate a degree audit for a specific timeline
   */
  async getAuditByTimeline(
    timelineId: string,
    userId: string,
  ): Promise<DegreeAuditData> {
      const params: GenerateAuditParams = {
        timelineId,
        userId,
      };
      return await generateDegreeAudit(params);
  }

  async getAuditByCachedTimeline(
  jobId: string,
): Promise<DegreeAuditData> {
    const cached = await getJobResult<TimelineResult>(jobId);

    if (!cached) {
      throw new NotFoundError('No cached result found for job ID: ' + jobId);
    }

    return generateDegreeAuditFromTimeline(
      cached.payload.data,
    );
}


  /**
   * Generate a degree audit for the user's most recent timeline
   */
  async getAuditForUser(userId: string): Promise<DegreeAuditData> {
      return await generateDegreeAuditForUser(userId);
  }
}

export const degreeAuditController = new DegreeAuditController();
