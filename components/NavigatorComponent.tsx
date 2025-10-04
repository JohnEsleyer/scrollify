import React, { useState } from 'react';
import FolderList from '@/components/FolderList';
import NoteList from './NoteList';
import { ChevronLeft, Plus } from 'lucide-react';
import { Folder, Note } from '@/lib/types'; 

interface NavData {
    [parentId: string]: {
        folders: Folder[];
        notes: Note[];
        parentFolderId: string | 'root';
    };
}

const mockData: NavData = {
    'root': {
        parentFolderId: 'root',
        folders: [
            { id: 'f1', name: 'Work Projects', parentId: 'root', createdAt: 0, updatedAt: 0, type: 'folder' },
            { id: 'f2', name: 'Personal', parentId: 'root', createdAt: 0, updatedAt: 0, type: 'folder' },
        ],
        notes: [
            { id: 'n_r1', name: 'Root Note A', parentId: 'root', createdAt: 0, updatedAt: 0, noteType: 'markdown', type: 'note', content: '{}', preview: '...' },
        ]
    },
    'f1': {
        parentFolderId: 'root',
        folders: [
            { id: 'f1_a', name: 'Client A', parentId: 'f1', createdAt: 0, updatedAt: 0, type: 'folder' },
        ],
        notes: [
            { id: 'n_f1', name: 'Project Status', parentId: 'f1', createdAt: 0, updatedAt: 0, noteType: 'markdown', type: 'note', content: '{}', preview: '...' },
        ]
    },
    'f1_a': {
        parentFolderId: 'f1',
        folders: [],
        notes: [
            { id: 'n_f1a', name: 'Meeting Minutes', parentId: 'f1_a', createdAt: 0, updatedAt: 0, noteType: 'markdown', type: 'note', content: '{}', preview: '...' },
        ]
    },
};


interface NavigatorProps {
  onNoteSelect: (noteId: string) => void;
  activeNoteId: string | null;
}

const NavigatorComponent: React.FC<NavigatorProps> = ({ onNoteSelect, activeNoteId }) => {
  const [activeTab, setActiveTab] = useState<'folders' | 'notes'>('notes');
  const [currentPath, setCurrentPath] = useState<string[]>([]); 
  
  // Determine the current folder ID based on the path array
  const currentFolderId = currentPath.length > 0 
    ? currentPath[currentPath.length - 1] 
    : 'root';

  
  const dataFallback = { folders: [], notes: [], parentFolderId: 'root' };
  
  const currentData = mockData[currentFolderId] || dataFallback;
  const folders = currentData.folders;
  const notes = currentData.notes;
  

  const handleFolderClick = (folderId: string) => {
    // Navigate IN: Add the new folder ID to the path
    setCurrentPath(prevPath => [...prevPath, folderId]);
  };

  const handleNavigateBack = () => {
    if (currentPath.length > 0) {
      // Navigate OUT: Remove the last folder ID from the path
      setCurrentPath(prevPath => prevPath.slice(0, -1));
    }
  };
  
  const isRoot = currentFolderId === 'root';
  const createButtonLabel = activeTab === 'folders' ? 'Folder' : 'Note';

  return (
    <div className="h-full flex flex-col p-4">
      {/* Back Button and Current Location Label */}
      <div className="mb-4 flex items-center">
        <button 
          onClick={handleNavigateBack}
          disabled={isRoot}
          className="p-2 mr-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={isRoot ? "You are at the root level" : "Go Up"}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm text-gray-400 truncate">
          {isRoot ? 'Root' : `Current: ${currentData.parentFolderId === 'root' ? 'Root' : currentData.parentFolderId}/${currentFolderId}`}          {/* In a real app, you'd show the folder name, not the ID */}
        </span>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-600 mb-4">
        <button 
          className={`flex-1 p-2 transition-colors ${activeTab === 'folders' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('folders')}
        >
          Folders
        </button>
        <button 
          className={`flex-1 p-2 transition-colors ${activeTab === 'notes' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        {activeTab === 'folders' && (
          <FolderList 
            // Pass the filtered folders based on currentFolderId
            folders={folders as Folder[]} 
            onFolderClick={handleFolderClick}
          />
        )}
        {activeTab === 'notes' && (
          <NoteList 
            // Pass the filtered notes based on currentFolderId
            notes={notes as Note[]} 
            onNoteClick={onNoteSelect}
            activeNoteId={activeNoteId}
          />
        )}
      </div>

      {/* Create Button */}
      <div className="mt-4">
        <button 
          className="w-full py-2 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
          onClick={() => alert(`Create New ${createButtonLabel} in folder ${currentFolderId}`)} // Placeholder CRUD action
        >
          <Plus size={18} />
          <span>Create New {createButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default NavigatorComponent;