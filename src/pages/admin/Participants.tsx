import { useState } from "react";
import { getParticipants, createParticipant, deleteParticipant } from "@/lib/store";
import { Participant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Users } from "lucide-react";

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>(getParticipants);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createParticipant({ name, email: email || undefined });
    setParticipants(getParticipants());
    setOpen(false);
    setName("");
    setEmail("");
  };

  const handleDelete = (id: string) => {
    deleteParticipant(id);
    setParticipants(getParticipants());
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Participants</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage competition participants</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground active:scale-[0.97] transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Participant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Participant</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Chen" />
              </div>
              <div className="space-y-2">
                <Label>Email (optional)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@email.com" />
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">Add</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {participants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No participants yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {participants.map((p) => (
            <Card key={p.id} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
