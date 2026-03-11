import React, { useState, useEffect, useRef } from 'react';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = ({ 
  label, 
  id, 
  className, 
  error, 
  success, 
  loading = false,
  value,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  const inputClasses = `
    w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 font-sleek
    ${isFocused ? 'border-primary-400 ring-4 ring-primary-100' : 'border-primary-300'}
    ${error ? 'border-danger ring-4 ring-danger/20' : ''}
    ${success ? 'border-success ring-4 ring-success/20' : ''}
    ${loading ? 'opacity-60 cursor-not-allowed' : ''}
    focus:outline-none
  `;

  const labelClasses = `
    absolute left-4 transition-all duration-300 font-chic pointer-events-none
    ${isFocused || hasValue 
      ? '-top-2.5 left-3 text-xs bg-white px-1 text-primary-600' 
      : 'top-3.5 text-primary-500'
    }
    ${error ? 'text-danger' : ''}
    ${success ? 'text-success' : ''}
  `;

  return (
    <div className={`relative ${className || ''}`}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          className={inputClasses.trim()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          value={value}
          disabled={loading}
          {...props}
        />
        
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        )}
        
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 text-danger">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        
        {success && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 text-success animate-badge-pop">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-1 text-xs text-danger font-sleek animate-slide-in-left">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-1 text-xs text-success font-sleek animate-slide-in-left">
          {success}
        </div>
      )}
    </div>
  );
};

interface AnimatedTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  success?: string;
  loading?: boolean;
}

export const AnimatedTextArea: React.FC<AnimatedTextAreaProps> = ({ 
  label, 
  id, 
  className, 
  error, 
  success, 
  loading = false,
  value,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  useEffect(() => {
    setHasValue(!!value);
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  const inputClasses = `
    w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 font-sleek resize-none
    ${isFocused ? 'border-primary-400 ring-4 ring-primary-100' : 'border-primary-300'}
    ${error ? 'border-danger ring-4 ring-danger/20' : ''}
    ${success ? 'border-success ring-4 ring-success/20' : ''}
    ${loading ? 'opacity-60 cursor-not-allowed' : ''}
    focus:outline-none
  `;

  const labelClasses = `
    absolute left-4 transition-all duration-300 font-chic pointer-events-none
    ${isFocused || hasValue 
      ? '-top-2.5 left-3 text-xs bg-white px-1 text-primary-600' 
      : 'top-3.5 text-primary-500'
    }
    ${error ? 'text-danger' : ''}
    ${success ? 'text-success' : ''}
  `;

  return (
    <div className={`relative ${className || ''}`}>
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={id}
          className={inputClasses.trim()}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          value={value}
          disabled={loading}
          {...props}
        />
        
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-1 text-xs text-danger font-sleek animate-slide-in-left">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-1 text-xs text-success font-sleek animate-slide-in-left">
          {success}
        </div>
      )}
    </div>
  );
};
