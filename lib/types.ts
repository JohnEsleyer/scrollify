// @/lib/types/index.ts

import { ReactNode } from 'react';

/**
 * Global application types
 */

// --- 1. View State Type for Mobile Layout ---
// Used in the main Layout component to switch between the Navigator and the NoteView on small screens.
export type ViewState = 'navigator' | 'note';


// --- 2. Data Structures for Navigator (Folders & Notes) ---

/**
 * Base properties shared by Folders and Notes (like documents in a Firebase collection).
 */
export interface BaseItem {
  id: string;
  name: string;
  parentId: string | 'root'; // 'root' for the top level
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export interface Folder extends BaseItem {
  type: 'folder';
  // You might add a count of notes/folders inside if needed
}

export type NoteType = 'markdown' | 'webview' | 'canvas';

export interface Note extends BaseItem {
  type: 'note';
  noteType: NoteType;
  content: string; // <-- This is the required property!
  preview?: string;
}

// Combined type for items displayed in the Navigator list
export type NavItem = Folder | Note;


// --- 3. Type for the Side Notes Sidebar ---

/**
 * Defines the structure for items in the SidebarWrapper (the side notes).
 */
export interface SidebarItem {
  id: string;
  label: string;
  // The actual component to render for the side note content
  component: ReactNode; 
  // Optionally, a sideNoteType to align with NoteType if side notes can also be different formats
  sideNoteType?: NoteType; 
}