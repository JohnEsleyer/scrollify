
import React from 'react';
import { Folder } from '@/lib/types';
import { Folder as FolderIcon, FilePen as FilePenIcon, Trash as TrashIcon } from 'lucide-react'; 

interface FolderListProps {
  folders: Folder[]; 
  onFolderClick: (folderId: string) => void;
  onCreateFolder?: () => void;
  onUpdateFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
}

const FolderList: React.FC<FolderListProps> = (
    { 
        folders, 
        onFolderClick, 
        onUpdateFolder, 
        onDeleteFolder 
    }) => {


  const handleUpdate = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    onUpdateFolder?.(folderId);
    console.log(`Update folder: ${folderId}`);
  };

  const handleDelete = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this folder?')) {
        onDeleteFolder?.(folderId);
        console.log(`Delete folder: ${folderId}`);
    }
  };

  return (
    <div className="space-y-1">
      {folders.length === 0 ? (
        <p className="text-gray-500 italic p-2">No folders found in this location.</p>
      ) : (
        folders.map((folder) => (
          <div
            key={folder.id}
            className="flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-700/50"
            onClick={() => onFolderClick(folder.id)}
          >
            <div className="flex items-center space-x-3 truncate">
              <FolderIcon className="text-yellow-500 flex-shrink-0 w-5 h-5" />
              <span className="font-medium text-white truncate">{folder.name}</span>
            </div>
            
            <div className="flex space-x-2 flex-shrink-0">
              <button
                onClick={(e) => handleUpdate(e, folder.id)}
                title="Rename Folder"
                className="text-gray-400 hover:text-blue-400 p-1 rounded transition-colors"
              >
                <FilePenIcon size={16} />
              </button>
              <button
                onClick={(e) => handleDelete(e, folder.id)}
                title="Delete Folder"
                className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
              >
                <TrashIcon size={16} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FolderList;