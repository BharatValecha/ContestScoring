import React, { createContext, useContext, useState, useCallback } from "react";
import { AuthUser } from "@/lib/types";
import { authenticateJudge } from "@/lib/store";

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => string | null; // returns error or null
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => "Not initialized",
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem("contest-auth");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((email: string, password: string): string | null => {
    // Admin login
    if (email === "admin@contest.app" && password === "admin123") {
      const u: AuthUser = { role: "admin", name: "Admin" };
      setUser(u);
      sessionStorage.setItem("contest-auth", JSON.stringify(u));
      return null;
    }

    // Judge login
    const judge = authenticateJudge(email, password);
    if (judge) {
      const u: AuthUser = { role: "judge", judgeId: judge.id, name: judge.name };
      setUser(u);
      sessionStorage.setItem("contest-auth", JSON.stringify(u));
      return null;
    }

    return "Invalid credentials";
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem("contest-auth");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
