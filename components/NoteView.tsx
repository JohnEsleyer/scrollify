// components/NoteView.tsx
import React, { useState } from 'react';
import { SidebarWrapper } from './SidebarWrapper'; // Import your component
import ReusableMarkdownEditor from './ReusableMarkdownEditor'; // Your markdown component
import CodeEditorWebview from './CodeEditorWebview';
import { SidebarItem } from '@/lib/types';
import { Whiteboard } from './whiteboard/Whiteboard';

// Assuming your note type
type NoteType = 'markdown' | 'webview' | 'canvas';

interface NoteViewProps {
  noteId: string;
  onBack: () => void; // For mobile back button
}

// Mock data and components for demonstration
const mockNoteData = {
  title: 'My Awesome Note',
  type: 'markdown' as NoteType, // or 'webview', or 'canvas'
  content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"This is a new note!","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}', // Lexical JSON
};

const CanvasComponent = () => (
  <div className="flex justify-center items-center h-full text-2xl text-gray-500">
    🎨 Canvas Editor/Viewer Placeholder
  </div>
);

// Mock Sidebar Items for a Note
const initialSidebarItems: SidebarItem[] = [
  { 
    id: 'references', 
    label: 'References (Markdown)', 
    component: <ReusableMarkdownEditor content='{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"Reference details...","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'/> 
  },
  { id: 'attachments', label: 'Attachments (Webview)', component: <CodeEditorWebview /> },
  { id: 'sketchpad', label: 'Sketchpad (WhiteBoard)', component: <Whiteboard /> },
];



const NoteView: React.FC<NoteViewProps> = ({ noteId, onBack }) => {
   // 💡 State for Sidebar Items
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(initialSidebarItems);
  
  // 💡 CRUD Handlers
  
  // CREATE
  const handleCreateSideNote = () => {
    const newId = Date.now().toString();
    const newItem: SidebarItem = {
      id: newId,
      label: `New Side Note ${sidebarItems.length + 1}`,
      // Default to a simple markdown editor for new notes
      component: <ReusableMarkdownEditor content='{"root":{"children":[{"children":[],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}' />,
    };
    setSidebarItems(prev => [...prev, newItem]);
  };

  // UPDATE (Rename)
  const handleUpdateSideNote = (id: string, newLabel: string) => {
    if (!newLabel || newLabel.trim() === '') return;
    setSidebarItems(prev => prev.map(item => 
      item.id === id ? { ...item, label: newLabel } : item
    ));
  };

  // DELETE
  const handleDeleteSideNote = (id: string) => {
    setSidebarItems(prev => prev.filter(item => item.id !== id));
    
    // Logic to select a new default item if the active one is deleted
    // (Optional: You would also need to update activeItemId in SidebarWrapper's state after deletion)
  };

  
  
    if (!noteId) return <div>Select a note to begin.</div>;

  // Placeholder for fetching data
  const noteData = mockNoteData;
  const loading = false;
    const defaultSidebarId = sidebarItems.length > 0 ? sidebarItems[0].id : '';

  // Render the appropriate editor/viewer
  const renderNoteContent = () => {
    switch (noteData.type) {
      case 'markdown':
        return <ReusableMarkdownEditor content={noteData.content} onChange={() => {/* save logic */}} />;
      case 'webview':
        // The CodeEditorWebview already has its own state management for code
        return <CodeEditorWebview />;
      case 'canvas':
        return <CanvasComponent />;
      default:
        return <div>Unsupported note type.</div>;
    }
  };


  return (
    <div className="h-full">
      <div className="lg:hidden p-4 bg-gray-900 border-b border-gray-700">
        <button 
          onClick={onBack}
          className="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ← Back to Notes
        </button>
        <h1 className="text-xl font-bold text-white mt-2">{noteData.title}</h1>
      </div>
      
      {/* The SidebarWrapper now contains the main note content. */}
      {/* The main content area in SidebarWrapper is what renders the main note. */}
      {/* We slightly modify SidebarWrapper to *always* display the main content
          and use the `items` for the side-notes panel. */}
      <SidebarWrapper 
        items={sidebarItems} // 💡 Pass state data
        defaultItemId={defaultSidebarId}
        // 💡 Pass CRUD handlers
        onCreate={handleCreateSideNote}
        onUpdate={handleUpdateSideNote}
        onDelete={handleDeleteSideNote}
      >
        <div className="p-4 flex flex-col h-full">
          <h1 className="hidden lg:block text-2xl font-extrabold text-white mb-4 border-b pb-2 border-gray-700">
            {noteData.title}
          </h1>
          <div className="flex-grow overflow-y-auto">
            {loading ? <div>Loading...</div> : renderNoteContent()}
          </div>
        </div>
      </SidebarWrapper>
    </div>
  );
};

export default NoteView;