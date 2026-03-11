import React from 'react';
import type { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
  mainClassName?: string;
}

/**
 * Main layout wrapper component
 * Includes header and main content area with consistent spacing
 */
export const Layout: React.FC<LayoutProps> = ({ children, mainClassName }) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-8 ${mainClassName || ''}`}>
        {children}
      </main>
    </div>
  );
};