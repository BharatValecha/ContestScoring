import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getEvents, getEvent, getParticipants, getScoreByJudgeAndParticipant, submitScore } from "@/lib/store";
import { AppEvent, Participant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Trophy, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function JudgeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<AppEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!user?.judgeId) return;
    const allEvents = getEvents();
    setMyEvents(allEvents.filter((e) => e.judgeIds.includes(user.judgeId!)));
  }, [user]);

  const selectEvent = (event: AppEvent) => {
    setSelectedEvent(event);
    const allP = getParticipants();
    setParticipants(allP.filter((p) => event.participantIds.includes(p.id)));
    setSelectedParticipant(null);
  };

  const selectParticipant = (p: Participant) => {
    if (!selectedEvent || !user?.judgeId) return;
    setSelectedParticipant(p);
    const existing = getScoreByJudgeAndParticipant(selectedEvent.id, user.judgeId, p.id);
    if (existing) {
      setScores(existing.scores);
      setComment(existing.comment || "");
    } else {
      const initial: Record<string, number> = {};
      selectedEvent.criteria.forEach((c) => (initial[c.id] = 0));
      setScores(initial);
      setComment("");
    }
  };

  const handleSubmit = () => {
    if (!selectedEvent || !selectedParticipant || !user?.judgeId) return;
    submitScore({
      eventId: selectedEvent.id,
      judgeId: user.judgeId,
      participantId: selectedParticipant.id,
      scores,
      comment: comment || undefined,
    });
    toast.success(`Score submitted for ${selectedParticipant.name}`);
  };

  const hasSubmitted = (pId: string) => {
    if (!selectedEvent || !user?.judgeId) return false;
    return !!getScoreByJudgeAndParticipant(selectedEvent.id, user.judgeId, pId);
  };

  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-background p-6 lg:p-8 max-w-4xl mx-auto animate-reveal-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
            <p className="text-muted-foreground text-sm">Your assigned events</p>
          </div>
          <Button variant="outline" onClick={logout} className="active:scale-[0.97]">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        {myEvents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No events assigned</p>
              <p className="text-sm mt-1">Ask your admin to assign you to an event</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {myEvents.map((event) => (
              <Card
                key={event.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.995]"
                onClick={() => selectEvent(event)}
              >
                <CardContent className="p-5">
                  <h3 className="font-semibold">{event.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{event.description || "No description"}</p>
                  <p className="text-xs text-muted-foreground mt-2">{event.participantIds.length} participants · {event.criteria.length} criteria</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8 max-w-5xl mx-auto animate-reveal-up">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{selectedEvent.name}</h1>
          <p className="text-sm text-muted-foreground">Select a participant to score</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px,1fr] gap-6">
        {/* Participant list */}
        <div className="space-y-2">
          {participants.map((p) => (
            <button
              key={p.id}
              onClick={() => selectParticipant(p)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm active:scale-[0.98] ${
                selectedParticipant?.id === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-secondary"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                {hasSubmitted(p.id) && (
                  <Check className={`w-4 h-4 ${selectedParticipant?.id === p.id ? "text-primary-foreground" : "text-success"}`} />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Scoring form */}
        {selectedParticipant ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Score: {selectedParticipant.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedEvent.criteria.map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{c.name}</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {scores[c.id] || 0} / {c.maxScore}
                    </span>
                  </div>
                  <Input
                    type="range"
                    min={0}
                    max={c.maxScore}
                    value={scores[c.id] || 0}
                    onChange={(e) => setScores({ ...scores, [c.id]: Number(e.target.value) })}
                    className="h-2 cursor-pointer"
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label className="text-sm">Comments (optional)</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Any notes about this participant…" rows={3} />
              </div>
              <Button onClick={handleSubmit} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">
                Submit Score
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center text-muted-foreground">
              <p className="text-sm">Select a participant to begin scoring</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
