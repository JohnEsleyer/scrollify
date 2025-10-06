
import React from 'react';
import { NoteType } from '@/lib/types'; 
import { FileText as MarkdownIcon, Code as CodeIcon, AppWindow as CanvasIcon } from 'lucide-react';

interface SideNoteTypeSelectorProps {
    onSelect: (type: NoteType) => void;
    onClose: () => void;
}

const types: { type: NoteType, label: string, icon: React.ReactNode }[] = [
    { type: 'markdown', label: 'Markdown Document', icon: <MarkdownIcon className="w-6 h-6 text-blue-400" /> },
    { type: 'webview', label: 'Code/Webview', icon: <CodeIcon className="w-6 h-6 text-green-400" /> },
    { type: 'canvas', label: 'Canvas/Sketchpad', icon: <CanvasIcon className="w-6 h-6 text-pink-400" /> },
];

export const SideNoteTypeSelector: React.FC<SideNoteTypeSelectorProps> = ({ onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-gray-800 p-6 rounded-lg shadow-2xl w-full max-w-md border border-gray-700" 
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white mb-6">Select Side Note Type</h2>
                <div className="space-y-4">
                    {types.map((item) => (
                        <button
                            key={item.type}
                            onClick={() => onSelect(item.type)}
                            className="w-full flex items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors space-x-4 border border-gray-700"
                        >
                            {item.icon}
                            <span className="text-white text-lg font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={onClose}
                    className="mt-6 w-full py-2 text-gray-400 hover:text-white transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};