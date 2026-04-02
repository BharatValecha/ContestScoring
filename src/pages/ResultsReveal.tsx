import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { playDrumroll, playFanfare, playVictoryFanfare } from "@/lib/sounds";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent, calculateResults, getJudges } from "@/lib/store";
import { ParticipantResult } from "@/lib/store";
import { AppEvent, Judge } from "@/lib/types";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Trophy, Medal, Award, ChevronDown, ChevronUp, Play, SkipForward } from "lucide-react";

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
type Phase = "setup" | "loading" | "scoring";
type PresentationMode = "auto" | "manual";
type Speed = "slow" | "normal" | "fast";

// Sub-phases within scoring for each participant
type ScoringStep = "judge-reveal" | "total-reveal" | "leaderboard-insert" | "done";

const speedTimings: Record<Speed, { judgeDelay: number; totalDelay: number; insertDelay: number; nextDelay: number }> = {
  slow: { judgeDelay: 1500, totalDelay: 1000, insertDelay: 1500, nextDelay: 2500 },
  normal: { judgeDelay: 900, totalDelay: 600, insertDelay: 1000, nextDelay: 1500 },
  fast: { judgeDelay: 500, totalDelay: 300, insertDelay: 600, nextDelay: 800 },
};

const rankStyles: Record<number, string> = {
  0: "border-gold bg-gold/5 shadow-[0_0_24px_4px_hsl(var(--gold)/0.2)]",
  1: "border-silver bg-silver/5 shadow-[0_0_16px_4px_hsl(var(--silver)/0.15)]",
  2: "border-bronze bg-bronze/5 shadow-[0_0_16px_4px_hsl(var(--bronze)/0.15)]",
};

const rankIcons = [
  <Trophy className="w-5 h-5 text-gold" key="g" />,
  <Medal className="w-5 h-5 text-silver" key="s" />,
  <Award className="w-5 h-5 text-bronze" key="b" />,
];

