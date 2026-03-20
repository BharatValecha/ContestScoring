import { AppData, AppEvent, Participant, Judge, Score, Criterion } from "./types";

const STORAGE_KEY = "contest-scoring-data";

const defaultData: AppData = {
  events: [],
  participants: [],
  judges: [],
  scores: [],
};

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { ...defaultData };
  } catch {
    return { ...defaultData };
  }
}

function save(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Events
export function getEvents(): AppEvent[] {
  return load().events;
}

export function getEvent(id: string): AppEvent | undefined {
  return load().events.find((e) => e.id === id);
}

export function createEvent(event: Omit<AppEvent, "id" | "resultsRevealed" | "criteria" | "participantIds" | "judgeIds">): AppEvent {
  const data = load();
  const newEvent: AppEvent = {
    ...event,
    id: genId(),
    criteria: [],
    participantIds: [],
    judgeIds: [],
    resultsRevealed: false,
  };
  data.events.push(newEvent);
  save(data);
  return newEvent;
}

export function updateEvent(id: string, updates: Partial<AppEvent>): AppEvent | undefined {
  const data = load();
  const idx = data.events.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  data.events[idx] = { ...data.events[idx], ...updates };
  save(data);
  return data.events[idx];
}

export function deleteEvent(id: string) {
  const data = load();
  data.events = data.events.filter((e) => e.id !== id);
  data.scores = data.scores.filter((s) => s.eventId !== id);
  save(data);
}

// Participants
export function getParticipants(): Participant[] {
  return load().participants;
}

export function createParticipant(p: Omit<Participant, "id">): Participant {
  const data = load();
  const newP: Participant = { ...p, id: genId() };
  data.participants.push(newP);
  save(data);
  return newP;
}

export function updateParticipant(id: string, updates: Partial<Participant>) {
  const data = load();
  const idx = data.participants.findIndex((p) => p.id === id);
  if (idx === -1) return;
  data.participants[idx] = { ...data.participants[idx], ...updates };
  save(data);
}

export function deleteParticipant(id: string) {
  const data = load();
  data.participants = data.participants.filter((p) => p.id !== id);
  data.events.forEach((e) => {
    e.participantIds = e.participantIds.filter((pid) => pid !== id);
  });
  data.scores = data.scores.filter((s) => s.participantId !== id);
  save(data);
}

// Judges
export function getJudges(): Judge[] {
  return load().judges;
}

export function createJudge(j: Omit<Judge, "id">): Judge {
  const data = load();
  const newJ: Judge = { ...j, id: genId() };
  data.judges.push(newJ);
  save(data);
  return newJ;
}

export function updateJudge(id: string, updates: Partial<Judge>) {
  const data = load();
  const idx = data.judges.findIndex((j) => j.id === id);
  if (idx === -1) return;
  data.judges[idx] = { ...data.judges[idx], ...updates };
  save(data);
}

export function deleteJudge(id: string) {
  const data = load();
  data.judges = data.judges.filter((j) => j.id !== id);
  data.events.forEach((e) => {
    e.judgeIds = e.judgeIds.filter((jid) => jid !== id);
  });
  data.scores = data.scores.filter((s) => s.judgeId !== id);
  save(data);
}

export function authenticateJudge(email: string, password: string): Judge | undefined {
  return load().judges.find((j) => j.email === email && j.password === password);
}

// Criteria (per event)
export function addCriterion(eventId: string, criterion: Omit<Criterion, "id">): Criterion | undefined {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return undefined;
  const c: Criterion = { ...criterion, id: genId() };
  event.criteria.push(c);
  save(data);
  return c;
}

export function removeCriterion(eventId: string, criterionId: string) {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return;
  event.criteria = event.criteria.filter((c) => c.id !== criterionId);
  save(data);
}

// Scores
export function getScores(eventId: string): Score[] {
  return load().scores.filter((s) => s.eventId === eventId);
}

export function getScoreByJudgeAndParticipant(eventId: string, judgeId: string, participantId: string): Score | undefined {
  return load().scores.find(
    (s) => s.eventId === eventId && s.judgeId === judgeId && s.participantId === participantId
  );
}

export function submitScore(score: Omit<Score, "id" | "submittedAt">): Score {
  const data = load();
  const existing = data.scores.findIndex(
    (s) => s.eventId === score.eventId && s.judgeId === score.judgeId && s.participantId === score.participantId
  );
  const newScore: Score = { ...score, id: genId(), submittedAt: new Date().toISOString() };
  if (existing !== -1) {
    data.scores[existing] = newScore;
  } else {
    data.scores.push(newScore);
  }
  save(data);
  return newScore;
}

// Event participant/judge assignment
export function assignParticipantToEvent(eventId: string, participantId: string) {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event || event.participantIds.includes(participantId)) return;
  event.participantIds.push(participantId);
  save(data);
}

export function removeParticipantFromEvent(eventId: string, participantId: string) {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return;
  event.participantIds = event.participantIds.filter((id) => id !== participantId);
  save(data);
}

export function assignJudgeToEvent(eventId: string, judgeId: string) {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event || event.judgeIds.includes(judgeId)) return;
  event.judgeIds.push(judgeId);
  save(data);
}

export function removeJudgeFromEvent(eventId: string, judgeId: string) {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return;
  event.judgeIds = event.judgeIds.filter((id) => id !== judgeId);
  save(data);
}

// Results calculation
export interface ParticipantResult {
  participantId: string;
  participantName: string;
  totalScore: number;
  maxPossible: number;
  judgeBreakdown: {
    judgeId: string;
    judgeName: string;
    scores: Record<string, number>;
    total: number;
  }[];
  categoryTotals: Record<string, number>;
}

export function calculateResults(eventId: string): ParticipantResult[] {
  const data = load();
  const event = data.events.find((e) => e.id === eventId);
  if (!event) return [];

  const eventScores = data.scores.filter((s) => s.eventId === eventId);
  const maxPerJudge = event.criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const maxPossible = maxPerJudge * event.judgeIds.length;

  return event.participantIds
    .map((pid) => {
      const participant = data.participants.find((p) => p.id === pid);
      if (!participant) return null;

      const pScores = eventScores.filter((s) => s.participantId === pid);
      const judgeBreakdown = pScores.map((s) => {
        const judge = data.judges.find((j) => j.id === s.judgeId);
        const total = Object.values(s.scores).reduce((a, b) => a + b, 0);
        return {
          judgeId: s.judgeId,
          judgeName: judge?.name || "Unknown",
          scores: s.scores,
          total,
        };
      });

      const totalScore = judgeBreakdown.reduce((sum, jb) => sum + jb.total, 0);

      const categoryTotals: Record<string, number> = {};
      event.criteria.forEach((c) => {
        categoryTotals[c.id] = pScores.reduce((sum, s) => sum + (s.scores[c.id] || 0), 0);
      });

      return {
        participantId: pid,
        participantName: participant.name,
        totalScore,
        maxPossible,
        judgeBreakdown,
        categoryTotals,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b!.totalScore - a!.totalScore) as ParticipantResult[];
}
