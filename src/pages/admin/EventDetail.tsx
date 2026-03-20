import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEvent, updateEvent,
  getJudges,
  assignJudgeToEvent, removeJudgeFromEvent,
  addCriterion, removeCriterion,
} from "@/lib/store";
import { AppEvent, Judge, Participant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X, Trophy, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [allJudges, setAllJudges] = useState<Judge[]>([]);
  const [criterionName, setCriterionName] = useState("");
  const [criterionMax, setCriterionMax] = useState("10");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Add participant dialog state
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");

  const refresh = () => {
    if (!eventId) return;
    const ev = getEvent(eventId) || null;
    setEvent(ev);
    setAllJudges(getJudges());
  };

  useEffect(refresh, [eventId]);

  const openEdit = () => {
    if (!event) return;
    setEditName(event.name);
    setEditDesc(event.description);
    setEditStart(event.startDate);
    setEditEnd(event.endDate);
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!event || !editName.trim()) return;
    updateEvent(event.id, {
      name: editName,
      description: editDesc,
      startDate: editStart,
      endDate: editEnd,
    });
    toast.success("Event updated");
    setEditOpen(false);
    refresh();
  };

  const handleAddParticipant = () => {
    if (!event || !newParticipantName.trim()) return;
    const newP: Participant = {
      id: Math.random().toString(36).substring(2, 10),
      name: newParticipantName,
      email: newParticipantEmail || undefined,
    };
    const updatedParticipants = [...(event.participants || []), newP];
    updateEvent(event.id, { participants: updatedParticipants });
    setNewParticipantName("");
    setNewParticipantEmail("");
    setAddParticipantOpen(false);
    toast.success("Participant added");
    refresh();
  };

  const handleRemoveParticipant = (pId: string) => {
    if (!event) return;
    const updatedParticipants = (event.participants || []).filter((p) => p.id !== pId);
    updateEvent(event.id, { participants: updatedParticipants });
    refresh();
  };

  if (!event) return <p className="text-muted-foreground">Event not found.</p>;

  const assignedJudges = allJudges.filter((j) => event.judgeIds.includes(j.id));
  const unassignedJudges = allJudges.filter((j) => !event.judgeIds.includes(j.id));
  const eventParticipants = event.participants || [];

  const handleAddCriterion = () => {
    if (!criterionName.trim()) return;
    addCriterion(event.id, { name: criterionName, maxScore: Number(criterionMax) || 10 });
    setCriterionName("");
    setCriterionMax("10");
    refresh();
  };

  const handleRevealResults = () => {
    updateEvent(event.id, { resultsRevealed: true });
    navigate(`/results/${event.id}`);
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/events")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Button variant="ghost" size="icon" onClick={openEdit} className="text-muted-foreground">
              <Pencil className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">ID: {event.id}</p>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{event.description}</p>
          )}
        </div>
        <Button onClick={handleRevealResults} className="bg-accent text-accent-foreground hover:bg-accent/90 active:scale-[0.97]">
          <Trophy className="w-4 h-4 mr-2" /> Reveal Results
        </Button>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Participant Dialog */}
      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Participant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newParticipantName} onChange={(e) => setNewParticipantName(e.target.value)} placeholder="Alex Chen" />
            </div>
            <div className="space-y-2">
              <Label>Email (optional)</Label>
              <Input value={newParticipantEmail} onChange={(e) => setNewParticipantEmail(e.target.value)} placeholder="alex@email.com" />
            </div>
            <Button onClick={handleAddParticipant} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">Add</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants">Participants ({eventParticipants.length})</TabsTrigger>
          <TabsTrigger value="judges">Judges ({assignedJudges.length})</TabsTrigger>
          <TabsTrigger value="criteria">Criteria ({event.criteria.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddParticipantOpen(true)} className="bg-primary text-primary-foreground active:scale-[0.97]">
              <Plus className="w-4 h-4 mr-2" /> Add Participant
            </Button>
          </div>
          {eventParticipants.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <p className="font-medium">No participants yet</p>
                <p className="text-sm mt-1">Add participants to this event</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {eventParticipants.map((p) => (
                <Card key={p.id} className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveParticipant(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="judges" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {assignedJudges.map((j) => (
              <Badge key={j.id} variant="secondary" className="py-1.5 px-3 gap-2">
                {j.name}
                <button onClick={() => { removeJudgeFromEvent(event.id, j.id); refresh(); }}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          {unassignedJudges.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Available to assign</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {unassignedJudges.map((j) => (
                  <Button
                    key={j.id}
                    variant="outline"
                    size="sm"
                    onClick={() => { assignJudgeToEvent(event.id, j.id); refresh(); }}
                    className="active:scale-[0.97]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> {j.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
          {allJudges.length === 0 && (
            <p className="text-sm text-muted-foreground">No judges registered yet. Judges can sign up from the login page.</p>
          )}
        </TabsContent>

        <TabsContent value="criteria" className="mt-4 space-y-4">
          <div className="space-y-2">
            {event.criteria.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">max {c.maxScore}</span>
                </div>
                <button onClick={() => { removeCriterion(event.id, c.id); refresh(); }} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Category Name</Label>
              <Input value={criterionName} onChange={(e) => setCriterionName(e.target.value)} placeholder="Creativity" />
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Max</Label>
              <Input type="number" value={criterionMax} onChange={(e) => setCriterionMax(e.target.value)} />
            </div>
            <Button onClick={handleAddCriterion} className="bg-primary text-primary-foreground active:scale-[0.97]">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