export default function ResultsReveal() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<PresentationMode>("auto");
  const [speed, setSpeed] = useState<Speed>("normal");

  // Scoring state
  const [currentParticipantIdx, setCurrentParticipantIdx] = useState(0);
  const [revealedJudgeCount, setRevealedJudgeCount] = useState(0);
  const [showTotal, setShowTotal] = useState(false);
  const [scoringStep, setScoringStep] = useState<ScoringStep>("judge-reveal");

  // Leaderboard: participants already added to the board, sorted by score desc
  const [leaderboard, setLeaderboard] = useState<ParticipantResult[]>([]);
  const [justInsertedId, setJustInsertedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [allDone, setAllDone] = useState(false);
  const confettiFired = useRef(false);

  // Reveal order: last place to first (so highest scorer is revealed last)
  const revealOrder = useMemo(() => [...results].reverse(), [results]);

  useEffect(() => {
    if (!eventId) return;
    const ev = getEvent(eventId);
    setEvent(ev || null);
    if (ev) {
      setResults(calculateResults(eventId));
      setJudges(getJudges().filter((j) => ev.judgeIds.includes(j.id)));
    }
  }, [eventId]);

  const timings = speedTimings[speed];

  // Insert current participant into leaderboard (sorted by score desc)
  const insertIntoLeaderboard = useCallback((participant: ParticipantResult) => {
    setLeaderboard((prev) => {
      const updated = [...prev, participant];
      updated.sort((a, b) => b.totalScore - a.totalScore);
      return updated;
    });
    setJustInsertedId(participant.participantId);
    // Clear highlight after a bit
    setTimeout(() => setJustInsertedId(null), 1500);
  }, []);

  // Auto mode sequencing
  useEffect(() => {
    if (mode !== "auto" || phase !== "scoring") return;

    const currentResult = revealOrder[currentParticipantIdx];
    if (!currentResult) return;

    if (scoringStep === "judge-reveal") {
      const judgeCount = currentResult.judgeBreakdown.length;
      if (revealedJudgeCount < judgeCount) {
        const t = setTimeout(() => {
          playDrumroll();
          setRevealedJudgeCount((c) => c + 1);
        }, timings.judgeDelay);
        return () => clearTimeout(t);
      } else {
        // All judges revealed, show total
        const t = setTimeout(() => {
          playFanfare();
          setShowTotal(true);
          setScoringStep("total-reveal");
        }, timings.totalDelay);
        return () => clearTimeout(t);
      }
    }

    if (scoringStep === "total-reveal") {
      const t = setTimeout(() => {
        insertIntoLeaderboard(currentResult);
        setScoringStep("leaderboard-insert");
      }, timings.insertDelay);
      return () => clearTimeout(t);
    }

    if (scoringStep === "leaderboard-insert") {
      const t = setTimeout(() => {
        // Move to next participant or finish
        if (currentParticipantIdx < revealOrder.length - 1) {
          setCurrentParticipantIdx((i) => i + 1);
          setRevealedJudgeCount(0);
          setShowTotal(false);
          setScoringStep("judge-reveal");
        } else {
          setScoringStep("done");
          setAllDone(true);
        }
      }, timings.nextDelay);
      return () => clearTimeout(t);
    }
  }, [mode, phase, currentParticipantIdx, revealedJudgeCount, showTotal, scoringStep, revealOrder, timings, insertIntoLeaderboard]);

  // Loading → scoring
  useEffect(() => {
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("scoring"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Confetti when all done
  useEffect(() => {
    if (allDone && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        playVictoryFanfare();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#d4a017", "#c0c0c0", "#cd7f32", "#ffffff"] });
      }, 600);
    }
  }, [allDone]);

  // Manual controls
  const manualNext = useCallback(() => {
    if (phase !== "scoring") return;
    const currentResult = revealOrder[currentParticipantIdx];
    if (!currentResult) return;

    if (scoringStep === "judge-reveal") {
      const judgeCount = currentResult.judgeBreakdown.length;
      if (revealedJudgeCount < judgeCount) {
        playDrumroll();
        setRevealedJudgeCount((c) => c + 1);
      } else {
        playFanfare();
        setShowTotal(true);
        setScoringStep("total-reveal");
      }
    } else if (scoringStep === "total-reveal") {
      insertIntoLeaderboard(currentResult);
      setScoringStep("leaderboard-insert");
    } else if (scoringStep === "leaderboard-insert") {
      if (currentParticipantIdx < revealOrder.length - 1) {
        setCurrentParticipantIdx((i) => i + 1);
        setRevealedJudgeCount(0);
        setShowTotal(false);
        setScoringStep("judge-reveal");
      } else {
        setScoringStep("done");
        setAllDone(true);
      }
    }
  }, [phase, currentParticipantIdx, revealedJudgeCount, scoringStep, revealOrder, insertIntoLeaderboard]);

  const manualBack = useCallback(() => {
    if (phase !== "scoring") return;

    if (scoringStep === "leaderboard-insert") {
      // Remove from leaderboard and go back to total
      const currentResult = revealOrder[currentParticipantIdx];
      if (currentResult) {
        setLeaderboard((prev) => prev.filter((p) => p.participantId !== currentResult.participantId));
      }
      setScoringStep("total-reveal");
    } else if (scoringStep === "total-reveal") {
      setShowTotal(false);
      setScoringStep("judge-reveal");
    } else if (scoringStep === "judge-reveal") {
      if (revealedJudgeCount > 0) {
        setRevealedJudgeCount((c) => c - 1);
      } else if (currentParticipantIdx > 0) {
        // Go back to previous participant's leaderboard-insert state
        const prevResult = revealOrder[currentParticipantIdx - 1];
        // Remove previous from leaderboard
        if (prevResult) {
          setLeaderboard((prev) => prev.filter((p) => p.participantId !== prevResult.participantId));
        }
        setCurrentParticipantIdx((i) => i - 1);
        setRevealedJudgeCount(prevResult?.judgeBreakdown.length || 0);
        setShowTotal(true);
        setScoringStep("total-reveal");
      }
    }
  }, [phase, currentParticipantIdx, revealedJudgeCount, scoringStep, revealOrder]);

  const startPresentation = () => {
    setCurrentParticipantIdx(0);
    setRevealedJudgeCount(0);
    setShowTotal(false);
    setScoringStep("judge-reveal");
    setLeaderboard([]);
    setJustInsertedId(null);
    setAllDone(false);
    confettiFired.current = false;
    setPhase("loading");
  };

  if (!event) return <p className="p-8 text-muted-foreground">Event not found.</p>;

  /* ── Setup Phase ── */
  if (phase === "setup") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-primary text-primary-foreground p-8">
        <Trophy className="w-16 h-16 text-accent mb-6" />
        <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
        <p className="text-primary-foreground/60 mb-10">Results Presentation</p>

        <Card className="w-full max-w-sm bg-primary-foreground/10 border-primary-foreground/20">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-primary-foreground/80">Mode</label>
              <div className="flex gap-2">
                <Button
                  variant={mode === "auto" ? "secondary" : "outline"}
                  onClick={() => setMode("auto")}
                  className={`flex-1 ${mode === "auto" ? "" : "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"}`}
                >
                  <Play className="w-4 h-4 mr-2" /> Auto
                </Button>
                <Button
                  variant={mode === "manual" ? "secondary" : "outline"}
                  onClick={() => setMode("manual")}
                  className={`flex-1 ${mode === "manual" ? "" : "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"}`}
                >
                  <SkipForward className="w-4 h-4 mr-2" /> Manual
                </Button>
              </div>
            </div>

            {mode === "auto" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-primary-foreground/80">Speed</label>
                <Select value={speed} onValueChange={(v) => setSpeed(v as Speed)}>
                  <SelectTrigger className="border-primary-foreground/30 text-primary-foreground bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={startPresentation} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.97] mt-2">
              Start Presentation
            </Button>
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-6 text-primary-foreground/50 hover:text-primary-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

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

  /* ── Scoring Phase (combined participant reveal + live leaderboard) ── */
  const currentParticipant = revealOrder[currentParticipantIdx];
  const rank = results.length - currentParticipantIdx;

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col lg:flex-row">
      {/* Left side: Current participant scoring */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-8 relative min-h-[50vh] lg:min-h-screen">
        <p className="text-xs text-primary-foreground/40 mb-1">{event.name}</p>
        <p className="text-xs text-primary-foreground/30 mb-6">
          Participant {currentParticipantIdx + 1} of {revealOrder.length}
        </p>

        {!allDone && currentParticipant ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentParticipant.participantId}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center w-full max-w-md"
            >
              {/* Rank badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-2"
              >
                <span className="inline-block px-4 py-1 rounded-full bg-accent/20 text-accent text-sm font-bold">
                  #{rank}
                </span>
              </motion.div>

              {/* Participant name */}
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl lg:text-4xl font-bold mb-8"
              >
                {currentParticipant.participantName}
              </motion.h3>

              {/* Judge scores */}
              <div className="flex flex-wrap items-center justify-center gap-5 mb-8 min-h-[70px]">
                <AnimatePresence>
                  {currentParticipant.judgeBreakdown.slice(0, revealedJudgeCount).map((jb) => (
                    <motion.div
                      key={jb.judgeId}
                      initial={{ opacity: 0, scale: 0, rotate: -15 }}
                      animate={{
                        opacity: 1,
                        scale: [0, 1.4, 1],
                        rotate: [-15, 5, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                        scale: { times: [0, 0.5, 1] },
                        rotate: { times: [0, 0.5, 1] },
                      }}
                      className="flex flex-col items-center"
                    >
                      <motion.div className="relative">
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-accent"
                          initial={{ scale: 0.8, opacity: 1 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                        <span className="text-3xl font-bold text-accent tabular-nums relative z-10">
                          {jb.total}
                        </span>
                      </motion.div>
                      <span className="text-xs text-primary-foreground/50 mt-2 max-w-[80px] truncate">
                        {jb.judgeName}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Total score */}
              <AnimatePresence>
                {showTotal && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, y: 30 }}
                    animate={{
                      opacity: 1,
                      scale: [0.3, 1.2, 1],
                      y: [30, -5, 0],
                    }}
                    transition={{
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1],
                      scale: { times: [0, 0.6, 1] },
                    }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-24 h-px bg-primary-foreground/20 mb-4" />
                    <p className="text-xs text-primary-foreground/40 uppercase tracking-widest mb-1">
                      Total
                    </p>
                    <motion.div
                      className="text-6xl lg:text-7xl font-bold text-accent relative"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
                    >
                      <div className="absolute inset-0 blur-xl bg-accent/20 rounded-full" />
                      <span className="relative z-10">
                        <CountUp end={currentParticipant.totalScore} duration={0.8} />
                      </span>
                    </motion.div>
                    {currentParticipant.maxPossible > 0 && (
                      <p className="text-xs text-primary-foreground/30 mt-2">
                        / {currentParticipant.maxPossible}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        ) : (
          /* All done - final celebration */
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: 2 }}
            >
              <Trophy className="w-20 h-20 text-accent mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-2">Final Results!</h2>
            <p className="text-primary-foreground/50 text-sm">
              {leaderboard[0]?.participantName} takes the crown! 🎉
            </p>
          </motion.div>
        )}

        {/* Manual controls */}
        {mode === "manual" && !allDone && (
          <div className="absolute bottom-8 lg:bottom-12 flex items-center gap-4">
            <Button
              variant="outline"
              onClick={manualBack}
              disabled={currentParticipantIdx === 0 && revealedJudgeCount === 0 && !showTotal}
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              onClick={manualNext}
              className="bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.97]"
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="absolute bottom-3 flex gap-2">
          {revealOrder.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= currentParticipantIdx ? "bg-accent" : "bg-primary-foreground/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right side: Live leaderboard */}
      <div className="w-full lg:w-[380px] bg-background/5 backdrop-blur-sm border-t lg:border-t-0 lg:border-l border-primary-foreground/10 p-4 lg:p-6 overflow-y-auto max-h-[50vh] lg:max-h-screen">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-primary-foreground/70 uppercase tracking-wider">
            Leaderboard
          </h3>
          <span className="text-xs text-primary-foreground/30 ml-auto">
            {leaderboard.length}/{results.length}
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-primary-foreground/20">
            <p className="text-sm">Waiting for scores…</p>
          </div>
        ) : (
          <LayoutGroup>
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const isJustInserted = entry.participantId === justInsertedId;
                const isTop3 = idx < 3 && allDone;

                return (
                  <motion.div
                    key={entry.participantId}
                    layout
                    layoutId={`lb-${entry.participantId}`}
                    initial={{ opacity: 0, x: 80, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: isJustInserted ? [0.8, 1.05, 1] : 1,
                    }}
                    transition={{
                      layout: { type: "spring", stiffness: 350, damping: 30 },
                      opacity: { duration: 0.4 },
                      x: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      scale: { duration: 0.6, times: [0, 0.6, 1] },
                    }}
                  >
                    <div
                      className={`rounded-lg border p-3 transition-all duration-500 cursor-pointer ${
                        isJustInserted
                          ? "border-accent bg-accent/10 shadow-[0_0_20px_4px_hsl(var(--accent)/0.2)]"
                          : isTop3
                          ? rankStyles[idx] || "border-primary-foreground/10 bg-primary-foreground/5"
                          : "border-primary-foreground/10 bg-primary-foreground/5"
                      }`}
                      onClick={() =>
                        setExpanded({ ...expanded, [entry.participantId]: !expanded[entry.participantId] })
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 flex items-center justify-center">
                            {isTop3 && allDone ? (
                              rankIcons[idx]
                            ) : (
                              <motion.span
                                layout
                                className="text-sm font-bold text-primary-foreground/50 tabular-nums"
                              >
                                #{idx + 1}
                              </motion.span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-primary-foreground">
                            {entry.participantName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.span
                            className="text-lg font-bold text-accent tabular-nums"
                            key={`score-${entry.participantId}-${isJustInserted}`}
                            initial={isJustInserted ? { scale: 1.5, opacity: 0 } : false}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                          >
                            {entry.totalScore}
                          </motion.span>
                          {expanded[entry.participantId] ? (
                            <ChevronUp className="w-3 h-3 text-primary-foreground/30" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-primary-foreground/30" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded[entry.participantId] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-primary-foreground/10 space-y-1.5">
                              {entry.judgeBreakdown.map((jb) => (
                                <div key={jb.judgeId} className="flex items-center justify-between text-xs">
                                  <span className="text-primary-foreground/40">{jb.judgeName}</span>
                                  <span className="font-medium text-primary-foreground/60 tabular-nums">{jb.total}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>
        )}
      </div>

      {/* Back button */}
      {allDone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 left-6"
        >
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary-foreground/50 hover:text-primary-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </motion.div>
      )}
    </div>
  );
}
