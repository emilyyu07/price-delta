import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'font-semibold font-chic rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 hover:scale-105';

  const variantStyles = {
    primary: 'bg-primary-700 text-white hover:bg-primary-600 focus:ring-primary-400',
    secondary: 'bg-primary-100 text-primary-800 hover:bg-primary-200 focus:ring-primary-300',
    danger: 'bg-danger text-white hover:bg-red-600 focus:ring-red-400',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
};
