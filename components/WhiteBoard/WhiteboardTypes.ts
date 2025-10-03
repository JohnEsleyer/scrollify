
export interface BaseElement {
  id: number;
  type: WhiteboardElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: { x: number; y: number }[];
  size: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
}

export type WhiteboardElement = LineElement | TextElement | ImageElement;
export type WhiteboardElementType = 'line' | 'text' | 'image';

// State and Mode Definitions
export type ToolMode = 'select' | 'draw' | 'text';

// Resize Types
export type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br'; // Top-Left, Top-Right, Bottom-Left, Bottom-Right

export interface SelectionRect {
    x: number; 
    y: number; 
    w: number; 
    h: number;
}