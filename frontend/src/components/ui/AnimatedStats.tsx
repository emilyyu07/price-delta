import React, { useState, useEffect, useRef } from 'react';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  color?: 'primary' | 'accent' | 'success' | 'warning';
  delay?: number;
}

export const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({ 
  title, 
  value, 
  icon, 
  description, 
  color = 'primary',
  delay = 0 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const colorClasses = {
    primary: 'bg-primary-50 border-primary-200 text-primary-600',
    accent: 'bg-accent-50 border-accent-200 text-accent-600',
    success: 'bg-green-50 border-green-200 text-green-600',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-600'
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, value, delay]);

  return (
    <div
      ref={cardRef}
      className={`p-6 rounded-xl border transition-all duration-700 hover:shadow-lg hover:scale-105 ${colorClasses[color]} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold font-chic">{title}</h3>
        <div className="animate-float">{icon}</div>
      </div>
      <div className="relative">
        <p className={`text-3xl font-bold font-chic ${isVisible ? 'animate-count-up' : ''}`}>
          {displayValue}
        </p>
      </div>
      <p className="text-sm font-sleek mt-2 opacity-80">{description}</p>
    </div>
  );
};

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  animated?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = 'var(--color-primary-600)',
  animated = true
}) => {
  const [progress, setProgress] = useState(animated ? 0 : value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / max) * circumference;

  useEffect(() => {
    if (!animated) return;

    const timer = setTimeout(() => {
      const duration = 1500;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setProgress(value);
          clearInterval(counter);
        } else {
          setProgress(current);
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }, 500);

    return () => clearTimeout(timer);
  }, [value, animated, max]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-primary-200)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={animated ? 'animate-progress-ring' : ''}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold font-chic text-primary-800">
          {Math.round((progress / max) * 100)}%
        </span>
      </div>
    </div>
  );
};
