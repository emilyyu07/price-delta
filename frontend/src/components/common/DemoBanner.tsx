import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../hooks/useDemo';
import { exitDemoMode } from '../../contexts/demoHelpers';
import { Info, X } from 'lucide-react';

/**
 * DemoBanner - Displays a sticky banner at the top of the page when in demo mode
 * Shows a message about viewing sample data and provides an exit button
 */
export const DemoBanner: React.FC = () => {
  const { isDemoMode } = useDemo();
  const navigate = useNavigate();

  if (!isDemoMode) {
    return null;
  }

  const handleExitDemo = () => {
    exitDemoMode();
    navigate('/login');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-primary-100 border-b-2 border-primary-300 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Info className="h-5 w-5 text-primary-700 flex-shrink-0" />
          <p className="text-sm font-medium text-primary-800 font-sleek">
            You're viewing a demo with sample data. Run the backend locally for full functionality.
          </p>
        </div>
        <button
          onClick={handleExitDemo}
          className="flex items-center gap-2 px-4 py-1.5 bg-primary-700 text-white rounded-lg hover:bg-primary-600 transition-all duration-200 font-semibold text-sm font-chic flex-shrink-0"
        >
          <X className="h-4 w-4" />
          Exit Demo
        </button>
      </div>
    </div>
  );
};
