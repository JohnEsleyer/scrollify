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

const initialMockData: NavData = {
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
  const [navData, setNavData] = useState<NavData>(initialMockData);
  
  
  const currentFolderId = currentPath.length > 0 
    ? currentPath[currentPath.length - 1] 
    : 'root';

  
  const dataFallback = { folders: [], notes: [], parentFolderId: 'root' };
  
  const currentData = navData[currentFolderId] || dataFallback;  
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
  

   const handleCreateFolder = () => {
    const folderName = prompt('Enter folder name:', `New Folder ${folders.length + 1}`);
    if (!folderName) return;

    const newFolder: Folder = {
      id: `f_${Date.now()}`,
      name: folderName,
      parentId: currentFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      type: 'folder',
    };

    setNavData(prevData => ({
      ...prevData,
      [currentFolderId]: { // Add folder to current list
        ...prevData[currentFolderId],
        folders: [...prevData[currentFolderId].folders, newFolder],
      },
      [newFolder.id]: { // Initialize data for the new folder
        parentFolderId: currentFolderId,
        folders: [],
        notes: [],
      },
    }));
  };

  const handleUpdateFolder = (folderId: string) => {
    const currentFolder = folders.find(f => f.id === folderId);
    if (!currentFolder) return;
    
    const newName = prompt('Rename folder:', currentFolder.name);
    if (!newName || newName === currentFolder.name) return;

    setNavData(prevData => ({
      ...prevData,
      [currentFolderId]: {
        ...prevData[currentFolderId],
        folders: prevData[currentFolderId].folders.map(f => 
          f.id === folderId ? { ...f, name: newName, updatedAt: Date.now() } : f
        ),
      },
    }));
  };

  const handleDeleteFolder = (folderId: string) => {
    // In a real app, this would recursively delete children. Here, we just filter it out.
    setNavData(prevData => {
      const { [folderId]: deleted, ...rest } = prevData;
      
      return {
        ...rest,
        [currentFolderId]: {
          ...prevData[currentFolderId],
          folders: prevData[currentFolderId].folders.filter(f => f.id !== folderId),
        },
      };
    });
  };

  const handleCreateNote = () => {
    const noteName = prompt('Enter note title:', `New Note ${notes.length + 1}`);
    if (!noteName) return;

    const newNote: Note = {
      id: `n_${Date.now()}`,
      name: noteName,
      parentId: currentFolderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      noteType: 'markdown', 
      type: 'note', 
      content: '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}', 
      preview: 'Start writing here...',
    };

    setNavData(prevData => ({
      ...prevData,
      [currentFolderId]: {
        ...prevData[currentFolderId],
        notes: [...prevData[currentFolderId].notes, newNote],
      },
    }));
    onNoteSelect(newNote.id); // Automatically select the new note
  };

  const handleUpdateNote = (noteId: string) => {
    const currentNote = notes.find(n => n.id === noteId);
    if (!currentNote) return;
    
    const newName = prompt('Rename note:', currentNote.name);
    if (!newName || newName === currentNote.name) return;

    setNavData(prevData => ({
      ...prevData,
      [currentFolderId]: {
        ...prevData[currentFolderId],
        notes: prevData[currentFolderId].notes.map(n => 
          n.id === noteId ? { ...n, name: newName, updatedAt: Date.now() } : n
        ),
      },
    }));
  };

  const handleDeleteNote = (noteId: string) => {
    setNavData(prevData => ({
      ...prevData,
      [currentFolderId]: {
        ...prevData[currentFolderId],
        notes: prevData[currentFolderId].notes.filter(n => n.id !== noteId),
      },
    }));
    // Deselect if the active note was deleted
    if (activeNoteId === noteId) {
        onNoteSelect(''); 
    }
  };

    
  const currentFolderName = currentPath.length > 0 
    ? navData[currentPath[currentPath.length - 1]]?.folders.find(f => f.id === currentFolderId)?.name || currentFolderId
    : 'Root';
    

  
  const isRoot = currentFolderId === 'root';
  const createButtonLabel = activeTab === 'folders' ? 'Folder' : 'Note';
  const handleCreateClick = activeTab === 'folders' ? handleCreateFolder : handleCreateNote;

  return (
    <div className="h-full flex flex-col p-4">
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
          Current: {currentFolderName}
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
            folders={folders as Folder[]} 
            onFolderClick={handleFolderClick}
            onUpdateFolder={handleUpdateFolder} 
            onDeleteFolder={handleDeleteFolder}
          />
        )}
        {activeTab === 'notes' && (
          <NoteList 
            notes={notes as Note[]} 
            onNoteClick={onNoteSelect}
            activeNoteId={activeNoteId}
            onUpdateNote={handleUpdateNote} 
            onDeleteNote={handleDeleteNote}
          />
        )}
      </div>

      {/* Create Button */}
      <div className="mt-4">
        <button 
          className="w-full py-2 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors"
          onClick={handleCreateClick}
        >
          <Plus size={18} />
          <span>Create New {createButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};


export default NavigatorComponent;