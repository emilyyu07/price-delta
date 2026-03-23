import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';
import { AmbientBackground } from '../components/layout/AmbientBackground';
import { enterDemoMode } from '../contexts/DemoContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
        setError(error.message);
      } else {
        console.log("Unknown error: ", error);
        setError("An unknown login error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ambient-page flex flex-col items-center justify-center px-4">
      <AmbientBackground tone="soft" />
      <div className={`w-full max-w-[28rem] ambient-content ambient-auth-shell transition-all duration-800 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        {/* Logo and branding */}
        <div className={`text-center mb-6 sm:mb-7 transition-all duration-800 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
          <div className="relative inline-block">
            <img 
              src="/favicon.png" 
              alt="PriceDelta" 
              className={`h-28 sm:h-32 w-auto mx-auto mb-3 transition-all duration-1000 delay-300 ${isVisible ? 'scale-100 rotate-0 opacity-100' : 'scale-75 rotate-12 opacity-0'}`}
            />
            {/* Subtle glow effect */}
            <div className={`absolute inset-0 h-28 sm:h-32 w-auto mx-auto mb-3 bg-primary-400/20 rounded-full blur-xl transition-all duration-1000 delay-400 ${isVisible ? 'scale-150 opacity-60' : 'scale-100 opacity-0'}`}></div>
          </div>
          <h1 className={`text-[2rem] sm:text-[2.2rem] leading-tight font-bold font-chic text-primary-900 transition-all duration-800 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            PriceDelta
          </h1>
          <p className={`text-sm sm:text-base text-primary-600 mt-2 font-sleek transition-all duration-800 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            Your wallet called. It wants a smarter you.
          </p>
        </div>

        {/* Login form */}
        <Card className={`frosted-surface transition-all duration-800 delay-600 ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'}`}>
          <h2 className="text-[1.7rem] sm:text-2xl font-bold font-chic text-primary-800 mb-5 sm:mb-6">Sign In</h2>
          
          <div className="space-y-4">
            <div className={`transition-all duration-600 delay-700 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="you@example.com"
                disabled={isLoading}
                helperText="Must be a valid email address"
              />
            </div>

            <div className={`transition-all duration-600 delay-800 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
              <Input
                id="password"
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                disabled={isLoading}
                helperText="Minimum 8 characters required"
              />
            </div>

            {error && (
              <div className={`text-red-600 text-sm bg-red-50 p-3 rounded-xl font-sleek transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}`}>
                {error}
              </div>
            )}

            <div className={`transition-all duration-600 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>

            <div className={`transition-all duration-600 delay-950 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <Button
                onClick={() => {
                  enterDemoMode();
                  navigate('/dashboard');
                }}
                variant="secondary"
                className="w-full text-sm text-primary-500"
              >
                View Demo
              </Button>
            </div>
          </div>

          <p className={`text-xs text-primary-500 text-center mt-2 font-sleek transition-all duration-600 delay-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            No account needed · Read-only demo
          </p>

          <p className={`text-sm text-primary-600 text-center mt-4 font-sleek transition-all duration-600 delay-1050 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-500 hover:underline font-chic transition-all duration-300 hover:scale-105 inline-block">
              Sign Up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
