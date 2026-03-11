import React, { useState, useRef, useEffect } from 'react';

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

export const Ripple: React.FC<RippleProps> = ({ x, y, size }) => {
  return (
    <span
      className="absolute rounded-full bg-white/30 animate-ripple"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
      }}
    />
  );
};

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const RippleButton: React.FC<RippleButtonProps> = ({ children, className, onClick, ...props }) => {
  const [ripples, setRipples] = useState<RippleProps[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);

    const newRipple = { x, y, size };
    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter((_, index) => index !== ripples.length));
    }, 600);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    createRipple(event);
    onClick?.(event);
  };

  return (
    <button
      ref={buttonRef}
      className={`relative overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map((ripple, index) => (
        <Ripple key={index} {...ripple} />
      ))}
    </button>
  );
};
