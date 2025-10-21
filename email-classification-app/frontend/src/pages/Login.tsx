import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Classification
          </h1>
          <p className="text-gray-600">
            KI-gestützte E-Mail-Verwaltung für Steuerkanzleien
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <path
                fill="#f25022"
                d="M0 0h10v10H0z"
              />
              <path
                fill="#00a4ef"
                d="M11 0h10v10H11z"
              />
              <path
                fill="#7fba00"
                d="M0 11h10v10H0z"
              />
              <path
                fill="#ffb900"
                d="M11 11h10v10H11z"
              />
            </svg>
            <span className="font-medium">Mit Microsoft anmelden</span>
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Verwenden Sie Ihr Microsoft-Konto zum Anmelden</p>
        </div>
      </div>
    </div>
  );
}
