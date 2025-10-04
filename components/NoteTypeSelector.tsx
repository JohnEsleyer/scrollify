import React from 'react';
import { FileText, Code, AppWindow } from 'lucide-react';
import { NoteType } from '@/lib/types';

interface NoteTypeSelectorProps {
  onSelect: (type: NoteType) => void;
  onClose: () => void;
}

const types: { type: NoteType; name: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'markdown',
    name: 'Markdown Note',
    icon: <FileText size={32} className="text-blue-500" />,
    description: 'Rich text and documentation using a WYSIWYG editor.',
  },
  {
    type: 'webview',
    name: 'Code/Webview',
    icon: <Code size={32} className="text-green-500" />,
    description: 'Code snippets, HTML/CSS sandboxes, and web component viewers.',
  },
  {
    type: 'canvas',
    name: 'Sketchpad/Canvas',
    icon: <AppWindow size={32} className="text-pink-500" />,
    description: 'Free-form drawing, diagrams, and brainstorming.',
  },
];

export const NoteTypeSelector: React.FC<NoteTypeSelectorProps> = ({ onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-3">
          Select Note Type
        </h2>
        <p className="text-gray-400 mb-6">Choose the format for your new note's content.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {types.map((t) => (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              className="flex flex-col items-center text-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all border border-transparent hover:border-blue-500"
            >
              {t.icon}
              <span className="font-semibold text-white mt-3 mb-1">{t.name}</span>
              <span className="text-xs text-gray-400">{t.description}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-6 text-right">
            <button 
                onClick={onClose} 
                className="py-2 px-4 text-gray-400 hover:text-white rounded transition-colors"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};