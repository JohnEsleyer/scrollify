
import { ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore'; 

export type ViewState = 'navigator' | 'note';

export type NoteType = 'markdown' | 'webview' | 'canvas';
export type EntityType = 'folder' | 'note';


export type NavItem = Folder | Note;

export interface SidebarItem {
  id: string;
  label: string;
  component: ReactNode; 
  sideNoteType?: NoteType; 
}

export interface Entity {
  id: string; // The client-side ID or unique identifier
  name: string;
  parentId: string | 'root'; // ID of the parent folder or 'root'
  createdAt: number;
  updatedAt: number;
  type: EntityType;
}

export interface Folder extends Entity {
  type: 'folder';
}


export interface Note extends Entity {
  type: 'note';
  noteType: NoteType;
  content: string; // JSON/Code/Canvas data
  preview: string; // Text preview for list
}

export interface SidebarItem {
  id: string;
  label: string;
  component: React.ReactNode;
}

export interface FirestoreBase {
    // The ID is the document ID, but we often store it inside as well
    parentId: string | 'root'; 
    createdAt: Timestamp; // Firestore's native timestamp type
    updatedAt: Timestamp;
    name: string;
}

export interface FolderDocument extends FirestoreBase {
    type: 'folder';
}

export interface NoteDocument extends FirestoreBase {
    type: 'note';
    noteType: NoteType;
    content: string; 
    preview: string; 
}
