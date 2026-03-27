export interface AdminStats {
  totalUsers: number;
  totalTimelines: number;
  totalDegrees: number;
  totalCourses: number;
  usersByRole: {
    student: number;
    admin: number;
  };
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
