
import React, { useState, useEffect } from 'react';
import { SidebarWrapper } from './SidebarWrapper';
import ReusableMarkdownEditor from './ReusableMarkdownEditor';
import CodeEditorWebview from './CodeEditorWebview';
import { Whiteboard } from './whiteboard/Whiteboard';
import { SidebarItem, Note, NoteType } from '@/lib/types';
import { NoteTypeSelector } from './NoteTypeSelector'; 

import { db } from '@/lib/firebase'; 
import { doc, getDoc, updateDoc, Timestamp, DocumentSnapshot } from 'firebase/firestore'; 

interface CanvasComponentProps {
    initialData: string;
}


const CanvasComponent: React.FC<CanvasComponentProps> = ({ initialData }) => (
  <div className="flex justify-center items-center h-full text-2xl text-gray-500">
    Canvas Editor/Viewer Placeholder (Data: {initialData.length > 20 ? initialData.substring(0, 20) + '...' : initialData})
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

const initialSidebarItems: SidebarItem[] = [
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
  
const [noteData, setNoteData] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  useEffect(() => {
    if (!noteId) return;

    const fetchNote = async () => {
      setLoading(true);
      const docRef = doc(db, 'entities', noteId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const INITIAL_EMPTY_CONTENT = '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

        const isUninitializedDefaultNote = 
          data.noteType === 'markdown' && 
          data.content === INITIAL_EMPTY_CONTENT;
        
        // Check if the note is initialized (has a content field)
        const isInitialized = data.content !== undefined && data.content !== null;

        setNoteData({
            id: docSnap.id,
            name: data.name,
            parentId: data.parentId,
            createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
            updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now(),
            type: 'note',
            noteType: data.noteType || 'markdown', 
            content: data.content || '',
            preview: data.preview || '',
        } as Note); 
        
        setLoading(false);
        
        // Show the selector if content is empty (uninitialized)
        if (isUninitializedDefaultNote) {
          setShowTypeSelector(true);
        } else {
            // If the content is an empty string but the noteType has been set (e.g., webview), 
            // we assume it was initialized and then cleared, so we don't show the selector.
            setShowTypeSelector(false); 
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

  
  // Sidebar CRUD Handlers
  const handleCreateSideNote = () => {/* ... */};
  const handleUpdateSideNote = (id: string, newLabel: string) => {/* ... */};
  const handleDeleteSideNote = (id: string) => {/* ... */};
  
  // Render the appropriate editor/viewer
 const handleContentChange = React.useCallback(async (newContentJson: string) => {
    if (!noteId) return;
    
    setNoteData(prev => prev ? { ...prev, content: newContentJson, updatedAt: Date.now() } : null);
    
    try {
        const noteRef = doc(db, 'entities', noteId);
        
        await updateDoc(noteRef, {
            content: newContentJson,
            updatedAt: Timestamp.now(),
        });
        
        console.log(`[Firestore] Successfully saved content for note: ${noteId}`);
        
    } catch (error) {
        console.error("Failed to save note content:", error);
    }
  }, [noteId]);

  // --- 3. Renderers and Sidebar Logic ---
  
  // Render the appropriate editor/viewer
  const renderNoteContent = () => {
    if (!noteData) return null;
    
    // The handleContentChange function is now defined at the top level, 
    // so it doesn't violate the rules when used here.
    
    switch (noteData.noteType) {
      case 'markdown':
         return (
            <ReusableMarkdownEditor 
                key={noteData.id}
                content={noteData.content} 
                onChange={handleContentChange} 
            />
        );
      case 'webview':
        return (
            <CodeEditorWebview 
                key={noteData.id}
                initialContent={noteData.content} 
                onChange={handleContentChange} 
            />
        );
      case 'canvas':
        return <CanvasComponent initialData={noteData.content} />; 
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
                renderNoteContent()
            )}
          </div>
        </div>
      </SidebarWrapper>
    </div>
  );
};

export default NoteView;