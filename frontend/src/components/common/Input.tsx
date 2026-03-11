import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, className, ...props }) => {
  const inputClasses =
    "w-full px-4 py-2 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent font-sleek transition-all duration-300 " +
    (className ?? "");

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium font-chic text-primary-700 mb-2">
          {label}
        </label>
      )}
      <input id={id} className={inputClasses.trim()} {...props} />
    </div>
  );
};
