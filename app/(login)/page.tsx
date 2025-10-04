// app/page.tsx (This will serve as the Login Page)

'use client'; // Client Component for hooks and Firebase

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation'; // Next.js router for redirection
import { checkAuthState } from '@/lib/firebase';
import { SignInPage } from '@/components/SignInPage'; // Your component from the last step
import { User } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 1. Set up Firebase Auth listener
    const unsubscribe = checkAuthState((user) => {
      setUser(user);
      setLoading(false);
      
      // 2. Handle immediate redirection if user is found
      if (user) {
        // Redirect to /home if authenticated
        router.replace('/home'); 
      }
      // If user is null, stay on this page
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, [router]);


  const handleAuthSuccess = (uid: string) => {
    // Firebase listener in useEffect should catch this and redirect,
    // but we can force it here for immediate response.
    console.log(`User logged in with UID: ${uid}. Redirecting...`);
    router.replace('/home');
  };

  // If loading, show a simple loading screen
  if (loading || user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-xl">Loading authentication state...</div>
        </div>
    );
  }

  return <SignInPage onAuthSuccess={handleAuthSuccess} />;
};

export default LoginPage;