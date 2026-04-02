import { createEvent, createJudge, addCriterion, assignJudgeToEvent, submitScore, updateEvent } from "./store";

/**
 * Seeds a sample event with 6 participants, 3 judges, 4 criteria, and all scores.
 * Call once — it writes to localStorage.
 */
export function seedSampleEvent() {
  // 3 Judges
  const judge1 = createJudge({ name: "Sarah Mitchell", email: "sarah@test.com", password: "judge123" });
  const judge2 = createJudge({ name: "David Chen", email: "david@test.com", password: "judge123" });
  const judge3 = createJudge({ name: "Maria Lopez", email: "maria@test.com", password: "judge123" });

  // Event
  const event = createEvent({
    name: "Annual Talent Showcase 2026",
    description: "A grand talent competition featuring singers, dancers, and performers from across the region.",
    startDate: "2026-04-05",
    endDate: "2026-04-05",
  });

  // 4 Criteria
  const c1 = addCriterion(event.id, { name: "Creativity", maxScore: 25 })!;
  const c2 = addCriterion(event.id, { name: "Technical Skill", maxScore: 25 })!;
  const c3 = addCriterion(event.id, { name: "Stage Presence", maxScore: 25 })!;
  const c4 = addCriterion(event.id, { name: "Overall Impact", maxScore: 25 })!;

  // 6 Participants (inline on the event)
  const participants = [
    { id: "p1", name: "Alex Rivera" },
    { id: "p2", name: "Jordan Blake" },
    { id: "p3", name: "Priya Sharma" },
    { id: "p4", name: "Luca Moretti" },
    { id: "p5", name: "Chloe Nakamura" },
    { id: "p6", name: "Marcus Johnson" },
  ];

  updateEvent(event.id, { participants });

  // Assign judges
  assignJudgeToEvent(event.id, judge1.id);
  assignJudgeToEvent(event.id, judge2.id);
  assignJudgeToEvent(event.id, judge3.id);

  // Score matrix: [participant][judge] → { c1, c2, c3, c4 }
  // Designed so final ranking: Priya(255) > Chloe(245) > Alex(232) > Marcus(222) > Luca(210) > Jordan(198)
  const scoreData: Record<string, Record<string, Record<string, number>>> = {
    p1: { // Alex Rivera — total ~232
      [judge1.id]: { [c1.id]: 22, [c2.id]: 20, [c3.id]: 21, [c4.id]: 19 }, // 82
      [judge2.id]: { [c1.id]: 19, [c2.id]: 21, [c3.id]: 18, [c4.id]: 20 }, // 78
      [judge3.id]: { [c1.id]: 18, [c2.id]: 19, [c3.id]: 17, [c4.id]: 18 }, // 72
    },
    p2: { // Jordan Blake — total ~198
      [judge1.id]: { [c1.id]: 17, [c2.id]: 16, [c3.id]: 18, [c4.id]: 15 }, // 66
      [judge2.id]: { [c1.id]: 18, [c2.id]: 17, [c3.id]: 16, [c4.id]: 17 }, // 68
      [judge3.id]: { [c1.id]: 16, [c2.id]: 15, [c3.id]: 17, [c4.id]: 16 }, // 64
    },
    p3: { // Priya Sharma — total ~255 (WINNER)
      [judge1.id]: { [c1.id]: 24, [c2.id]: 23, [c3.id]: 22, [c4.id]: 23 }, // 92
      [judge2.id]: { [c1.id]: 22, [c2.id]: 21, [c3.id]: 23, [c4.id]: 20 }, // 86
      [judge3.id]: { [c1.id]: 20, [c2.id]: 19, [c3.id]: 18, [c4.id]: 20 }, // 77
    },
    p4: { // Luca Moretti — total ~210
      [judge1.id]: { [c1.id]: 19, [c2.id]: 18, [c3.id]: 20, [c4.id]: 17 }, // 74
      [judge2.id]: { [c1.id]: 17, [c2.id]: 19, [c3.id]: 16, [c4.id]: 18 }, // 70
      [judge3.id]: { [c1.id]: 16, [c2.id]: 17, [c3.id]: 16, [c4.id]: 17 }, // 66
    },
    p5: { // Chloe Nakamura — total ~245
      [judge1.id]: { [c1.id]: 23, [c2.id]: 22, [c3.id]: 21, [c4.id]: 22 }, // 88
      [judge2.id]: { [c1.id]: 21, [c2.id]: 20, [c3.id]: 22, [c4.id]: 19 }, // 82
      [judge3.id]: { [c1.id]: 19, [c2.id]: 20, [c3.id]: 18, [c4.id]: 18 }, // 75
    },
    p6: { // Marcus Johnson — total ~222
      [judge1.id]: { [c1.id]: 20, [c2.id]: 19, [c3.id]: 19, [c4.id]: 18 }, // 76
      [judge2.id]: { [c1.id]: 18, [c2.id]: 20, [c3.id]: 17, [c4.id]: 19 }, // 74
      [judge3.id]: { [c1.id]: 17, [c2.id]: 18, [c3.id]: 19, [c4.id]: 18 }, // 72
    },
  };

  // Submit all scores
  for (const [pid, judges] of Object.entries(scoreData)) {
    for (const [jid, scores] of Object.entries(judges)) {
      submitScore({
        eventId: event.id,
        judgeId: jid,
        participantId: pid,
        scores,
      });
    }
  }

  return event;
}
