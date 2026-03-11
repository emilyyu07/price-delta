import React, { useState, useEffect } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: 'slide' | 'fade' | 'scale' | 'flip';
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  type = 'slide', 
  direction = 'right',
  duration = 500 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleExit = () => {
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), duration);
  };

  const transitionClasses = {
    slide: {
      enter: direction === 'left' ? 'translate-x-full' : direction === 'right' ? '-translate-x-full' : 
             direction === 'up' ? 'translate-y-full' : '-translate-y-full',
      active: 'translate-x-0 translate-y-0',
      exit: direction === 'left' ? '-translate-x-full' : direction === 'right' ? 'translate-x-full' :
            direction === 'up' ? '-translate-y-full' : 'translate-y-full'
    },
    fade: {
      enter: 'opacity-0',
      active: 'opacity-100',
      exit: 'opacity-0'
    },
    scale: {
      enter: 'scale-95 opacity-0',
      active: 'scale-100 opacity-100',
      exit: 'scale-105 opacity-0'
    },
    flip: {
      enter: 'rotateY-90 opacity-0',
      active: 'rotateY-0 opacity-100',
      exit: 'rotateY-90 opacity-0'
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`
        transition-all duration-500 ease-in-out transform-gpu
        ${isVisible ? transitionClasses[type].active : transitionClasses[type].enter}
      `}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
};

// Modal component with animations
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AnimatedModal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  size = 'md' 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}
          transition-all duration-300 transform-gpu
          ${isVisible ? 'animate-modal-fade-in' : 'scale-95 opacity-0'}
        `}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-primary-200">
            <h2 className="text-xl font-bold font-chic text-primary-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Loading skeleton component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'skeleton';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  };

  const style = {
    width: width || (variant === 'text' ? '100%' : '40px'),
    height: height || (variant === 'text' ? '1rem' : '40px')
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              width: i === lines - 1 ? '60%' : '100%',
              height: height || '1rem'
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Parallax background component
interface ParallaxBackgroundProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
}

export const ParallaxBackground: React.FC<ParallaxBackgroundProps> = ({ 
  children, 
  intensity = 0.5,
  className = '' 
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * intensity;
      const y = (e.clientY / window.innerHeight - 0.5) * intensity;
      setOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [intensity]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="parallax-bg absolute inset-0"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
