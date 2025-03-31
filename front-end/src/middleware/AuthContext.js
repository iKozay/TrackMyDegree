// src/AuthContext.js
import React, {createContext, useEffect, useState} from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); /*useState(() => {
    return isLoggedIn;//localStorage.getItem('isLoggedIn') === 'true';
  });*/
  const [user, setUser] =  useState(null); //useState(() => {                   
  //   const storedUser = localStorage.getItem('user');
  //   return storedUser ? JSON.parse(storedUser) : null;
  // });
  const [loading, setLoading] = useState(true);

  // Check local storage and set initial state for isLoggedIn
  useEffect(async () => {
    const response = await fetch(
        `${process.env.REACT_APP_SERVER}/session/refresh`,
        {
          method: 'GET',
          credentials: 'include'
        }
      );

    if(response.ok){
      const user_data = await response.json();
      console.log("REFRESH: ", user_data);

      setIsLoggedIn(true);
      setUser(user_data);
    }
    else {
      setIsLoggedIn(false);
      setUser(null);
    }
    // const loggedInStatus = localStorage.getItem('isLoggedIn') === 'true';
    // setIsLoggedIn(loggedInStatus);
    // if (loggedInStatus === 'true') {
    //   const storedUser = JSON.parse(localStorage.getItem('user'));
    //   setUser(storedUser);
    // }
    setLoading(false); // Set loading to false after checking
  }, []);

  const login = (userData) => {
    // localStorage.setItem('isLoggedIn', 'true');
    // localStorage.setItem('user', JSON.stringify(userData));
    //setUser(JSON.parse(localStorage.getItem('user')));
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    // localStorage.removeItem('isLoggedIn');
    // localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
