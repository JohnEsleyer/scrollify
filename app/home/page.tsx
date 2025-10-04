// app/home/page.tsx

'use client'; // Client Component for hooks and Firebase

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuthState } from '@/lib/firebase';
import { ViewState } from '@/lib/types';
import NavigatorComponent from '@/components/NavigatorComponent';
import NoteView from '@/components/NoteView';

const HomePage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<ViewState>('navigator');


  // --- AUTH CHECK ---
  useEffect(() => {
    const unsubscribe = checkAuthState((user) => {
      if (user) {
        setIsAuth(true);
      } else {
        // Redirect to login page if unauthenticated
        router.replace('/'); 
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading || !isAuth) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-xl">Loading application...</div>
        </div>
    );
  }

  // --- HOME PAGE LOGIC (Your Provided Component) ---

  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId);
    setMobileView('note'); 
  };
  
  const handleBackToNavigator = () => {
    setMobileView('navigator');
    setActiveNoteId(null); 
  };

  return (
    <div className="flex h-screen overflow-hidden">
      
      {/* Main Navigator - Always visible on desktop, conditionally rendered on mobile */}
      <div 
        className={`
          w-full lg:w-80 flex-shrink-0 bg-gray-900 text-white border-r border-gray-700
          ${activeNoteId && mobileView === 'note' ? 'hidden lg:block' : 'block'}
          overflow-y-auto
        `}
      >
        <NavigatorComponent 
          onNoteSelect={handleNoteSelect} 
          activeNoteId={activeNoteId}
        />
      </div>

      {/* Note View - Always visible on desktop, conditionally rendered on mobile */}
      {activeNoteId && (
        <div 
          className={`
            flex-grow overflow-hidden bg-gray-800
            ${mobileView === 'note' ? 'block' : 'hidden lg:block'}
          `}
        >
          <NoteView 
            noteId={activeNoteId} 
            onBack={handleBackToNavigator} 
          />
        </div>
      )}

      {!activeNoteId && (
        <div className="hidden lg:flex flex-grow justify-center items-center bg-gray-800 text-gray-400">
          Select a note to view its content.
        </div>
      )}
    </div>
  );
};

export default HomePage;