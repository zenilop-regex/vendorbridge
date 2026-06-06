import React, { createContext, useState, useEffect, useContext } from 'react';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const backendUrl = 'http://localhost:5000'; // Default backend address

  // Load auth state from localStorage on init
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  // Login action
  const login = async (email, password) => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        userId: data.userId,
        name: data.name,
        role: data.role,
        email: data.email,
        companyName: data.companyName
      }));

      setToken(data.token);
      setUser({
        userId: data.userId,
        name: data.name,
        role: data.role,
        email: data.email,
        companyName: data.companyName
      });

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Register action
  const register = async (name, email, password, role, companyName) => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, companyName })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        userId: data.userId,
        name: data.name,
        role: data.role,
        email: data.email,
        companyName: data.companyName
      }));

      setToken(data.token);
      setUser({
        userId: data.userId,
        name: data.name,
        role: data.role,
        email: data.email,
        companyName: data.companyName
      });

      return data;
    } catch (error) {
      throw error;
    }
  };

  // Logout action
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Authenticated fetch wrapper helper
  const authFetch = async (url, options = {}) => {
    const activeToken = token || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${backendUrl}${url}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      logout();
      throw new Error('Session expired. Please login again.');
    }

    return res;
  };

  return (
    <AppContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      authFetch,
      backendUrl
    }}>
      {!loading && children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
