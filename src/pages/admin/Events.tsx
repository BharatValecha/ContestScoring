import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEvents, createEvent, deleteEvent } from "@/lib/store";
import { AppEvent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowRight, CalendarDays } from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<AppEvent[]>(getEvents);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const navigate = useNavigate();

  const handleCreate = () => {
    if (!name.trim()) return;
    createEvent({ name, description: desc, startDate: start, endDate: end });
    setEvents(getEvents());
    setOpen(false);
    setName("");
    setDesc("");
    setStart("");
    setEnd("");
  };

  const handleDelete = (id: string) => {
    deleteEvent(id);
    setEvents(getEvents());
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage competition events</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground active:scale-[0.97] transition-all">
              <Plus className="w-4 h-4 mr-2" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hackathon 2025" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Brief description…" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">
                Create Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No events yet</p>
            <p className="text-sm mt-1">Create your first event to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((event, i) => (
            <Card
              key={event.id}
              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex-1" onClick={() => navigate(`/admin/events/${event.id}`)}>
                  <h3 className="font-semibold">{event.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{event.description || "No description"}</p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{event.participantIds.length} participants</span>
                    <span>{event.judgeIds.length} judges</span>
                    <span>{event.criteria.length} criteria</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
