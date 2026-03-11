import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`relative ${sizes[size]} ${className}`}>
      <div className={`absolute inset-0 rounded-full border-2 border-primary-200`}></div>
      <div className={`absolute inset-0 rounded-full border-2 border-primary-600 border-t-transparent animate-spin`}></div>
    </div>
  );
};

interface PulseLoaderProps {
  className?: string;
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
      <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse delay-75"></div>
      <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse delay-150"></div>
    </div>
  );
};
