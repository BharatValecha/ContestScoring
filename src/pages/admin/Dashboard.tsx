import { useState } from "react";
import { getEvents, getJudges } from "@/lib/store";
import { CalendarDays, Users, Gavel, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboard() {
  const [events] = useState(getEvents);
  const [judges] = useState(getJudges);

  const totalParticipants = events.reduce((sum, e) => sum + (e.participants || []).length, 0);

  const stats = [
    { label: "Events", value: events.length, icon: CalendarDays, color: "text-accent" },
    { label: "Participants", value: totalParticipants, icon: Users, color: "text-success" },
    { label: "Judges", value: judges.length, icon: Gavel, color: "text-muted-foreground" },
    { label: "Completed", value: events.filter((e) => e.resultsRevealed).length, icon: Trophy, color: "text-gold" },
  ];

  return (
    <div className="space-y-8 animate-reveal-up">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your contest management</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
