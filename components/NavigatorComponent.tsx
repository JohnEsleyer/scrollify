import React, { useCallback, useEffect, useState } from 'react';
import FolderList from '@/components/FolderList';
import NoteList from './NoteList';
import { ChevronLeft, Plus } from 'lucide-react';
import { Entity, Folder, Note } from '@/lib/types'; 
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, DocumentData, DocumentReference, DocumentSnapshot, Timestamp, addDoc, updateDoc, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore'; 

interface NavData {
    [parentId: string]: {
        folders: Folder[];
        notes: Note[];
        parentFolderId: string | 'root';
    };
}


const entityConverter = (snapshot: DocumentSnapshot<DocumentData>): Folder | Note => {
    const data = snapshot.data();
    if (!data) throw new Error("Document data not found.");

    const createdAt = (data.createdAt as Timestamp)?.toMillis() || Date.now();
    const updatedAt = (data.updatedAt as Timestamp)?.toMillis() || Date.now();

    const baseEntity: Entity = {
        id: snapshot.id, 
        name: data.name as string,
        parentId: data.parentId as string,
        createdAt: createdAt,
        updatedAt: updatedAt,
        type: data.type as 'folder' | 'note',
    };

    if (data.type === 'folder') {
        return baseEntity as Folder;
    } 
    
    return {
        ...baseEntity,
        noteType: data.noteType as any, 
        content: data.content as string,
        preview: data.preview as string,
    } as Note;
};


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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  const currentFolderId = currentPath.length > 0 
    ? currentPath[currentPath.length - 1] 
    : 'root';

  const handleFolderClick = (folderId: string) => {
    setCurrentPath(prevPath => [...prevPath, folderId]);
  };

  const handleNavigateBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(prevPath => prevPath.slice(0, -1));
    }
  };

  const toggleEntitySelection = useCallback((entityId: string) => {
    setSelectedEntityIds(prev =>
        prev.includes(entityId)
            ? prev.filter(id => id !== entityId)
            : [...prev, entityId]
    );
}, []);

  const handleMultiDeleteIfSelected = async (singleItemIdToDelete: string) => {
    
    // Determine the final set of IDs to delete
    const itemsToDelete = selectedEntityIds.length > 0 
        ? selectedEntityIds 
        : [singleItemIdToDelete]; // Fallback to deleting the single item if no boxes are checked
    
    if (itemsToDelete.length === 0) return;

    const isBulkDelete = itemsToDelete.length > 1 || selectedEntityIds.length > 0;
    
    const confirmationMessage = isBulkDelete
        ? `Are you sure you want to delete ${itemsToDelete.length} items and all their contents?`
        : `Are you sure you want to delete this item and all its contents?`;

    if (!window.confirm(confirmationMessage)) {
        return;
    }

    try {
        const cleanupPromises: Promise<void>[] = [];
        const rootBatch = writeBatch(db);

        // Perform Recursive Cleanup for all selected items ---
        itemsToDelete.forEach(id => cleanupPromises.push(deleteFolderContents(id)));
        await Promise.all(cleanupPromises);
        
        itemsToDelete.forEach(id => {
            rootBatch.delete(doc(db, 'entities', id));
        });

        await rootBatch.commit();

        setSelectedEntityIds([]);
        console.log(`Successfully deleted ${itemsToDelete.length} entities.`);

    } catch (error) {
        console.error("Error during delete operation:", error);
        alert("Failed to complete the delete operation.");
    }
};



  
  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds(prev =>
        prev.includes(folderId)
            ? prev.filter(id => id !== folderId)
            : [...prev, folderId]
      );
  };


  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
        prev.includes(noteId)
            ? prev.filter(id => id !== noteId)
            : [...prev, noteId]
    );
};

