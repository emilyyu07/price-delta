import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDemo } from '../hooks/useDemo';
import { userApi } from '../api/user'; // Import userApi
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card'; // Assuming Card is also a common component

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth(); // Use refreshUser
  const { isDemoMode, user: demoUser } = useDemo();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Use demo user if in demo mode, otherwise use authenticated user
  const displayUser = isDemoMode ? demoUser : user;

  useEffect(() => {
    if (displayUser?.name) {
      setName(displayUser.name);
    }
  }, [displayUser]);

  const handleSave = async () => {
    // Disable save in demo mode
    if (isDemoMode) {
      setError('Profile editing is not available in demo mode.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!user) {
      setError('User not authenticated.');
      return;
    }
    if (name === user.name) {
      setMessage('No changes to save.');
      return;
    }

    setIsSaving(true);
    setMessage('');
    setError('');

    try {
      await userApi.updateProfile({ name });
      await refreshUser(); // Call refreshUser to update the context
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary-900 mb-2">Profile</h1>
        <p className="text-primary-600">The person behind the savings.</p>
      </div>

      <Card className="frosted-surface"> {/* Wrap content in Card for consistent styling */}
        <div className="mb-6">
          <Input
            id="email"
            type="email"
            label="Email"
            value={displayUser?.email || ''}
            disabled
            className="cursor-not-allowed bg-primary-100"
          />
          <p className="text-xs text-primary-500 mt-1">Email is locked in — like your commitment to a good deal.</p>
        </div>

        <div className="mb-6">
          <Input
            id="name"
            type="text"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            disabled={isDemoMode}
          />
          {isDemoMode && (
            <p className="text-xs text-primary-500 mt-1">Editing is disabled in demo mode.</p>
          )}
        </div>

        {message && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg mb-4">
            {message}
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <Button 
          onClick={handleSave}
          disabled={isSaving || isDemoMode}
          className="w-full md:w-auto"
          title={isDemoMode ? 'Not available in demo mode' : ''}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Card>
    </div>
  );
};
