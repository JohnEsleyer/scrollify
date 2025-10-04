// components/NoteView.tsx
import React, { useState, useEffect } from 'react';
import { SidebarWrapper } from './SidebarWrapper';
import ReusableMarkdownEditor from './ReusableMarkdownEditor';
import CodeEditorWebview from './CodeEditorWebview';
import { Whiteboard } from './whiteboard/Whiteboard';
import { SidebarItem, Note, NoteType } from '@/lib/types';
import { NoteTypeSelector } from './NoteTypeSelector'; // 💡 Import Selector

// 💡 Import Firebase
import { db } from '@/lib/firebase'; 
import { doc, getDoc, updateDoc, Timestamp, DocumentSnapshot } from 'firebase/firestore'; 



interface CanvasComponentProps {
    initialData: string;
}


const CanvasComponent: React.FC<CanvasComponentProps> = ({ initialData }) => (
  <div className="flex justify-center items-center h-full text-2xl text-gray-500">
    🎨 Canvas Editor/Viewer Placeholder (Data: {initialData.length > 20 ? initialData.substring(0, 20) + '...' : initialData})
  </div>
);

const getInitialContent = (type: NoteType): string => {
    switch (type) {
        case 'markdown':
            return '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"Start writing...","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';
        case 'webview':
            return '// HTML/CSS/JS code here';
        case 'canvas':
            return '{"shapes":[]}';
        default:
            return '';
    }
};

// --- MOCK SIDEBAR ITEMS (Initial State - remains the same) ---
const initialSidebarItems: SidebarItem[] = [
  // ... (references, attachments, sketchpad items) ...
  { id: 'references', label: 'References (Markdown)', component: <ReusableMarkdownEditor content='{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"Reference details...","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}'/> },
  { id: 'attachments', label: 'Attachments (Webview)', component: <CodeEditorWebview /> },
  { id: 'sketchpad', label: 'Sketchpad (WhiteBoard)', component: <Whiteboard /> },
];


interface NoteViewProps {
  noteId: string;
  onBack: () => void;
}


const NoteView: React.FC<NoteViewProps> = ({ noteId, onBack }) => {
  const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>(initialSidebarItems);
  
  // 💡 NEW States
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // --- 1. Fetch Note Data from Firestore ---
  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      setLoading(true);
      const docRef = doc(db, 'entities', noteId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if the note is initialized (has a content field)
        const isInitialized = data.content !== undefined && data.content !== null;

        setNoteData({
            id: docSnap.id,
            name: data.name,
            parentId: data.parentId,
            createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
            updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now(),
            type: 'note',
            noteType: data.noteType || 'markdown', // Default to markdown if missing
            content: data.content || '',
            preview: data.preview || '',
        } as Note); // Cast to Note type
        
        setLoading(false);
        
        // Show the selector if content is empty (uninitialized)
        if (!isInitialized) {
            setShowTypeSelector(true);
        }
      } else {
        // Should not happen if Navigator is working correctly, but good for error handling
        console.error("No such note document!");
        setNoteData(null);
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);


  // --- 2. Handler for Note Type Selection (Saves to Firestore) ---
  const handleSelectNoteType = async (type: NoteType) => {
    if (!noteData) return;
    
    const initialContent = getInitialContent(type);
    
    try {
        const noteRef = doc(db, 'entities', noteId);
        
        await updateDoc(noteRef, {
            noteType: type,
            content: initialContent,
            updatedAt: Timestamp.now(),
        });

        // Update local state and close modal
        setNoteData(prev => prev ? { ...prev, noteType: type, content: initialContent } : null);
        setShowTypeSelector(false);
    } catch (error) {
        console.error("Failed to initialize note type:", error);
        alert("Failed to save note type. Please try again.");
    }
  };


  // --- 3. Renderers and Sidebar Logic (CRUD handlers remain the same) ---
  
  // Sidebar CRUD Handlers (remain the same as previous step)
  const handleCreateSideNote = () => {/* ... */};
  const handleUpdateSideNote = (id: string, newLabel: string) => {/* ... */};
  const handleDeleteSideNote = (id: string) => {/* ... */};
  
  // Render the appropriate editor/viewer
  const renderNoteContent = () => {
    if (!noteData) return null;
    

    const handleContentChange = (newContentJson: string) => {
        console.log("Note content changed:", newContentJson);
        // TODO: Implement actual Firestore updateDoc here, likely debounced
    };

    switch (noteData.noteType) {
      case 'markdown':
            console.log("Content being passed to editor:", noteData.content);
        // Assuming your ReusableMarkdownEditor has an onChange for saving
          return (
            <ReusableMarkdownEditor 
                key={noteData.id} // <--- ADD THIS LINE
                content={noteData.content} 
                onChange={handleContentChange} 
            />
        );
      case 'webview':
        // Assuming CodeEditorWebview takes content prop
        return <CodeEditorWebview initialContent={noteData.content} />;
      case 'canvas':
        return <CanvasComponent initialData={noteData.content} />; // Pass data for canvas
      default:
        return <div>Unsupported note type: {noteData.noteType}.</div>;
    }
  };


  if (!noteId) return <div className="p-4 text-gray-400">Select a note to begin.</div>;
  if (loading) return <div className="p-4 text-gray-400">Loading note content...</div>;
  if (!noteData) return <div className="p-4 text-red-400">Error loading note.</div>;
  
  const defaultSidebarId = sidebarItems.length > 0 ? sidebarItems[0].id : '';


  return (
    <div className="h-full">
      
      {/* 💡 NOTE TYPE SELECTION MODAL */}
      {showTypeSelector && (
          <NoteTypeSelector 
              onSelect={handleSelectNoteType} 
              onClose={() => setShowTypeSelector(false)}
          />
      )}
      
      {/* Mobile Back Button and Title */}
      <div className="lg:hidden p-4 bg-gray-900 border-b border-gray-700">
        <button 
          onClick={onBack}
          className="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ← Back to Notes
        </button>
        <h1 className="text-xl font-bold text-white mt-2">{noteData.name}</h1>
      </div>
      
      {/* Main View */}
      <SidebarWrapper 
        items={sidebarItems}
        defaultItemId={defaultSidebarId}
        onCreate={handleCreateSideNote}
        onUpdate={handleUpdateSideNote}
        onDelete={handleDeleteSideNote}
      >
        <div className="p-4 flex flex-col h-full">
          <h1 className="hidden lg:block text-2xl font-extrabold text-white mb-4 border-b pb-2 border-gray-700">
            {noteData.name}
          </h1>
          <div className="flex-grow overflow-y-auto">
            {noteData.content === '' && !showTypeSelector ? (
                // If data is fetched but content is empty, display a button to open modal
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <p className="mb-4 text-lg">This note is uninitialized.</p>
                    <button 
                        onClick={() => setShowTypeSelector(true)}
                        className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Choose Note Type to Start
                    </button>
                </div>
            ) : (
                // Render content if it exists or if the type has just been selected
                renderNoteContent()
            )}
          </div>
        </div>
      </SidebarWrapper>
    </div>
  );
};

export default NoteView;