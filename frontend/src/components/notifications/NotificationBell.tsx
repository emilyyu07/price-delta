import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  return (
    <div className="relative">
      <button className="p-2 text-primary-600 hover:text-primary-800 transition-colors">
        <Bell className="h-6 w-6" />
      </button>
    </div>
  );
};
