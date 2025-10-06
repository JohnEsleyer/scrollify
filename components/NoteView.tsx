import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarWrapper } from './SidebarWrapper';
import ReusableMarkdownEditor from './ReusableMarkdownEditor';
import CodeEditorWebview from './CodeEditorWebview';
import { SidebarItem, Note, NoteType, SideNote } from '@/lib/types'; 
import { NoteTypeSelector } from './NoteTypeSelector'; 

import { db } from '@/lib/firebase'; 
import { 
    doc, getDoc, updateDoc, Timestamp, DocumentSnapshot, 
    collection, query, where, onSnapshot, addDoc, deleteDoc 
} from 'firebase/firestore'; 
import { SideNoteTypeSelector } from './SideNoteTypeSelector'; 
import { Whiteboard } from './whiteboard/Whiteboard';



const DEFAULT_WEBVIEW_CONTENT = 
`<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .text-red { color: red; font-family: sans-serif; }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p class="text-red">This is a simple demo.</p>
    <script>
        console.log("JavaScript executed!");
        // alert("Script loaded!"); // Commented out to prevent annoying alerts
    </script>
</body>
</html>`;

interface CanvasComponentProps {
    initialData: string;
}


const getInitialContent = (type: NoteType): string => {
    switch (type) {
        case 'markdown':
            return '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"Start writing...","type":"text","version":1}],"direction":".","format":"","indent":0,"type":"paragraph","version":1}],"direction":".","format":"","indent":0,"type":"root","version":1}}';
        case 'webview':
            return DEFAULT_WEBVIEW_CONTENT;
        case 'canvas':
            return '{"elements":[]}';;
        default:
            return '';
    }
};

const entityConverter = (snapshot: DocumentSnapshot) => {
    const data = snapshot.data();
    if (!data) return null;
    return {
        id: snapshot.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
        updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now(),
    };
};

interface NoteViewProps {
  noteId: string;
  onBack: () => void;
}


const SavingIndicator = ({ isSaving }: { isSaving: boolean }) => {
    return (
        <div className="absolute top-2 right-4 p-2 text-xs font-semibold z-10">
            {isSaving ? (
                <span className="text-yellow-400 bg-gray-900 px-2 py-1 rounded-md animate-pulse shadow-lg">Saving...</span>
            ) : (
                <span className="text-green-500 bg-gray-900 px-2 py-1 rounded-md shadow-lg">Saved</span>
            )}
        </div>
    );
};


