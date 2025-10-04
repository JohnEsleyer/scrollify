
'use client'; 

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SidebarItem } from '../types/SidebarTypes';

interface SidebarWrapperProps {
  items: SidebarItem[];
  defaultItemId: string;
}

export const SidebarWrapper: React.FC<SidebarWrapperProps> = ({ items, defaultItemId }) => {
  const [activeItemId, setActiveItemId] = useState<string>(defaultItemId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close the sidebar when a click occurs outside of it
  const handleClickOutside = (event: MouseEvent) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
      setIsSidebarOpen(false);
    }
  };

  // Attach event listener for clicks outside
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update active item and close sidebar on button click
  const handleItemClick = (id: string) => {
    setActiveItemId(id);
    setIsSidebarOpen(false);
  };

  // Determine which child component to display
  const activeContent = useMemo(() => {
    const item = items.find(i => i.id === activeItemId);
    return item ? item.component : <div>Content not found.</div>;
  }, [activeItemId, items]);

  return (
    <div className="flex h-screen bg-gray-100 relative overflow-hidden">
      

      <main className="flex-grow p-8 overflow-y-auto">
        {/* Toggle Button for the Sidebar */}
        <button
          onClick={toggleSidebar}
          className="p-3 fixed top-4 right-4 z-50 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? '✕' : '☰'} 
        </button>
        
        {/* Display the active child component */}
        {activeContent}
      </main>

      {/* Backdrop/Overlay for mobile view */}
        {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}


      {/* Right-Side, Sliding Sidebar Navigation */}
      <nav 
        ref={sidebarRef}
        className={`
          fixed top-0 right-0 h-full w-64 bg-gray-800 text-white z-40 
          transition-transform duration-300 ease-in-out shadow-2xl
          transform 
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4 text-xl font-semibold border-b border-gray-700">
          Navigation
        </div>
        <ul className="p-2">
          {items.map((item) => (
            <li key={item.id} className="mb-1">
              <button
                onClick={() => handleItemClick(item.id)}
                className={`w-full text-right py-2 px-4 rounded-lg transition-colors duration-150 ${
                  activeItemId === item.id
                    ? 'bg-blue-600 font-bold'
                    : 'hover:bg-gray-700'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};