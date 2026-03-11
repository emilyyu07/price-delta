import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'strong';
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  const baseClasses = 'backdrop-blur-xl rounded-2xl border transition-all duration-300 font-sleek';
  
  const variants = {
    default: 'bg-white/20 border-white/30 shadow-lg hover:shadow-xl hover:bg-white/30',
    subtle: 'bg-white/10 border-white/20 shadow-md hover:shadow-lg hover:bg-white/15',
    strong: 'bg-white/30 border-white/40 shadow-xl hover:shadow-2xl hover:bg-white/40'
  };

  const classes = cn(baseClasses, variants[variant], className);

  return (
    <div className={classes}>
      {children}
    </div>
  );
};
