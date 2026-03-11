import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { TrendingDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await register(email, password);
      // After successful registration, the AuthProvider will automatically log in the user
      // and App.tsx will handle the redirection to the home page.
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <TrendingDown className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold font-chic text-primary-900">PriceDelta</h1>
          <p className="text-primary-600 mt-2 font-sleek">Want to start saving big? Create an account!</p>
        </div>

        {/* Registration form */}
        <Card>
          <h2 className="text-2xl font-bold font-chic text-primary-800 mb-6">Sign Up</h2>
          
          <div className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl font-sleek">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </Button>
          </div>

          <p className="text-sm text-primary-600 text-center mt-4 font-sleek">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-500 hover:underline font-chic">
              Sign In
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};
