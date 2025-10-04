
import React from 'react';
import { Note, NoteType } from '@/lib/types';
import { 
    FileText as MarkdownIcon, 
    Code as CodeIcon, 
    FilePen as FilePenIcon, 
    Trash as TrashIcon, 
    AppWindow
} from 'lucide-react';

// Mock Data 
const mockNotes: Note[] = [
  { 
    id: 'n1', 
    name: 'Quick Todo List', 
    parentId: 'f1', 
    createdAt: Date.now(), 
    updatedAt: Date.now(), 
    noteType: 'markdown', 
    type: 'note', 
    preview: 'Use this for a quick dump of ideas...',
    content: '{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"Mock Markdown Content.","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}', 
  },
  { 
    id: 'n2', 
    name: 'Web Component Demo', 
    parentId: 'f1', 
    createdAt: Date.now(), 
    updatedAt: Date.now(), 
    noteType: 'webview', 
    type: 'note', 
    preview: 'A playground for my new CSS grid layout.',
    content: '/* Mock Webview Code */', 
  },
  { 
    id: 'n3', 
    name: 'Design Sketch v1', 
    parentId: 'f1', 
    createdAt: Date.now(), 
    updatedAt: Date.now(), 
    noteType: 'canvas', 
    type: 'note', 
    preview: 'Initial wireframe drawing for the app UI.',
    content: '{"shapes":[]}', 
  },
];

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
  onCreateNote?: () => void;
  onUpdateNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

const NoteList: React.FC<NoteListProps> = (
    { 
        notes, 
        onNoteClick, 
        activeNoteId, 
        onUpdateNote, 
        onDeleteNote 
    }) => {
        
  const handleUpdate = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation(); 
    onUpdateNote?.(noteId);
    console.log(`Update note: ${noteId}`);
  };

  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
        onDeleteNote?.(noteId);
        console.log(`Delete note: ${noteId}`);
    }
  };

  return (
    <div className="space-y-1">
      {notes.length === 0 ? (
        <p className="text-gray-500 italic p-2">No notes found in this folder.</p>
      ) : (
        notes.map((note) => (
          <div
            key={note.id}
            className={`
              p-3 rounded-lg cursor-pointer transition-colors duration-150 border-l-4
              ${activeNoteId === note.id
                ? 'bg-blue-600/50 border-blue-400'
                : 'hover:bg-gray-700/50 border-transparent'
              }
            `}
            onClick={() => onNoteClick(note.id)}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-3 min-w-0">
                {getNoteIcon(note.noteType)}
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{note.name}</p>
                  {note.preview && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{note.preview}</p>
                  )}
                </div>
              </div>
            
              {/* CRUD Actions */}
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