'use client'
import React, { useState, FormEvent } from 'react';
import { auth } from '@/lib/firebase'; 
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    AuthError
} from 'firebase/auth';

interface SignInPageProps {
  onAuthSuccess: (uid: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onAuthSuccess }) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isSigningUp) {
        // --- SIGN UP ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user.uid);
      } else {
        // --- SIGN IN ---
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user.uid);
      }
    } catch (err: any) {
      // Handle Firebase-specific errors
      const authError = err as AuthError;
      
      let errorMessage = "An unknown error occurred.";
      if (authError.code) {
        // Map common Firebase auth error codes to friendly messages
        switch (authError.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Invalid email or password.';
                break;
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password must be at least 6 characters.';
                break;
            default:
                errorMessage = authError.code.replace('auth/', '').replace(/-/g, ' ');
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        
        <h2 className="text-3xl font-extrabold text-white text-center">
          {isSigningUp ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 text-sm text-red-300 bg-red-800/30 rounded-lg border border-red-700" role="alert">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2 px-4 text-lg font-semibold rounded-lg transition-colors ${
              isLoading 
                ? 'bg-blue-700/70 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            disabled={isLoading}
          >
            {isLoading 
              ? (isSigningUp ? 'Signing Up...' : 'Signing In...')
              : (isSigningUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center text-sm text-gray-400">
          {isSigningUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsSigningUp(prev => !prev);
              setError(null); 
            }}
            className="ml-2 font-medium text-blue-400 hover:text-blue-300 focus:outline-none"
            disabled={isLoading}
          >
            {isSigningUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};