import React, { createContext, useContext, useState, useEffect } from 'react';
import { demoProducts, demoAlerts, demoNotifications, demoUser } from '../data/demoData';
import type { Product, PriceAlert, Notification, User } from '../types';

interface DemoContextType {
  isDemoMode: boolean;
  products: Product[];
  alerts: PriceAlert[];
  notifications: Notification[];
  user: User;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Check localStorage on mount to determine if we're in demo mode
  useEffect(() => {
    const demoModeValue = localStorage.getItem('demoMode');
    setIsDemoMode(demoModeValue === 'true');
  }, []);

  const value: DemoContextType = {
    isDemoMode,
    products: demoProducts,
    alerts: demoAlerts,
    notifications: demoNotifications,
    user: demoUser,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};

// Hook for consuming the demo context
export const useDemo = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

// Helper functions for entering/exiting demo mode
export const enterDemoMode = (): void => {
  localStorage.setItem('demoMode', 'true');
  window.location.reload(); // Reload to trigger context update
};

export const exitDemoMode = (): void => {
  localStorage.removeItem('demoMode');
  window.location.reload(); // Reload to trigger context update
};
