import React, { createContext, useState } from 'react';
import { demoProducts, demoAlerts, demoNotifications, demoUser } from '../data/demoData';
import type { Product, PriceAlert, Notification, User } from '../types';

export interface DemoContextType {
  isDemoMode: boolean;
  products: Product[];
  alerts: PriceAlert[];
  notifications: Notification[];
  user: User;
}

// Context is created here but only for internal use
// External consumers should use the useDemo hook instead
// eslint-disable-next-line react-refresh/only-export-components
export const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use lazy initialization to read from localStorage once on mount
  const [isDemoMode] = useState<boolean>(() => {
    const demoModeValue = localStorage.getItem('demoMode');
    return demoModeValue === 'true';
  });

  const value: DemoContextType = {
    isDemoMode,
    products: demoProducts,
    alerts: demoAlerts,
    notifications: demoNotifications,
    user: demoUser,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};
