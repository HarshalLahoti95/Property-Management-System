'use client';
import * as React from 'react';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Track the current session version. Incremented on every login/logout
  // so that in-flight /auth/me responses from a stale session cannot
  // overwrite the user state after a newer login has completed.
  const sessionVersionRef = React.useRef(0);

  const refreshSession = React.useCallback(async () => {
    const myVersion = sessionVersionRef.current;
    try {
      const { data } = await apiClient.get(`/auth/me?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });
      // Only update state if no newer login/logout has happened
      // while this request was in flight.
      if (sessionVersionRef.current === myVersion) {
        setUser(data.user);
      }
    } catch (err) {
      if (sessionVersionRef.current === myVersion) {
        setUser(null);
      }
    } finally {
      if (sessionVersionRef.current === myVersion) {
        setIsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = React.useCallback((newUser: User) => {
    // Bump session version so any in-flight /auth/me from a prior
    // session is discarded.
    sessionVersionRef.current += 1;
    setUser(newUser);
    setIsLoading(false);
  }, []);

  const logout = React.useCallback(async () => {
    sessionVersionRef.current += 1;
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const value = React.useMemo(
    () => ({ user, isLoading, login, logout, refreshSession }),
    [user, isLoading, login, logout, refreshSession],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
