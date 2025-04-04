
import { ReactNode, createContext, useContext } from 'react';
import { useAuth } from '@/lib/db';

interface AuthContextType {
  currentUser: {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'customer';
  } | null;
  login: (username: string, password: string) => { 
    success: boolean;
    user?: any;
    message?: string;
  };
  register: (username: string, password: string, email: string) => {
    success: boolean;
    user?: any;
    message?: string;
  };
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
