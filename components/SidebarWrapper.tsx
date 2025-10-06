'use client'; 

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { SidebarItem } from '@/lib/types'; 
import { Edit, Plus, Trash2 } from 'lucide-react';

interface SidebarWrapperProps {
  items: SidebarItem[];
  defaultItemId: string;
  children: React.ReactNode;
  onCreate: () => void;
  onUpdate: (id: string, newLabel: string) => void;
  onDelete: (id: string) => void;
}


const MIN_WIDTH = 250; 
const MAX_WIDTH = 600; 
const DEFAULT_WIDTH = 320; // Default width for desktop

const getInitialSidebarState = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 1024;
  }
  return false; 
};


export const SidebarWrapper: React.FC<SidebarWrapperProps> = ({
   items, 
   defaultItemId, 
   children,
   onCreate,
   onUpdate,
   onDelete,
  }) => {
  const [activeItemId, setActiveItemId] = useState<string>(defaultItemId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(getInitialSidebarState());  
  
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  
  const handleMouseDown = useCallback(() => {
    if (window.innerWidth >= 1024) { 
        setIsDragging(true);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // Calculate new width: Screen width minus the mouse X position
    const newWidth = window.innerWidth - e.clientX;
    
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      setSidebarWidth(newWidth);
    }
  }, [isDragging]);


  useEffect(() => {
      if (!items.find(i => i.id === activeItemId) && items.length > 0) {
          setActiveItemId(items[0].id);
      } else if (items.length === 0) {
          setActiveItemId('');
      }
  }, [items, activeItemId]);


  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);



  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleItemClick = (id: string) => {
    setActiveItemId(id);
    if (window.innerWidth < 1024) { 
        setIsSidebarOpen(false);
    }
  };

  const handleRenameClick = (id: string, currentLabel: string) => {
      const newLabel = prompt('Rename side note:', currentLabel);
      if (newLabel !== null && newLabel.trim() !== '') {
          onUpdate(id, newLabel.trim());
      }
  };

  const handleDeleteClick = (id: string) => {
      if (window.confirm('Are you sure you want to delete this side note?')) {
          onDelete(id);
      }
  };


  const activeSideNoteContent = useMemo(() => {
    const item = items.find(i => i.id === activeItemId);
    return item ? item.component : <div className="p-4 text-gray-400">Select a side note item.</div>;
  }, [activeItemId, items]);


 
  const desktopStyle = {
      width: isSidebarOpen ? `${sidebarWidth}px` : '0px', 
  };


  return (
    <div className="flex h-full bg-gray-800 relative overflow-hidden">
      
      <main 
        className="flex-grow p-0 overflow-y-auto"
        style={isDragging ? { cursor: 'ew-resize' } : {}}
      >
        <button
          onClick={toggleSidebar}
          className={`
            p-3 fixed top-4 right-4 z-50 text-white rounded-full shadow-lg transition-colors
            bg-blue-600 hover:bg-blue-700
          `}
          aria-label="Toggle Side Notes"
        >
          {isSidebarOpen ? '✕' : '☰'} 
        </button>
        
        <div className="h-full w-full">
            {children}
        </div>
      </main>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}


      <nav 
        ref={sidebarRef}
        className={`
          fixed top-0 right-0 h-full bg-gray-900 text-white z-40 
          transition-transform duration-300 ease-in-out shadow-2xl flex-shrink-0
          
          lg:static lg:translate-x-0 lg:transition-none ${isSidebarOpen ? 'lg:border-l lg:border-gray-700' : 'lg:overflow-hidden'}
          
          /* --- START: Full-Screen Mobile Update --- */
          ${isSidebarOpen ? 'translate-x-0 w-full lg:w-auto' : 'translate-x-full w-full lg:w-auto'} 
          
          /* Desktop Specific Width */
          ${window.innerWidth >= 1024 ? '' : 'w-full'}
        `}
        style={window.innerWidth >= 1024 ? desktopStyle : {}}
      >
          {/* Resizer Handle */}
          <div
            className={`absolute top-0 left-0 h-full w-2 -ml-1 cursor-ew-resize z-50 transition-colors 
              /* Hides the resizer on mobile (w-full) where it's not needed */
              hidden lg:block
              ${isDragging ? 'bg-blue-500' : 'hover:bg-gray-700'}`}
            onMouseDown={handleMouseDown}
          />
          
          <div className="flex flex-col h-full">
              <div className="p-4 text-xl font-semibold border-b border-gray-700 flex-shrink-0 flex  items-center">
                <span>Side Notes</span>
                <span></span>
                  <button 
                    onClick={onCreate}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="Create New Side Note"
                >
                    <Plus size={18} />
                </button>
              
              </div>
              
              {/* Side Note Item List (SCROLLABLE) */}
              <ul className="p-2  border-gray-700 flex-shrink-0 max-h-48 overflow-y-auto">
              {items.map((item) => (
                  <li key={item.id} className="mb-1 group relative"> 
                    
                    <button
                      onClick={() => handleItemClick(item.id)}
                      className={`
                        w-full text-left py-2 px-4 rounded-lg transition-colors duration-150 
                        ${activeItemId === item.id
                          ? 'bg-blue-600 font-bold text-white'
                          : 'text-gray-200 hover:bg-gray-700' 
                        }
                      `}
                      title={item.label}
                    >
                      {item.label}
                    </button>
                    
                    {/* UPDATE & DELETE Controls */}
                    <div className={`
                        absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1 
                        transition-opacity duration-200 
                        ${activeItemId === item.id 
                            // Always visible when active, using a light hover color
                            ? 'opacity-100 bg-blue-600' 
                            // Hidden by default, appears on list item hover
                            : 'opacity-0 group-hover:opacity-100 bg-gray-700/80 rounded'
                        }
                    `}>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRenameClick(item.id, item.label); }}
                            className="p-1 text-gray-100 hover:text-blue-200"
                            title="Rename"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }}
                            className="p-1 text-red-300 hover:text-red-200"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                  </li>
                ))}

              </ul>


              <div className="p-2 flex-grow overflow-y-auto">
                  {activeSideNoteContent}
              </div>
          </div>
      </nav>
    </div>
  );
};