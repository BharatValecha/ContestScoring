import { useState } from "react";
import { getJudges, deleteJudge } from "@/lib/store";
import { Judge } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Gavel } from "lucide-react";

export default function JudgesPage() {
  const [judges, setJudges] = useState<Judge[]>(getJudges);

  const handleDelete = (id: string) => {
    deleteJudge(id);
    setJudges(getJudges());
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div>
        <h1 className="text-2xl font-bold">Judges</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Judges sign up on their own. Assign them to events from the event detail page.
        </p>
      </div>

      {judges.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Gavel className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No judges registered yet</p>
            <p className="text-xs mt-1">Judges can create accounts from the signup page</p>
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(j.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
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
