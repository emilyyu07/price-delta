import React, { useEffect, useRef, useState } from 'react';

interface AnimatedLineChartProps {
  data: { x: number; y: number }[];
  width?: number;
  height?: number;
  color?: string;
  animated?: boolean;
}

export const AnimatedLineChart: React.FC<AnimatedLineChartProps> = ({
  data,
  width = 400,
  height = 200,
  color = 'var(--color-primary-600)',
  animated = true
}) => {
  const [pathLength, setPathLength] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      setPathLength(length);
      
      if (animated) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 2000);
      }
    }
  }, [data, animated]);

  const createPath = () => {
    if (data.length === 0) return '';
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const rangeY = maxY - minY || 1;
    
    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + (1 - (point.y - minY) / rangeY) * chartHeight;
      return `${x},${y}`;
    });

    return `M${points.join(' L')}`;
  };

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1={20}
            y1={20 + (i * (height - 40)) / 4}
            x2={width - 20}
            y2={20 + (i * (height - 40)) / 4}
            stroke="var(--color-primary-200)"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        
        {/* Chart line */}
        <path
          ref={pathRef}
          d={createPath()}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={animated ? 'animate-draw-line' : ''}
          style={{
            strokeDasharray: animated ? pathLength : undefined,
            strokeDashoffset: animated && !isAnimating ? 0 : pathLength
          }}
        />
        
        {/* Data points */}
        {data.map((point, index) => (
          <circle
            key={index}
            cx={20 + (index / (data.length - 1)) * (width - 40)}
            cy={20 + (1 - (point.y - Math.min(...data.map(d => d.y))) / 
                (Math.max(...data.map(d => d.y)) - Math.min(...data.map(d => d.y)) || 1)) * (height - 40)}
            r="4"
            fill={color}
            className="animate-badge-pop"
            style={{
              animationDelay: `${animated ? 2000 + index * 100 : 0}ms`
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// Enhanced Header with animations
interface AnimatedHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({ children, className = '' }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${scrolled 
          ? 'bg-primary-50/80 backdrop-blur-xl border-b border-primary-200/30 shadow-lg py-4' 
          : 'bg-primary-50/60 backdrop-blur-xl border-b border-primary-200/20 py-6'
        }
        ${className}
      `}
    >
      {children}
    </header>
  );
};

// Magnetic cursor effect button
interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  magnetic?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({ 
  children, 
  magnetic = true,
  className = '',
  ...props 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!magnetic || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) / 3;
    const y = (e.clientY - centerY) / 3;
    
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <button
      ref={buttonRef}
      className={`
        relative transition-transform duration-200 ease-out
        ${magnetic ? 'magnetic-button' : ''}
        ${className}
      `}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  );
};

// Floating action button
interface FloatingActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  color?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  children,
  position = 'bottom-right',
  color = 'var(--color-primary-600)'
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed w-14 h-14 rounded-full shadow-lg flex items-center justify-center
        transition-all duration-300 hover:scale-110 hover:shadow-xl
        animate-float z-40
        ${positionClasses[position]}
      `}
      style={{ backgroundColor: color }}
    >
      <span className="text-white">{children}</span>
    </button>
  );
};

// Progress bar with animation
interface AnimatedProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: number;
  animated?: boolean;
  showLabel?: boolean;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  max,
  color = 'var(--color-primary-600)',
  height = 8,
  animated = true,
  showLabel = true
}) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        const duration = 1500;
        const steps = 60;
        const increment = value / steps;
        let current = 0;

        const counter = setInterval(() => {
          current += increment;
          if (current >= value) {
            setCurrentValue(value);
            clearInterval(counter);
          } else {
            setCurrentValue(current);
          }
        }, duration / steps);

        return () => clearInterval(counter);
      }, 200);
    } else {
      setCurrentValue(value);
    }
  }, [value, animated]);

  const percentage = (currentValue / max) * 100;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-sleek text-primary-600">Progress</span>
          <span className="text-sm font-chic text-primary-800">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full bg-primary-200 rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};
