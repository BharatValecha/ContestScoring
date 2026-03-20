export interface AppEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  criteria: Criterion[];
  participantIds: string[];
  judgeIds: string[];
  resultsRevealed: boolean;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
}

export interface Judge {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface Criterion {
  id: string;
  name: string;
  maxScore: number;
}

export interface Score {
  id: string;
  eventId: string;
  judgeId: string;
  participantId: string;
  scores: Record<string, number>; // criterionId -> score
  comment?: string;
  submittedAt: string;
}

export interface AppData {
  events: AppEvent[];
  participants: Participant[];
  judges: Judge[];
  scores: Score[];
}

export type UserRole = "admin" | "judge";

export interface AuthUser {
  role: UserRole;
  judgeId?: string;
  name: string;
}
