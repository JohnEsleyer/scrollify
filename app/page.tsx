// app/page.tsx
'use client'

import React, { useState } from 'react';
import NavigatorComponent from '@/components/NavigatorComponent';
import NoteView from '@/components/NoteView';
import { ViewState } from '@/lib/types'; 
// NOTE: You might need to adjust the import path for your Layout component based on where you moved it.

const AppContainer: React.FC = () => {
  // State to track the currently active note ID
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  // State to manage the active view on mobile: 'navigator' or 'note'
  const [mobileView, setMobileView] = useState<ViewState>('navigator');

  // Function called when a note is selected in the Navigator
  const handleNoteSelect = (noteId: string) => {
    setActiveNoteId(noteId);
    setMobileView('note'); 
  };
  
  // Function to switch back to the navigator (for mobile 'back' button)
  const handleBackToNavigator = () => {
    setMobileView('navigator');
    setActiveNoteId(null); 
  };

  // The component returns your main application structure
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

      {/* 2. Note View - Always visible on desktop, conditionally rendered on mobile */}
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

export default AppContainer;