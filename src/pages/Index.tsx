
import { useEffect } from 'react';
import HomePage from './HomePage';
import { initializeDB } from '@/lib/db';

const Index = () => {
  // Initialize database on app startup
  useEffect(() => {
    initializeDB();
  }, []);
  
  return <HomePage />;
};

export default Index;
