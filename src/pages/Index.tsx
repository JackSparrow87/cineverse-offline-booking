
import { useEffect } from 'react';
import HomePage from './HomePage';
import { initializeDB } from '@/lib/db';

const Index = () => {
  // Initialize database on app startup
  useEffect(() => {
    try {
      initializeDB();
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }, []);
  
  return <HomePage />;
};

export default Index;
