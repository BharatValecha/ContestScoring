import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEvent, calculateResults, getJudges } from "@/lib/store";
import { ParticipantResult } from "@/lib/store";
import { AppEvent } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";

function CountUp({ end, duration = 1.5 }: { end: number; duration?: number }) {
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

type Phase = "loading" | "reveal" | "leaderboard";

export default function ResultsReveal() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [revealIndex, setRevealIndex] = useState(-1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    const ev = getEvent(eventId);
    setEvent(ev || null);
    if (ev) setResults(calculateResults(eventId));
  }, [eventId]);

  // Phase transitions
  useEffect(() => {
    if (phase === "loading") {
      const t = setTimeout(() => setPhase("reveal"), 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "reveal") return;
    if (results.length === 0) {
      setPhase("leaderboard");
      return;
    }
    // Reveal from last to first (lowest to highest)
    const reversed = results.length - 1;
    if (revealIndex < reversed) {
      const t = setTimeout(() => setRevealIndex((i) => i + 1), 1200);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase("leaderboard"), 800);
      return () => clearTimeout(t);
    }
  }, [phase, revealIndex, results.length]);

  // Confetti for winner
  useEffect(() => {
    if (phase === "leaderboard" && results.length > 0 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#d4a017", "#c0c0c0", "#cd7f32", "#ffffff"] });
      }, 400);
    }
  }, [phase, results.length]);

  if (!event) return <p className="p-8 text-muted-foreground">Event not found.</p>;

  // Loading phase
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

  // Reveal phase — show participants one by one from last to first
  if (phase === "reveal") {
    const reversedResults = [...results].reverse();
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex flex-col items-center justify-center p-8">
        <h2 className="text-lg font-medium text-primary-foreground/70 mb-8">{event.name}</h2>
        <AnimatePresence mode="wait">
          {revealIndex >= 0 && revealIndex < reversedResults.length && (
            <motion.div
              key={reversedResults[revealIndex].participantId}
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p className="text-sm text-primary-foreground/50 mb-2">
                #{results.length - revealIndex}
              </p>
              <h3 className="text-3xl font-bold mb-4">{reversedResults[revealIndex].participantName}</h3>
              <div className="text-5xl font-bold text-accent">
                <CountUp end={reversedResults[revealIndex].totalScore} duration={0.8} />
              </div>
              <p className="text-sm text-primary-foreground/40 mt-2">points</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Leaderboard phase
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
                    onClick={() => setExpanded({ ...expanded, [r.participantId]: !expanded[r.participantId] })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {i < 3 ? rankIcons[i] : (
                          <span className="text-sm font-bold text-muted-foreground tabular-nums">#{i + 1}</span>
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
                              <p className="text-xs text-muted-foreground mb-2 font-medium">Category Breakdown</p>
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
