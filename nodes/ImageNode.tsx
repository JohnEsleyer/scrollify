import * as React from 'react'; 
import { Suspense } from 'react';

import {
  DecoratorNode,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  $applyNodeReplacement,
  
} from 'lexical';



export interface ImagePayload {
  altText: string;
  src: string;
  key?: NodeKey;
}

export type SerializedImageNode = SerializedLexicalNode & ImagePayload;


function ImageComponent({ src, altText, nodeKey }: { src: string, altText: string, nodeKey: NodeKey }): React.JSX.Element {  return (
    <img 
      src={src} 
      alt={altText} 
      style={{ 
          maxWidth: '100%', 
          height: 'auto', 
          display: 'block',
          userSelect: 'none' 
      }} 
      draggable="false" 
    />
  );
}


export class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }


  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      altText: serializedNode.altText,
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.getSrc(),
      altText: this.getAltText(),
      type: 'image',
      version: 1,
    };
  }


  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.className = config.theme.image ?? ''; 
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.JSX.Element {
    return (
      <Suspense fallback={<div>Loading image...</div>}>
        <ImageComponent 
          src={this.__src} 
          altText={this.__altText} 
          nodeKey={this.__key} 
        />
      </Suspense>
    );
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }
}


export function $createImageNode({ altText, src }: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}