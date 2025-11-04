// src/AuthContext.js
import React, { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check local storage and set initial state for isLoggedIn
  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_SERVER}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Sends refresh token cookie to backend for validation
        });

        if (response.ok) {
          const user_data = await response.json();

          setIsLoggedIn(true);
          setUser(user_data);
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }
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
        const response = await fetch(`${process.env.REACT_APP_SERVER}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error();
        }
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
