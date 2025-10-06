import React from 'react';
import { Folder } from '@/lib/types';
import { Folder as FolderIcon, FilePen as FilePenIcon, Trash as TrashIcon } from 'lucide-react'; 

interface FolderListProps {
  folders: Folder[]; 
  onFolderClick: (folderId: string) => void;
  onUpdateFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  

  selectedEntityIds: string[];
  toggleEntitySelection: (entityId: string) => void;
}

const FolderList: React.FC<FolderListProps> = (
    { 
        folders, 
        onFolderClick, 
        onUpdateFolder, 
        onDeleteFolder,
        selectedEntityIds, 
        toggleEntitySelection 
    }) => {


  const handleUpdate = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    onUpdateFolder?.(folderId);
    console.log(`Update folder: ${folderId}`);
  };


  const handleDelete = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
  
    onDeleteFolder?.(folderId);
    console.log(`Triggering delete for folder: ${folderId}`);
  };

  const sortedFolders = folders.slice().sort((a, b) => a.name.localeCompare(b.name));


  return (
    <div className="space-y-1">
      {sortedFolders.length === 0 ? (
        <p className="text-gray-500 italic p-2">No folders found in this location.</p>
      ) : (
        sortedFolders.map((folder) => (
          <div
            key={folder.id}
            className="p-3 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-gray-700/50 flex items-center space-x-3"
          >
            

            <input
                type="checkbox"
                checked={selectedEntityIds.includes(folder.id)}
                onChange={(e) => {
                    e.stopPropagation();
                    toggleEntitySelection(folder.id);
                }}
                className="
                    h-5 w-5 
                    text-blue-500 bg-gray-700 border-gray-500 
                    rounded focus:ring-blue-500 cursor-pointer flex-shrink-0
                "
            />
            
            <div 
                className="flex justify-between items-center flex-grow min-w-0"
                onClick={() => onFolderClick(folder.id)} 
            >
                <div className="flex items-center space-x-3 truncate min-w-0">
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
          </div>
        ))
      )}
    </div>
  );
};

export default FolderList;