const handleMultiDelete = async () => {
    const allItemsToDelete = [...selectedFolderIds, ...selectedNoteIds];

    if (allItemsToDelete.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${allItemsToDelete.length} selected items and all their contents? This cannot be undone.`)) {
        return;
    }

    try {

        const cleanupPromises: Promise<void>[] = [];

        // Cleanup contents for selected folders (recursively deletes notes/sub-folders/side-notes)
        selectedFolderIds.forEach(id => cleanupPromises.push(deleteFolderContents(id)));
        
        // Cleanup contents for selected notes (recursively deletes side notes)
        selectedNoteIds.forEach(id => cleanupPromises.push(deleteFolderContents(id)));

        await Promise.all(cleanupPromises);
        
        
        //Delete the Root Documents in a single Firestore Batch ---
        const batch = writeBatch(db);
        allItemsToDelete.forEach(id => {
            const docRef = doc(db, 'entities', id);
            batch.delete(docRef);
        });

        await batch.commit();

        // Reset State ---
        setSelectedFolderIds([]);
        setSelectedNoteIds([]);
        setIsMultiSelecting(false);
        
        console.log(`Successfully deleted ${allItemsToDelete.length} items and their contents.`);

    } catch (error) {
        console.error("Error during multi-delete operation:", error);
        alert("Failed to complete the multi-delete operation.");
    }
};




  // CREATE Folder
  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:', `New Folder ${folders.length + 1}`);
    if (!folderName) return;

    try {
      await addDoc(collection(db, 'entities'), {
        name: folderName,
        parentId: currentFolderId,
        type: 'folder',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      // The onSnapshot listener will automatically update the state (folders/notes)
    } catch (error) {
      console.error("Error creating folder: ", error);
      alert("Failed to create folder.");
    }
  };

  // UPDATE Folder (Rename)
  const handleUpdateFolder = async (folderId: string) => {
    const currentFolder = folders.find(f => f.id === folderId);
    if (!currentFolder) return;
    
    const newName = prompt('Rename folder:', currentFolder.name);
    if (!newName || newName === currentFolder.name) return;

    try {
      const folderRef = doc(db, 'entities', folderId);
      await updateDoc(folderRef, {
        name: newName,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating folder: ", error);
      alert("Failed to rename folder.");
    }
  };

  const deleteFolderContents = async (parentId: string): Promise<void> => {
    const childrenQuery = query(
        collection(db, 'entities'),
        where('parentId', '==', parentId)
    );
    const childrenSnapshot = await getDocs(childrenQuery);

    if (childrenSnapshot.empty) {
        return;
    }

    const batch = writeBatch(db);
    const recursiveDeletePromises: Promise<void>[] = []; 

    childrenSnapshot.docs.forEach(childDoc => {
        const childData = childDoc.data();
        
        batch.delete(childDoc.ref);

        if (childData.type === 'folder' || childData.type === 'note') { 
            recursiveDeletePromises.push(deleteFolderContents(childDoc.id));
        }
    });

    await Promise.all(recursiveDeletePromises);
    await batch.commit();
};



 const handleDeleteFolder = (folderId: string) => {
    handleMultiDeleteIfSelected(folderId); 
};

  // CREATE Note
  const handleCreateNote = async () => {
    const noteName = prompt('Enter note title:', `New Note ${notes.length + 1}`);
    if (!noteName) return;

    try {
      const docRef = await addDoc(collection(db, 'entities'), {
        name: noteName,
        parentId: currentFolderId,
        type: 'note',
        noteType: 'markdown', 
        content: '{"root":{"children":[],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}', 
        preview: 'Start writing here...',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      onNoteSelect(docRef.id);
    } catch (error) {
      console.error("Error creating note: ", error);
      alert("Failed to create note.");
    }
  };

  // UPDATE Note (Rename)
  const handleUpdateNote = async (noteId: string) => {
    const currentNote = notes.find(n => n.id === noteId);
    if (!currentNote) return;
    
    const newName = prompt('Rename note:', currentNote.name);
    if (!newName || newName === currentNote.name) return;

    try {
      const noteRef = doc(db, 'entities', noteId);
      await updateDoc(noteRef, {
        name: newName,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating note: ", error);
      alert("Failed to rename note.");
    }
  };

  // DELETE Note
  const handleDeleteNote = (noteId: string) => {

    handleMultiDeleteIfSelected(noteId); 
};


  useEffect(() => {
    setIsLoading(true);
    
    // Query for Folders
    const foldersQuery = query(
      collection(db, 'entities'),
      where('type', '==', 'folder'),
      where('parentId', '==', currentFolderId)
    );
    
    // Query for Notes
    const notesQuery = query(
      collection(db, 'entities'),
      where('type', '==', 'note'),
      where('parentId', '==', currentFolderId)
    );

    // folder listener
    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
        const fetchedFolders: Folder[] = snapshot.docs.map(doc => entityConverter(doc) as Folder);
        setFolders(fetchedFolders);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching folders: ", error);
        setIsLoading(false);
    });

    // Setup notes listener
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
        const fetchedNotes: Note[] = snapshot.docs.map(doc => entityConverter(doc) as Note);
        setNotes(fetchedNotes);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching notes: ", error);
        setIsLoading(false);
    });


    // Cleanup function: stop listening when component unmounts or currentFolderId changes
    return () => {
      unsubscribeFolders();
      unsubscribeNotes();
    };
  }, [currentFolderId]);
    
  const currentFolderName = currentFolderId === 'root' 
    ? 'Root' 
    : folders.find(f => f.id === currentFolderId)?.name || '...';
  
  const isRoot = currentFolderId === 'root';
  const createButtonLabel = activeTab === 'folders' ? 'Folder' : 'Note';
  const handleCreateClick = activeTab === 'folders' ? handleCreateFolder : handleCreateNote;

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
      <div className="flex space-x-2 p-2">

</div>
      
      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        {isLoading && <p className="text-gray-500 italic p-2">Loading...</p>}
        {!isLoading && activeTab === 'folders' && (
          <FolderList 
            folders={folders} 
            onFolderClick={handleFolderClick}
            onUpdateFolder={handleUpdateFolder} 
            onDeleteFolder={handleDeleteFolder}
            selectedEntityIds={selectedEntityIds}
            toggleEntitySelection={toggleEntitySelection}
          />
        )}
        {!isLoading && activeTab === 'notes' && (
          <NoteList 
            notes={notes} 
            onNoteClick={onNoteSelect}
            activeNoteId={activeNoteId}
            onUpdateNote={handleUpdateNote} 
            onDeleteNote={handleDeleteNote}
            selectedEntityIds={selectedEntityIds}
            toggleEntitySelection={toggleEntitySelection} 
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