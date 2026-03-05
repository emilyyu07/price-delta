import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (error) {
        if (error instanceof Error){
            console.log(error.message);
        }else{
            console.log("Unknown error: ",error);
        }
        setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <img src="/favicon.png" alt="PriceDelta" className="h-40 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-primary-900">PriceDelta</h1>
          <p className="text-primary-600 mt-2">Your wallet called. It wants a smarter you.</p>
        </div>

        {/* Login form */}
        <Card>
          <h2 className="text-2xl font-bold text-primary-800 mb-6">Sign In</h2>
          
          <div className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="you@example.com"
              disabled={isLoading}
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="••••••••"
              disabled={isLoading}
            />

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>

          <p className="text-sm text-primary-600 text-center mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};