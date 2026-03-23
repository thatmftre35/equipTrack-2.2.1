import React, { createContext, useContext, useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface User {
  username: string;
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  organizationId: string;
  organizationName?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string, loginType?: 'super' | 'org' | 'user', organizationCode?: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('equiptrack_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('equiptrack_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password?: string, loginType: 'super' | 'org' | 'user' = 'user', organizationCode?: string) => {
    try {
      console.log('AuthContext login called:', { username, password: password ? '***' : undefined, loginType });
      
      if (loginType === 'super') {
        // Super Admin login
        console.log('Checking super admin credentials...');
        if (username !== 'thatmftre35' || password !== 'tre6616') {
          console.error('Invalid super admin credentials provided');
          throw new Error('Invalid super admin credentials');
        }
        console.log('Super admin credentials valid, creating user...');
        const superAdminUser: User = {
          username: 'thatmftre35',
          isSuperAdmin: true,
          isOrgAdmin: false,
          organizationId: 'super_admin'
        };
        setUser(superAdminUser);
        localStorage.setItem('equiptrack_user', JSON.stringify(superAdminUser));
        console.log('Super admin login successful:', superAdminUser);
      } else if (loginType === 'org') {
        // Organization Admin login
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/verify-org-admin`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ username, password }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Invalid organization admin credentials');
        }

        const data = await response.json();
        const orgAdminUser: User = {
          username: data.organizationName,
          isSuperAdmin: false,
          isOrgAdmin: true,
          organizationId: data.organizationId
        };
        setUser(orgAdminUser);
        localStorage.setItem('equiptrack_user', JSON.stringify(orgAdminUser));
      } else {
        // Regular user login - verify with backend
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-927e49ee/verify-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ username, organizationCode }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'User not found or not approved');
        }

        const data = await response.json();
        const regularUser: User = {
          username,
          isSuperAdmin: false,
          isOrgAdmin: false,
          organizationId: data.organizationId,
          organizationName: data.organizationName
        };
        setUser(regularUser);
        localStorage.setItem('equiptrack_user', JSON.stringify(regularUser));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('equiptrack_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};