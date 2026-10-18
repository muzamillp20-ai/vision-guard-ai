import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthState } from '../types/auth';
import { validateSession, logout as logoutService } from '../services/auth';

interface AuthContextType extends AuthState {
  login: (user: User, session: Session) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const result = await validateSession();
      if (result) {
        setState({
          user: result.user,
          session: result.session,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        setState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    } catch {
      setState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  }

  function login(user: User, session: Session) {
    setState({
      user,
      session,
      isAuthenticated: true,
      isLoading: false
    });
  }

  async function logout() {
    await logoutService();
    setState({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false
    });
  }

  async function refreshUser() {
    const result = await validateSession();
    if (result) {
      setState(prev => ({
        ...prev,
        user: result.user
      }));
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
