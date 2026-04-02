import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { playDrumroll, playFanfare, playVictoryFanfare, playSwoosh } from "@/lib/sounds";
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

/* ── Drumroll countdown dots ── */
function DrumrollCountdown({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(3);
  const hasCompleted = useRef(false);

  useEffect(() => {
    hasCompleted.current = false;
    playDrumroll();
  }, []);

  useEffect(() => {
    if (count > 0) {
      const t = setTimeout(() => setCount((c) => c - 1), 600);
      return () => clearTimeout(t);
    } else if (!hasCompleted.current) {
      hasCompleted.current = true;
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
  }, [count, onComplete]);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Pulsing ring */}
      <motion.div
        className="w-32 h-32 rounded-full border-4 border-accent/40 flex items-center justify-center relative"
        animate={{ scale: [1, 1.08, 1], borderColor: ["hsl(var(--accent) / 0.4)", "hsl(var(--accent) / 0.8)", "hsl(var(--accent) / 0.4)"] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        {/* Expanding ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent"
          animate={{ scale: [1, 2], opacity: [0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <AnimatePresence mode="wait">
          {count > 0 ? (
            <motion.span
              key={count}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl font-bold text-accent tabular-nums"
            >
              {count}
            </motion.span>
          ) : (
            <motion.span
              key="go"
              initial={{ scale: 3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="text-2xl font-black text-accent uppercase tracking-widest"
            >
              ★
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      <motion.p
        className="mt-4 text-sm text-primary-foreground/40 uppercase tracking-[0.3em]"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        Drumroll…
      </motion.p>
    </motion.div>
  );
}

/* ── Types ── */
type Phase = "setup" | "loading" | "scoring";
type PresentationMode = "auto" | "manual";
type Speed = "slow" | "normal" | "fast";

// The scoring view alternates between these sub-views
type ScoringView = "participant" | "drumroll" | "total" | "leaderboard" | "final";
type ScoringStep = "judge-reveal" | "drumroll" | "total-reveal" | "leaderboard-show" | "done";

const speedTimings: Record<Speed, { judgeDelay: number; drumrollDuration: number; totalDelay: number; leaderboardDuration: number; nextDelay: number }> = {
  slow: { judgeDelay: 1500, drumrollDuration: 2400, totalDelay: 2000, leaderboardDuration: 3000, nextDelay: 1000 },
  normal: { judgeDelay: 900, drumrollDuration: 2200, totalDelay: 1500, leaderboardDuration: 2000, nextDelay: 600 },
  fast: { judgeDelay: 500, drumrollDuration: 2000, totalDelay: 800, leaderboardDuration: 1200, nextDelay: 400 },
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
  const [scoringStep, setScoringStep] = useState<ScoringStep>("judge-reveal");
  const [scoringView, setScoringView] = useState<ScoringView>("participant");

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<ParticipantResult[]>([]);
  const [justInsertedId, setJustInsertedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const confettiFired = useRef(false);

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

  const insertIntoLeaderboard = useCallback((participant: ParticipantResult) => {
    setLeaderboard((prev) => {
      const updated = [...prev, participant];
      updated.sort((a, b) => b.totalScore - a.totalScore);
      // Play swoosh if the new entry pushes others down (i.e. not last place)
      const newIdx = updated.findIndex((p) => p.participantId === participant.participantId);
      if (newIdx < updated.length - 1) {
        setTimeout(() => playSwoosh(), 200);
      }
      return updated;
    });
    setJustInsertedId(participant.participantId);
    setTimeout(() => setJustInsertedId(null), 1500);
  }, []);

  // Auto sequencing
  useEffect(() => {
    if (mode !== "auto" || phase !== "scoring") return;
    const currentResult = revealOrder[currentParticipantIdx];
    if (!currentResult) return;

    if (scoringStep === "judge-reveal") {
      const judgeCount = currentResult.judgeBreakdown.length;
      if (revealedJudgeCount < judgeCount) {
        const t = setTimeout(() => {
          setRevealedJudgeCount((c) => c + 1);
        }, timings.judgeDelay);
        return () => clearTimeout(t);
      } else {
        // All judges done → drumroll
        const t = setTimeout(() => {
          setScoringStep("drumroll");
          setScoringView("drumroll");
        }, 400);
        return () => clearTimeout(t);
      }
    }

    // Drumroll is handled by the DrumrollCountdown component's onComplete callback
    // which triggers the total reveal

    if (scoringStep === "total-reveal") {
      // After showing total, insert into leaderboard and show it
      const t = setTimeout(() => {
        insertIntoLeaderboard(currentResult);
        setScoringStep("leaderboard-show");
        setScoringView("leaderboard");
      }, timings.totalDelay);
      return () => clearTimeout(t);
    }

    if (scoringStep === "leaderboard-show") {
      const t = setTimeout(() => {
        if (currentParticipantIdx < revealOrder.length - 1) {
          setCurrentParticipantIdx((i) => i + 1);
          setRevealedJudgeCount(0);
          setScoringStep("judge-reveal");
          setScoringView("participant");
        } else {
          setScoringStep("done");
          setScoringView("final");
        }
      }, timings.leaderboardDuration);
      return () => clearTimeout(t);
    }
  }, [mode, phase, currentParticipantIdx, revealedJudgeCount, scoringStep, revealOrder, timings, insertIntoLeaderboard]);

  // Loading → scoring
  useEffect(() => {
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("scoring"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Confetti on final
  useEffect(() => {
    if (scoringView === "final" && !confettiFired.current && leaderboard.length > 0) {
      confettiFired.current = true;
      setTimeout(() => {
        playVictoryFanfare();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#d4a017", "#c0c0c0", "#cd7f32", "#ffffff"] });
      }, 600);
    }
  }, [scoringView, leaderboard.length]);

  // Drumroll complete handler
  const handleDrumrollComplete = useCallback(() => {
    playFanfare();
    setScoringStep("total-reveal");
    setScoringView("total");
  }, []);

  // Manual controls
  const manualNext = useCallback(() => {
    if (phase !== "scoring") return;
    const currentResult = revealOrder[currentParticipantIdx];
    if (!currentResult) return;

    if (scoringStep === "judge-reveal") {
      const judgeCount = currentResult.judgeBreakdown.length;
      if (revealedJudgeCount < judgeCount) {
        setRevealedJudgeCount((c) => c + 1);
      } else {
        setScoringStep("drumroll");
        setScoringView("drumroll");
      }
    } else if (scoringStep === "drumroll") {
      // Skip drumroll
      playFanfare();
      setScoringStep("total-reveal");
      setScoringView("total");
    } else if (scoringStep === "total-reveal") {
      insertIntoLeaderboard(currentResult);
      setScoringStep("leaderboard-show");
      setScoringView("leaderboard");
    } else if (scoringStep === "leaderboard-show") {
      if (currentParticipantIdx < revealOrder.length - 1) {
        setCurrentParticipantIdx((i) => i + 1);
        setRevealedJudgeCount(0);
        setScoringStep("judge-reveal");
        setScoringView("participant");
      } else {
        setScoringStep("done");
        setScoringView("final");
      }
    }
  }, [phase, currentParticipantIdx, revealedJudgeCount, scoringStep, revealOrder, insertIntoLeaderboard]);

  const manualBack = useCallback(() => {
    if (phase !== "scoring") return;

    if (scoringStep === "leaderboard-show") {
      const currentResult = revealOrder[currentParticipantIdx];
      if (currentResult) {
        setLeaderboard((prev) => prev.filter((p) => p.participantId !== currentResult.participantId));
      }
      setScoringStep("total-reveal");
      setScoringView("total");
    } else if (scoringStep === "total-reveal") {
      setScoringStep("judge-reveal");
      setScoringView("participant");
    } else if (scoringStep === "drumroll") {
      setScoringStep("judge-reveal");
      setScoringView("participant");
    } else if (scoringStep === "judge-reveal") {
      if (revealedJudgeCount > 0) {
        setRevealedJudgeCount((c) => c - 1);
      } else if (currentParticipantIdx > 0) {
        const prevResult = revealOrder[currentParticipantIdx - 1];
        if (prevResult) {
          setLeaderboard((prev) => prev.filter((p) => p.participantId !== prevResult.participantId));
        }
        setCurrentParticipantIdx((i) => i - 1);
        setRevealedJudgeCount(prevResult?.judgeBreakdown.length || 0);
        setScoringStep("total-reveal");
        setScoringView("total");
      }
    }
  }, [phase, currentParticipantIdx, revealedJudgeCount, scoringStep, revealOrder]);

  const startPresentation = () => {
    setCurrentParticipantIdx(0);
    setRevealedJudgeCount(0);
    setScoringStep("judge-reveal");
    setScoringView("participant");
    setLeaderboard([]);
    setJustInsertedId(null);
    setExpanded({});
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

  /* ── Scoring Phase ── */
  const currentParticipant = revealOrder[currentParticipantIdx];
  const participantRank = results.length - currentParticipantIdx;

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Event name */}
      <div className="absolute top-4 left-0 right-0 text-center">
        <p className="text-xs text-primary-foreground/30">{event.name}</p>
        <p className="text-xs text-primary-foreground/20">
          {currentParticipantIdx + 1} / {revealOrder.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── PARTICIPANT VIEW: Judge scores one by one ── */}
        {scoringView === "participant" && currentParticipant && (
          <motion.div
            key={`participant-${currentParticipant.participantId}`}
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center w-full max-w-lg"
          >
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="mb-2">
              <span className="inline-block px-4 py-1 rounded-full bg-accent/20 text-accent text-sm font-bold">
                #{participantRank}
              </span>
            </motion.div>

            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl lg:text-5xl font-bold mb-10"
            >
              {currentParticipant.participantName}
            </motion.h3>

            <div className="flex flex-wrap items-center justify-center gap-6 min-h-[80px]">
              <AnimatePresence>
                {currentParticipant.judgeBreakdown.slice(0, revealedJudgeCount).map((jb) => (
                  <motion.div
                    key={jb.judgeId}
                    initial={{ opacity: 0, scale: 0, rotate: -15 }}
                    animate={{ opacity: 1, scale: [0, 1.4, 1], rotate: [-15, 5, 0] }}
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
                      <span className="text-4xl font-bold text-accent tabular-nums relative z-10">
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
          </motion.div>
        )}

        {/* ── DRUMROLL VIEW ── */}
        {scoringView === "drumroll" && currentParticipant && (
          <motion.div
            key={`drumroll-${currentParticipant.participantId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p className="text-lg font-semibold text-primary-foreground/60 mb-6">
              {currentParticipant.participantName}
            </p>
            <DrumrollCountdown onComplete={handleDrumrollComplete} />
          </motion.div>
        )}

        {/* ── TOTAL REVEAL VIEW ── */}
        {scoringView === "total" && currentParticipant && (
          <motion.div
            key={`total-${currentParticipant.participantId}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <p className="text-lg font-semibold text-primary-foreground/60 mb-2">
              {currentParticipant.participantName}
            </p>
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.25, 1], opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], scale: { times: [0, 0.5, 1] } }}
              className="flex flex-col items-center"
            >
              <p className="text-xs text-primary-foreground/40 uppercase tracking-widest mb-2">Total Score</p>
              <motion.div
                className="text-8xl lg:text-9xl font-bold text-accent relative"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
              >
                <div className="absolute inset-0 blur-2xl bg-accent/20 rounded-full" />
                <span className="relative z-10">
                  <CountUp end={currentParticipant.totalScore} duration={0.8} />
                </span>
              </motion.div>
              {currentParticipant.maxPossible > 0 && (
                <p className="text-sm text-primary-foreground/30 mt-3">
                  out of {currentParticipant.maxPossible}
                </p>
              )}
            </motion.div>

            {/* Judge breakdown below */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {currentParticipant.judgeBreakdown.map((jb) => (
                <div key={jb.judgeId} className="text-center">
                  <span className="text-lg font-bold text-primary-foreground/70 tabular-nums">{jb.total}</span>
                  <p className="text-[10px] text-primary-foreground/30">{jb.judgeName}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── LEADERBOARD VIEW ── */}
        {scoringView === "leaderboard" && (
          <motion.div
            key={`leaderboard-${currentParticipantIdx}`}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-bold text-primary-foreground/80">Current Standings</h3>
            </div>

            <LayoutGroup>
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const isJustInserted = entry.participantId === justInsertedId;

                  return (
                    <motion.div
                      key={entry.participantId}
                      layout
                      layoutId={`lb-${entry.participantId}`}
                      initial={{ opacity: 0, x: 100, scale: 0.8 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: isJustInserted ? [0.8, 1.06, 1] : 1,
                      }}
                      transition={{
                        layout: { type: "spring", stiffness: 400, damping: 28 },
                        opacity: { duration: 0.4 },
                        x: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                        scale: { duration: 0.6, times: [0, 0.6, 1] },
                      }}
                    >
                      <div
                        className={`rounded-lg border p-3.5 transition-all duration-700 cursor-pointer ${
                          isJustInserted
                            ? "border-accent bg-accent/15 shadow-[0_0_24px_6px_hsl(var(--accent)/0.25)]"
                            : "border-primary-foreground/10 bg-primary-foreground/5"
                        }`}
                        onClick={() =>
                          setExpanded({ ...expanded, [entry.participantId]: !expanded[entry.participantId] })
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div layout className="w-7 h-7 flex items-center justify-center">
                              <motion.span
                                layout
                                className="text-sm font-bold text-primary-foreground/50 tabular-nums"
                              >
                                #{idx + 1}
                              </motion.span>
                            </motion.div>
                            <span className={`font-semibold text-sm ${isJustInserted ? "text-accent" : "text-primary-foreground"}`}>
                              {entry.participantName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.span
                              className="text-xl font-bold text-accent tabular-nums"
                              key={`s-${entry.participantId}-${isJustInserted}`}
                              initial={isJustInserted ? { scale: 1.8, opacity: 0 } : false}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.5 }}
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
          </motion.div>
        )}

        {/* ── FINAL VIEW ── */}
        {scoringView === "final" && (
          <motion.div
            key="final"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: 2 }}
            >
              <Trophy className="w-20 h-20 text-accent mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold mb-1">Final Results!</h2>
            <p className="text-primary-foreground/50 text-sm mb-8">
              {leaderboard[0]?.participantName} takes the crown! 🎉
            </p>

            {/* Final leaderboard with rank styles */}
            <LayoutGroup>
              <div className="space-y-2 text-left">
                {leaderboard.map((entry, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <motion.div
                      key={entry.participantId}
                      layout
                      layoutId={`lb-${entry.participantId}`}
                      transition={{ layout: { type: "spring", stiffness: 400, damping: 28 } }}
                    >
                      <div
                        className={`rounded-lg border p-3.5 ${
                          isTop3
                            ? rankStyles[idx] || "border-primary-foreground/10 bg-primary-foreground/5"
                            : "border-primary-foreground/10 bg-primary-foreground/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 flex items-center justify-center">
                              {isTop3 ? rankIcons[idx] : (
                                <span className="text-sm font-bold text-primary-foreground/50 tabular-nums">#{idx + 1}</span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-sm text-primary-foreground">
                                {entry.participantName}
                              </span>
                              {isTop3 && (
                                <p className="text-[10px] text-primary-foreground/40">
                                  {idx === 0 ? "🥇 Gold" : idx === 1 ? "🥈 Silver" : "🥉 Bronze"}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xl font-bold text-accent tabular-nums">
                            {entry.totalScore}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </LayoutGroup>

            <Button variant="ghost" onClick={() => navigate(-1)} className="mt-8 text-primary-foreground/50 hover:text-primary-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual controls */}
      {mode === "manual" && scoringView !== "final" && (
        <div className="absolute bottom-12 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={manualBack}
            disabled={currentParticipantIdx === 0 && revealedJudgeCount === 0 && scoringStep === "judge-reveal"}
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
      {scoringView !== "final" && (
        <div className="absolute bottom-4 flex gap-2">
          {revealOrder.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i <= currentParticipantIdx ? "bg-accent" : "bg-primary-foreground/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
