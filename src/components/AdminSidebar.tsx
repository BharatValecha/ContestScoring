import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Users, Gavel, LogOut, Trophy, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/participants", label: "Participants", icon: Users },
  { to: "/admin/judges", label: "Judges", icon: Gavel },
];

export default function AdminSidebar() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border">
      <div className="p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sidebar-accent flex items-center justify-center">
          <Trophy className="w-5 h-5 text-sidebar-primary" />
        </div>
        <span className="font-semibold text-sidebar-accent-foreground text-sm tracking-tight">Contest Scorer</span>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 mt-auto">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 w-full transition-colors active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
