import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent, calculateResults, getJudges } from "@/lib/store";
import { ParticipantResult } from "@/lib/store";
import { AppEvent, Judge } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";

/* ── Animated counter ── */
function CountUp({ end, duration = 1.2 }: { end: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setVal(end);
        clearInterval(timer);
      } else {
        setVal(Math.round(start * 10) / 10);
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span className="tabular-nums">{val.toFixed(val % 1 === 0 ? 0 : 1)}</span>;
}

/* ── Types ── */
type Phase = "loading" | "participant-reveal" | "leaderboard";

const rankStyles: Record<number, string> = {
  0: "border-gold bg-gold/5 shadow-[0_0_24px_4px_hsl(var(--gold)/0.2)]",
  1: "border-silver bg-silver/5 shadow-[0_0_16px_4px_hsl(var(--silver)/0.15)]",
  2: "border-bronze bg-bronze/5 shadow-[0_0_16px_4px_hsl(var(--bronze)/0.15)]",
};

const rankIcons = [
  <Trophy className="w-6 h-6 text-gold" key="g" />,
  <Medal className="w-6 h-6 text-silver" key="s" />,
  <Award className="w-6 h-6 text-bronze" key="b" />,
];

export default function ResultsReveal() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");

  // Participant-reveal state
  const [currentParticipantIdx, setCurrentParticipantIdx] = useState(0);
  const [revealedJudgeCount, setRevealedJudgeCount] = useState(0);
  const [showTotal, setShowTotal] = useState(false);

  // Leaderboard state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    const ev = getEvent(eventId);
    setEvent(ev || null);
    if (ev) {
      setResults(calculateResults(eventId));
      setJudges(getJudges().filter((j) => ev.judgeIds.includes(j.id)));
    }
  }, [eventId]);

  // Reveal order: last place to first place
  const revealOrder = [...results].reverse();

  // Loading → participant-reveal
  useEffect(() => {
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("participant-reveal"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Participant reveal sequencing
  useEffect(() => {
    if (phase !== "participant-reveal" || revealOrder.length === 0) return;

    const currentResult = revealOrder[currentParticipantIdx];
    if (!currentResult) {
      setPhase("leaderboard");
      return;
    }

    const judgeCount = currentResult.judgeBreakdown.length;

    if (revealedJudgeCount < judgeCount) {
      // Reveal next judge score
      const t = setTimeout(() => setRevealedJudgeCount((c) => c + 1), 900);
      return () => clearTimeout(t);
    } else if (!showTotal) {
      // Show total after all judges revealed
      const t = setTimeout(() => setShowTotal(true), 600);
      return () => clearTimeout(t);
    } else {
      // Move to next participant or leaderboard
      const t = setTimeout(() => {
        if (currentParticipantIdx < revealOrder.length - 1) {
          setCurrentParticipantIdx((i) => i + 1);
          setRevealedJudgeCount(0);
          setShowTotal(false);
        } else {
          setPhase("leaderboard");
        }
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [phase, currentParticipantIdx, revealedJudgeCount, showTotal, revealOrder.length]);

  // Confetti for winner
  useEffect(() => {
    if (phase === "leaderboard" && results.length > 0 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#d4a017", "#c0c0c0", "#cd7f32", "#ffffff"],
        });
      }, 400);
    }
  }, [phase, results.length]);

  if (!event) return <p className="p-8 text-muted-foreground">Event not found.</p>;

  /* ── Loading Phase ── */
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-primary-foreground">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Trophy className="w-16 h-16 text-accent mb-6" />
        </motion.div>
        <h2 className="text-xl font-bold">Calculating Scores…</h2>
        <div className="mt-4 w-48 h-1.5 rounded-full overflow-hidden bg-primary-foreground/20">
          <motion.div
            className="h-full bg-accent rounded-full"
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    );
  }

  /* ── Participant Reveal Phase ── */
  if (phase === "participant-reveal") {
    const participant = revealOrder[currentParticipantIdx];
    if (!participant) return null;

    const rank = results.length - currentParticipantIdx;
    const judgeScores = participant.judgeBreakdown;

    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex flex-col items-center justify-center p-8">
        <p className="text-sm text-primary-foreground/40 mb-2">
          {event.name}
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={participant.participantId}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            {/* Rank badge */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-medium text-primary-foreground/50 mb-1"
            >
              #{rank}
            </motion.p>

            {/* Participant name */}
            <h3 className="text-3xl font-bold mb-8">{participant.participantName}</h3>

            {/* Judge scores appearing one by one */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8 min-h-[56px]">
              <AnimatePresence>
                {judgeScores.slice(0, revealedJudgeCount).map((jb, idx) => (
                  <motion.div
                    key={jb.judgeId}
                    initial={{ opacity: 0, scale: 0.3, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex flex-col items-center"
                  >
                    <span className="text-3xl font-bold text-accent tabular-nums">
                      {jb.total}
                    </span>
                    <span className="text-[10px] text-primary-foreground/40 mt-1 max-w-[60px] truncate">
                      {jb.judgeName}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Total score summed up */}
            <AnimatePresence>
              {showTotal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-px bg-primary-foreground/20 mb-4" />
                  <p className="text-xs text-primary-foreground/40 uppercase tracking-widest mb-1">
                    Total
                  </p>
                  <div className="text-6xl font-bold text-accent">
                    <CountUp end={participant.totalScore} duration={0.8} />
                  </div>
                  {participant.maxPossible > 0 && (
                    <p className="text-xs text-primary-foreground/30 mt-1">
                      / {participant.maxPossible}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute bottom-8 flex gap-2">
          {revealOrder.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= currentParticipantIdx
                  ? "bg-accent"
                  : "bg-primary-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Leaderboard Phase ── */
  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{event.name} — Results</h1>
            <p className="text-sm text-muted-foreground">Final leaderboard</p>
          </div>
        </div>

        <div className="space-y-3">
          {results.map((r, i) => (
            <motion.div
              key={r.participantId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className={`transition-all ${i < 3 ? rankStyles[i] : "shadow-sm"}`}>
                <CardContent className="p-5">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpanded({ ...expanded, [r.participantId]: !expanded[r.participantId] })
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {i < 3 ? (
                          rankIcons[i]
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground tabular-nums">
                            #{i + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{r.participantName}</p>
                        {i < 3 && (
                          <p className="text-xs text-muted-foreground">
                            {i === 0 ? "🥇 Gold" : i === 1 ? "🥈 Silver" : "🥉 Bronze"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold tabular-nums">
                        <CountUp end={r.totalScore} duration={1 + i * 0.2} />
                      </span>
                      {r.maxPossible > 0 && (
                        <span className="text-xs text-muted-foreground">/ {r.maxPossible}</span>
                      )}
                      {expanded[r.participantId] ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded[r.participantId] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {r.judgeBreakdown.map((jb) => (
                            <div key={jb.judgeId} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{jb.judgeName}</span>
                              <span className="font-medium tabular-nums">{jb.total}</span>
                            </div>
                          ))}
                          {event.criteria.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-2 font-medium">
                                Category Breakdown
                              </p>
                              {event.criteria.map((c) => (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{c.name}</span>
                                  <span className="tabular-nums">{r.categoryTotals[c.id] || 0}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {results.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <p className="font-medium">No scores submitted yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
