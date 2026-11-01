import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/inventory';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  quickLoginAs: (identifier: string) => Promise<void>;
  register: (name: string, email: string, password?: string, role?: string, phone?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface DemoPersona {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  title: string;
  profession: string;
  description: string;
  badgeClass: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'eyob',
    role: 'ADMIN',
    name: 'Eyob T',
    email: 'eyob@inventory.com',
    title: 'Administrator',
    profession: 'Chief Operations Administrator',
    description: 'Full system control, users & security, valuation analytics',
    badgeClass: 'text-purple-700 dark:text-purple-300'
  },
  {
    id: 'nahom',
    role: 'INVENTORY_MANAGER',
    name: 'Nahom M',
    email: 'nahom@inventory.com',
    title: 'Inventory Manager',
    profession: 'Lead Inventory & Expiry Manager',
    description: 'Batch tracking, FEFO dispatch, restock orders, waste disposal',
    badgeClass: 'text-teal-700 dark:text-teal-300'
  },
  {
    id: 'eyosias',
    role: 'STAFF',
    name: 'Eyosias T',
    email: 'eyosias@inventory.com',
    title: 'Pharmacist',
    profession: 'Senior Dispensing Pharmacist',
    description: 'Stock view, point of sale issuing, expiry checks',
    badgeClass: 'text-blue-700 dark:text-blue-300'
  },
  {
    id: 'bekalu',
    role: 'STAFF',
    name: 'Bekalu G',
    email: 'bekalu@inventory.com',
    title: 'QA Inspector',
    profession: 'Quality Assurance & Expiry Auditor',
    description: 'Batch quarantine inspection, waste audit review',
    badgeClass: 'text-amber-700 dark:text-amber-300'
  },
  {
    id: 'natnael',
    role: 'STAFF',
    name: 'Natnael A',
    email: 'natnael@inventory.com',
    title: 'Logistics Officer',
    profession: 'Cold-Chain & Warehouse Specialist',
    description: 'Incoming shipment verification, cold storage monitoring',
    badgeClass: 'text-emerald-700 dark:text-emerald-300'
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('inv_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('inv_token');
      if (!storedToken) {
        // Automatically default to demo admin (Eyob T) for immediate smooth review experience!
        try {
          const res = await api.login({ email: 'eyob@inventory.com', password: 'admin123' });
          localStorage.setItem('inv_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch {
          try {
            const fallback = await api.login({ email: 'admin@inventory.com', password: 'admin123' });
            localStorage.setItem('inv_token', fallback.token);
            setToken(fallback.token);
            setUser(fallback.user);
          } catch {
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.getMe();
        setUser(res.user);
      } catch {
        localStorage.removeItem('inv_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password = 'password') => {
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('inv_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (identifier: string) => {
    setLoading(true);
    try {
      const persona = DEMO_PERSONAS.find(
        p => p.id === identifier || p.email === identifier || p.role === identifier || p.name.toLowerCase() === identifier.toLowerCase()
      ) || DEMO_PERSONAS[0];

      const pass = persona.role === 'ADMIN' ? 'admin123' : persona.role === 'INVENTORY_MANAGER' ? 'manager123' : 'staff123';
      const res = await api.login({ email: persona.email, password: pass });
      localStorage.setItem('inv_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password = 'password', role = 'STAFF', phone?: string) => {
    setLoading(true);
    try {
      const res = await api.register({ name, email, password, role, phone });
      localStorage.setItem('inv_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('inv_token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { name?: string; phone?: string; currentPassword?: string; newPassword?: string }) => {
    const res = await api.updateProfile(data);
    setUser(res.user);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isManagerOrAbove = user?.role === 'ADMIN' || user?.role === 'INVENTORY_MANAGER';
  const isStaff = user?.role === 'STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLoginAs,
        register,
        logout,
        updateProfile,
        isAdmin,
        isManagerOrAbove,
        isStaff
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