const NoteView: React.FC<NoteViewProps> = ({ noteId, onBack }) => {
  const [noteData, setNoteData] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
   const [isSaving, setIsSaving] = useState(false);
  const [showSideNoteTypeSelector, setShowSideNoteTypeSelector] = useState(false);
  const [sideNotes, setSideNotes] = useState<SideNote[]>([]);

  const handleStartTyping = useCallback(() => {
      if (!isSaving) {
          setIsSaving(true);
      }
  }, [isSaving]);

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
        
        if (isUninitializedDefaultNote) {
          setShowTypeSelector(true);
        } else {
          setShowTypeSelector(false); 
        }
      } else {
        console.error("No such note document!");
        setNoteData(null);
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);


  useEffect(() => {
    if (!noteId) return;

    const sideNotesQuery = query(
      collection(db, 'entities'),
      where('parentId', '==', noteId),
      where('type', '==', 'side_note')
    );

    const unsubscribe = onSnapshot(sideNotesQuery, (snapshot) => {
        const fetchedSideNotes: SideNote[] = snapshot.docs.map(doc => entityConverter(doc) as SideNote);
        fetchedSideNotes.sort((a, b) => a.createdAt - b.createdAt); 
        setSideNotes(fetchedSideNotes);
    }, (error) => {
        console.error("Error fetching side notes: ", error);
    });

    return () => unsubscribe(); 
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

        setNoteData(prev => prev ? { ...prev, noteType: type, content: initialContent } : null);
        setShowTypeSelector(false);
    } catch (error) {
        console.error("Failed to initialize note type:", error);
        alert("Failed to save note type. Please try again.");
    }
  };

   const handleContentChange = useCallback(async (newContentJson: string) => {
    if (!noteId) return;
    
    setNoteData(prev => prev ? { ...prev, content: newContentJson, updatedAt: Date.now() } : null);
    
    try {
        const noteRef = doc(db, 'entities', noteId);
        await updateDoc(noteRef, {
            content: newContentJson,
            updatedAt: Timestamp.now(),
        });
        
        setIsSaving(false); 
        console.log(`[Firestore] Saved main note content: ${noteId}`);
        
    } catch (error) {
        console.error("Failed to save main note content:", error);
        setIsSaving(false); 
    }
  }, [noteId]);

  const handleSideNoteContentChange = useCallback(async (sideNoteId: string, newContentJson: string) => {
    setSideNotes(prevNotes => prevNotes.map(n => 
        n.id === sideNoteId ? { ...n, content: newContentJson, updatedAt: Date.now() } : n
    ));

    try {
        const sideNoteRef = doc(db, 'entities', sideNoteId);
        await updateDoc(sideNoteRef, {
            content: newContentJson,
            updatedAt: Timestamp.now(),
        });
        console.log(`[Firestore] Saved side note content: ${sideNoteId}`);
    } catch (error) {
        console.error("Failed to save side note content:", error);
    }
  }, []);


  const handleCreateSideNote = () => {
    setShowSideNoteTypeSelector(true);
  };

  const finalizeCreateSideNote = async (noteType: NoteType) => {
    if (!noteId) return;
    
    const noteName = prompt('Enter side note title:', `New Side Note ${sideNotes.length + 1}`);
    if (!noteName) {
        setShowSideNoteTypeSelector(false); 
        return;
    }

    const initialContent = getInitialContent(noteType);
    
    try {
      await addDoc(collection(db, 'entities'), {
        name: noteName,
        parentId: noteId, 
        type: 'side_note',
        noteType: noteType, 
        content: initialContent, 
        preview: 'Side note details...',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      setShowSideNoteTypeSelector(false);
    } catch (error) {
      console.error("Error creating side note: ", error);
      alert("Failed to create side note.");
      setShowSideNoteTypeSelector(false); 
    }
  };


  const handleUpdateSideNote = async (sideNoteId: string, newLabel: string) => {
    try {
      const sideNoteRef = doc(db, 'entities', sideNoteId);
      await updateDoc(sideNoteRef, {
        name: newLabel,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating side note: ", error);
      alert("Failed to rename side note.");
    }
  };
  
  const handleDeleteSideNote = async (sideNoteId: string) => {
    try {
      const sideNoteRef = doc(db, 'entities', sideNoteId);
      await deleteDoc(sideNoteRef);
    } catch (error) {
      console.error("Error deleting side note: ", error);
      alert("Failed to delete side note.");
    }
  };
  
  const mapSideNoteToComponent = useCallback((sideNote: SideNote) => {
      const onChangeHandler = (content: string) => handleSideNoteContentChange(sideNote.id, content);
      
      switch (sideNote.noteType) {
          case 'markdown':
              return (
                  <ReusableMarkdownEditor 
                      key={sideNote.id}
                      content={sideNote.content} 
                      onChange={onChangeHandler} 
                      onTyping={handleStartTyping} 
                  />
              );
          case 'webview':
              return (
                  <CodeEditorWebview 
                      key={sideNote.id}
                      initialContent={sideNote.content} 
                      onChange={onChangeHandler} 
                      onTyping={handleStartTyping} 
                  />
              );
          case 'canvas':
              return (
                  <Whiteboard
                      key={sideNote.id}
                      initialContent={sideNote.content} 
                      onChange={onChangeHandler}
                      onTyping={handleStartTyping} 
                  />
              ); 
          default:
              return <div>Unsupported side note type: {sideNote.noteType}.</div>;
      }
  }, [handleSideNoteContentChange, handleStartTyping]); 


  const sidebarItems: SidebarItem[] = useMemo(() => {
      return sideNotes.map(note => ({
          id: note.id,
          label: note.name,
          component: mapSideNoteToComponent(note),
      }));
  }, [sideNotes, mapSideNoteToComponent]);

  
  const renderNoteContent = () => {
    if (!noteData) return null;
    
    const INITIAL_EMPTY_CONTENT = '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}';

    const isUninitialized = 
    noteData.noteType === 'markdown' && 
    noteData.content === INITIAL_EMPTY_CONTENT;

    if (isUninitialized) {
      return null;
  }
  
    switch (noteData.noteType) {
      case 'markdown':
         return (
            <ReusableMarkdownEditor 
                key={noteData.id}
                content={noteData.content} 
                onChange={handleContentChange}
                onTyping={handleStartTyping}
            />
        );
      case 'webview':
        return (
            <CodeEditorWebview 
                key={noteData.id}
                initialContent={noteData.content} 
                onChange={handleContentChange}
                onTyping={handleStartTyping} 
            />
        );
      case 'canvas':
        return (
             <Whiteboard 
                key={noteData.id}
                initialContent={noteData.content} 
                onChange={handleContentChange}
                onTyping={handleStartTyping} 
            />
        ); 
      default:
        return <div>Unsupported note type: {noteData.noteType}.</div>;
    }
  };


  if (!noteId) return <div className="p-4 text-gray-400">Select a note to begin.</div>;
  if (loading) return <div className="p-4 text-gray-400">Loading note content...</div>;
  if (!noteData) return <div className="p-4 text-red-400">Error loading note.</div>;
  
  const defaultSidebarId = sidebarItems.length > 0 ? sidebarItems[0].id : 'no-side-notes';


  return (
    <div className="h-full">
      
      {showTypeSelector && (
          <NoteTypeSelector 
              onSelect={handleSelectNoteType} 
              onClose={() => setShowTypeSelector(false)}
          />
      )}

      {showSideNoteTypeSelector && (
          <SideNoteTypeSelector
              onSelect={finalizeCreateSideNote} 
              onClose={() => setShowSideNoteTypeSelector(false)}
          />
      )}
      
      <div className="lg:hidden p-4 bg-gray-900 border-b border-gray-700">
        <button 
          onClick={onBack}
          className="py-1 px-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ← Back to Notes
        </button>
        <h1 className="text-xl font-bold text-white mt-2">{noteData.name}</h1>
      </div>
      
      <SidebarWrapper 
        items={sidebarItems}
        defaultItemId={defaultSidebarId}
        onCreate={handleCreateSideNote}
        onUpdate={handleUpdateSideNote}
        onDelete={handleDeleteSideNote}
      >
        <div className="p-4 flex flex-col h-full relative">
          <SavingIndicator isSaving={isSaving} />
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