export interface AdminStats {
  totalUsers: number;
  totalTimelines: number;
  totalDegrees: number;
  totalCourses: number;
  usersByRole: {
    student: number;
    admin: number;
    advisor: number;
  };
}

export interface CollectionInfo {
  name: string;
  count: number;
}

export interface SeedResult {
  success: boolean;
  message: string;
  degreesSeeded?: number;
  coursesSeeded?: number;
}

export interface DbConnectionStatus {
  connected: boolean;
  message?: string;
}
