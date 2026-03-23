import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthProvider';
import { DemoProvider } from './contexts/DemoContext';
import './index.css';

/**
 * Application root
 * Wraps App with all necessary context providers
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DemoProvider>
  </React.StrictMode>
);