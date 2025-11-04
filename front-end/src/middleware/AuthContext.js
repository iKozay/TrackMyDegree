// src/AuthContext.js
import React, { createContext, useEffect, useState } from 'react';
import { api } from '../api/http-api-client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check local storage and set initial state for isLoggedIn
  useEffect(() => {
    const verifySession = async () => {
      try {
        const user_data = await api.post('/auth/refresh', {
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

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    const destrySession = async () => {
      try {
        await api.post('/auth/logout', {
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout failed: ', error);
      } finally {
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    destrySession();
  };

  return <AuthContext.Provider value={{ isLoggedIn, login, logout, user, loading }}>{children}</AuthContext.Provider>;
};
