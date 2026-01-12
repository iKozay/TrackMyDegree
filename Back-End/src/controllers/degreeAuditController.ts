import * as Sentry from '@sentry/node';
import {
  generateDegreeAudit,
  generateDegreeAuditForUser,
} from '@services/audit/degreeAuditService';
import { DegreeAuditData, GenerateAuditParams } from '@shared/audit';

export class DegreeAuditController {
  private handleError(error: unknown, operation: string): never {
    Sentry.captureException(error, {
      tags: {
        model: 'DegreeAudit',
        operation,
      },
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DegreeAudit] Error in ${operation}:`, errorMessage);
    throw error;
  }

  /**
   * Generate a degree audit for a specific timeline
   */
  async getAuditByTimeline(
    timelineId: string,
    userId: string,
  ): Promise<DegreeAuditData> {
    try {
      const params: GenerateAuditParams = {
        timelineId,
        userId,
      };
      return await generateDegreeAudit(params);
    } catch (error) {
      this.handleError(error, 'getAuditByTimeline');
    }
  }

  /**
   * Generate a degree audit for the user's most recent timeline
   */
  async getAuditForUser(userId: string): Promise<DegreeAuditData> {
    try {
      return await generateDegreeAuditForUser(userId);
    } catch (error) {
      this.handleError(error, 'getAuditForUser');
    }
  }
}

export const degreeAuditController = new DegreeAuditController();
