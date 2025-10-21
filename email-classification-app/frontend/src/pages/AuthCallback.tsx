import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          console.error('Authentication error:', error);
          navigate('/login?error=' + error);
          return;
        }

        if (!token) {
          navigate('/login?error=no_token');
          return;
        }

        // Save token
        localStorage.setItem('access_token', token);

        // Refresh user data
        await refreshUser();

        // Redirect to dashboard
        navigate('/', { replace: true });

      } catch (error) {
        console.error('Failed to handle auth callback:', error);
        navigate('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
