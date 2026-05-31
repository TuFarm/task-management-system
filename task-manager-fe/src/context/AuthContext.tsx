import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { IUser, UserRole } from "../utils/interfaces";
import {
  API_BASE_URL,
  setAuthToken,
  setUnauthorizedHandler,
} from "../utils/api";

interface BackendUser {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  avatarColor?: string;
  createdAt?: string;
}

interface LoginResponse {
  token: string;
  tokenType?: string;
  expiresIn?: number;
  user: BackendUser;
}

interface AuthContextValue {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<IUser>;
  register: (
    username: string,
    email: string,
    password: string,
    fullName: string
  ) => Promise<IUser>;
  logout: () => void;
  setUser: (user: IUser) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Token lives in memory + sessionStorage (NOT localStorage) so it is not shared
// across tabs and is cleared when the tab closes. The non-sensitive user profile
// is mirrored to localStorage so existing pages that read "currentUser" keep working.
const TOKEN_KEY = "tm_token";

function toFrontendUser(u: BackendUser): IUser {
  return {
    user_id: u.userId,
    username: u.username,
    email: u.email,
    full_name: u.fullName,
    role: u.role as UserRole,
    created_at: u.createdAt ?? new Date().toISOString(),
    is_active: u.status ? u.status === "ACTIVE" : true,
    avatar_color: u.avatarColor || undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<IUser | null>(() => {
    const raw = localStorage.getItem("currentUser");
    return raw ? (JSON.parse(raw) as IUser) : null;
  });
  const [token, setTokenState] = useState<string | null>(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) setAuthToken(t);
    return t;
  });

  const persist = useCallback((tok: string | null, usr: IUser | null) => {
    setAuthToken(tok);
    setTokenState(tok);
    setUserState(usr);
    if (tok) sessionStorage.setItem(TOKEN_KEY, tok);
    else sessionStorage.removeItem(TOKEN_KEY);
    if (usr) localStorage.setItem("currentUser", JSON.stringify(usr));
    else localStorage.removeItem("currentUser");
  }, []);

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const login = useCallback(
    async (username: string, password: string): Promise<IUser> => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        let message = "Invalid username or password";
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const data: LoginResponse = await res.json();
      const fe = toFrontendUser(data.user);
      persist(data.token, fe);
      return fe;
    },
    [persist]
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      fullName: string
    ): Promise<IUser> => {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, fullName }),
      });
      if (!res.ok) {
        let message = "Registration failed";
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const data: LoginResponse = await res.json();
      const fe = toFrontendUser(data.user);
      persist(data.token, fe);
      return fe;
    },
    [persist]
  );

  const setUser = useCallback(
    (usr: IUser) => {
      setUserState(usr);
      localStorage.setItem("currentUser", JSON.stringify(usr));
    },
    []
  );

  // When any API call returns 401, drop the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      persist(null, null);
    });
    return () => setUnauthorizedHandler(null);
  }, [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      setUser,
    }),
    [user, token, login, register, logout, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
