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
        const response = await fetch(`${process.env.REACT_APP_SERVER}/session/refresh`, {
          method: 'GET',
          credentials: 'include',
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
        const response = await fetch(`${process.env.REACT_APP_SERVER}/session/destroy`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error();
        }
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
