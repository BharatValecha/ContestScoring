import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import AdminLayout from "@/components/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import EventsPage from "@/pages/admin/Events";
import EventDetail from "@/pages/admin/EventDetail";
import ParticipantsPage from "@/pages/admin/Participants";
import JudgesPage from "@/pages/admin/Judges";
import JudgeDashboard from "@/pages/judge/JudgeDashboard";
import ResultsReveal from "@/pages/ResultsReveal";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (user.role === "admin") {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:eventId" element={<EventDetail />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="judges" element={<JudgesPage />} />
        </Route>
        <Route path="/results/:eventId" element={<ResultsReveal />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  // Judge
  return (
    <Routes>
      <Route path="/" element={<JudgeDashboard />} />
      <Route path="/results/:eventId" element={<ResultsReveal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
