import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void; 
}

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      className={`bg-surface p-6 rounded-lg border border-primary-200 shadow-sm ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
