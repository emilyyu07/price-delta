import React, { createContext } from 'react';
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
  const value: DemoContextType = {
    // Demo mode is intentionally hidden for now.
    isDemoMode: false,
    products: demoProducts,
    alerts: demoAlerts,
    notifications: demoNotifications,
    user: demoUser,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
};
