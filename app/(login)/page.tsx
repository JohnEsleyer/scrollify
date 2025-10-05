
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthState } from '@/lib/firebase';
import { SignInPage } from '@/components/SignInPage'; 
import { User } from 'firebase/auth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {

    const unsubscribe = checkAuthState((user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        router.replace('/home'); 
      }
      // If user is null, stay on this page
    });

    // Clean up the listener on component unmount
    return () => unsubscribe();
  }, [router]);


  const handleAuthSuccess = (uid: string) => {
    console.log(`User logged in with UID: ${uid}. Redirecting...`);
    router.replace('/home');
  };

  // If loading, show loading screen
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