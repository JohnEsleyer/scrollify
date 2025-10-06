import React from 'react';
import { Note, NoteType } from '@/lib/types';
import { 
    FileText as MarkdownIcon, 
    Code as CodeIcon, 
    FilePen as FilePenIcon, 
    Trash as TrashIcon, 
    AppWindow
} from 'lucide-react';


const getNoteIcon = (noteType: NoteType) => {
    switch (noteType) {
        case 'markdown':
            return <MarkdownIcon className="text-blue-400 flex-shrink-0 w-5 h-5" />;
        case 'webview':
            return <CodeIcon className="text-green-400 flex-shrink-0 w-5 h-5" />;
        case 'canvas':
            return <AppWindow className="text-pink-400 flex-shrink-0 w-5 h-5" />;
        default:
            return <MarkdownIcon className="text-gray-400 flex-shrink-0 w-5 h-5" />;
    }
};


interface NoteListProps {
  notes: Note[]; 
  onNoteClick: (noteId: string) => void;
  activeNoteId: string | null;
  onUpdateNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void; 
  selectedEntityIds: string[];
  toggleEntitySelection: (entityId: string) => void;
  
}

const NoteList: React.FC<NoteListProps> = (
    { 
        notes, 
        onNoteClick, 
        activeNoteId, 
        onUpdateNote, 
        onDeleteNote,
        selectedEntityIds,
        toggleEntitySelection 
    }) => {
        
  const handleUpdate = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation(); 
    onUpdateNote?.(noteId);
    console.log(`Update note: ${noteId}`);
  };

   const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    onDeleteNote?.(noteId);
    console.log(`Triggering delete for: ${noteId}`);
  };

    const sortedNotes = notes.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-1">
      {sortedNotes.length === 0 ? (
        <p className="text-gray-500 italic p-2">No notes found in this folder.</p>
      ) : (
        sortedNotes.map((note) => (
          <div
            key={note.id}
            className={`
              p-3 rounded-lg cursor-pointer transition-colors duration-150 border-l-4
              flex items-start space-x-3 // 👈 Alignment for checkbox and content
              ${activeNoteId === note.id
                ? 'bg-blue-600/50 border-blue-400'
                : 'hover:bg-gray-700/50 border-transparent'
              }
            `}
          >

              <input
                type="checkbox"
                checked={selectedEntityIds.includes(note.id)}
                onChange={(e) => {
                    e.stopPropagation();
                    toggleEntitySelection(note.id);
                }}
                className="
                    mt-1 // Adjust vertical position slightly due to items-start
                    h-5 w-5 
                    text-blue-500 bg-gray-700 border-gray-500 
                    rounded focus:ring-blue-500 cursor-pointer flex-shrink-0
                "
              />

             <div 
                className="flex justify-between items-start flex-grow min-w-0"
                onClick={() => onNoteClick(note.id)} 
            >
              <div className="flex items-start space-x-3 min-w-0">
                {getNoteIcon(note.noteType)}
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{note.name}</p>
                  {note.preview && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{note.preview}</p>
                  )}
                </div>
              </div>
            
              <div className="flex space-x-2 flex-shrink-0 mt-1">
                <button
                  onClick={(e) => handleUpdate(e, note.id)}
                  title="Rename Note"
                  className="text-gray-400 hover:text-blue-400 p-1 rounded transition-colors"
                >
                  <FilePenIcon size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  title="Delete Note"
                  className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NoteList;