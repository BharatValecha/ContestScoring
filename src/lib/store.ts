import { AppData, AppEvent, Participant, Judge, Score, Criterion } from "./types";

const STORAGE_KEY = "contest-scoring-data";

const defaultData: AppData = {
  events: [],
  judges: [],
  scores: [],
};

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultData };
    const data = JSON.parse(raw) as AppData;
    // Migration: convert old participantIds to participants array
    data.events = data.events.map((e: any) => {
      if (!e.participants && e.participantIds) {
        // Old format had global participants; migrate by creating inline entries
        const oldParticipants = (data as any).participants || [];
        e.participants = (e.participantIds as string[])
          .map((pid: string) => oldParticipants.find((p: any) => p.id === pid))
          .filter(Boolean);
      }
      if (!e.participants) e.participants = [];
      return e;
    });
    return data;
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

export function createEvent(event: Omit<AppEvent, "id" | "resultsRevealed" | "criteria" | "participants" | "judgeIds">): AppEvent {
  const data = load();
  const newEvent: AppEvent = {
    ...event,
    id: genId(),
    criteria: [],
    participants: [],
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

// Event judge assignment
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

  return (event.participants || [])
    .map((participant) => {
      const pid = participant.id;
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
    .sort((a, b) => b.totalScore - a.totalScore);
}
