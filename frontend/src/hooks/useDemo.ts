import { useContext } from 'react';
import { DemoContext } from './DemoContext';

/**
 * Hook for consuming the demo context
 * Must be used within a DemoProvider
 * 
 * @returns Demo context containing demo mode state and demo data
 * @throws Error if used outside of DemoProvider
 */
export const useDemo = () => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
