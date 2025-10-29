export interface TranscriptData {
  term: string;
  courses: string[];
  grade: string;
}

export interface ProcessedData {
  timelineData: TranscriptData[];
  degreeId: string;
  isExtendedCredit: boolean;
  creditsRequired?: string[];
}

export interface TimelineNavigationState {
  coOp?: boolean;
  credits_Required?: number;
  extendedCredit?: boolean;
  creditDeficiency?: boolean;
}