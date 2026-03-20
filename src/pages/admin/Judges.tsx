import { useState } from "react";
import { getJudges, createJudge, deleteJudge } from "@/lib/store";
import { Judge } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Gavel, Copy } from "lucide-react";
import { toast } from "sonner";

function generatePassword() {
  return Math.random().toString(36).slice(-8);
}

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>(getJudges);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword);

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) return;
    createJudge({ name, email, password });
    setJudges(getJudges());
    setOpen(false);
    setName("");
    setEmail("");
    setPassword(generatePassword());
  };

  const handleDelete = (id: string) => {
    deleteJudge(id);
    setJudges(getJudges());
  };

  const copyCredentials = (j: Judge) => {
    navigator.clipboard.writeText(`Email: ${j.email}\nPassword: ${j.password}`);
    toast.success("Credentials copied!");
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Judges</h1>
          <p className="text-muted-foreground text-sm mt-1">Create judge accounts for scoring</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground active:scale-[0.97] transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Judge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Judge</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Sarah Miller" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sarah@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground active:scale-[0.97]">Add Judge</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {judges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Gavel className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No judges yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {judges.map((j) => (
            <Card key={j.id} className="shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{j.name}</p>
                  <p className="text-xs text-muted-foreground">{j.email}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => copyCredentials(j)} className="text-muted-foreground">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(j.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
