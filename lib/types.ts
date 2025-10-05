import { ReactNode } from 'react';
import { Timestamp } from 'firebase/firestore'; 

export type ViewState = 'navigator' | 'note';

export type NoteType = 'markdown' | 'webview' | 'canvas';
export type EntityType = 'folder' | 'note' | 'side_note'; 

export type NavItem = Folder | Note;

export interface SidebarItem {
  id: string;
  label: string;
  component: ReactNode; 
  sideNoteType?: NoteType; 
}

export interface Entity {
  id: string; 
  name: string;
  parentId: string | 'root'; 
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
  content: string; 
  preview: string; 
}

export interface SideNote extends Entity {
    type: 'side_note'; 
    noteType: NoteType;
    content: string;
    preview: string;
}

export interface FirestoreBase {
    // The ID is the document ID, but we often store it inside as well
    parentId: string | 'root'; 
    createdAt: Timestamp; 
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

export interface SideNoteDocument extends FirestoreBase {
    type: 'side_note';
    noteType: NoteType;
    content: string;
    preview: string;
}