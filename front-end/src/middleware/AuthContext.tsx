import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { api } from '~/frontend/api/http-api-client';
import { User } from '~/shared/types/apiTypes';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check local storage and set initial state for isLoggedIn
  useEffect(() => {
    const verifySession = async () => {
      try {
        const user_data = await api.get<User>('/session/refresh', {
          credentials: 'include',
        });
        setIsLoggedIn(true);
        setUser(user_data);
      } catch (error) {
        console.error('Session verification failed:', error);
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setLoading(false); // Set loading to false after checking
      }
    };

    verifySession();
  }, []);

  const login = (userData: User): void => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = (): void => {
    const destrySession = async (): Promise<void> => {
      try {
        await api.get('/session/destroy', {
          credentials: 'include',
        });
      } catch (error) {
        console.error('Session destruction failed:', error);
      } finally {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    destrySession();
  };

  return <AuthContext.Provider value={{ isLoggedIn, login, logout, user, loading }}>{children}</AuthContext.Provider>;
};
