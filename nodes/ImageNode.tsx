import * as React from 'react';
import { Suspense } from 'react';
import {
  DecoratorNode,
  EditorConfig,
  LexicalNode,
  NodeKey,
  $applyNodeReplacement,
  SerializedLexicalNode,
  $getNodeByKey,
  $getSelection,
  $createNodeSelection,
  $createTextNode, 
  $setSelection,
} from 'lexical';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';


export class ImageNode extends DecoratorNode<React.JSX.Element> {
    __src: string;
    __altText: string;
  
    constructor(src: string, altText: string, key?: NodeKey) {
      super(key);
      this.__src = src;     
      this.__altText = altText; 
    }
  
    static getType(): string { return 'image'; }
    static clone(node: ImageNode): ImageNode {
      return new ImageNode(node.__src, node.__altText, node.__key);
    }
    static importJSON(serializedNode: SerializedImageNode): ImageNode {
      return $createImageNode({ src: serializedNode.src, altText: serializedNode.altText });
    }
    exportJSON(): SerializedImageNode {
      return { src: this.getSrc(), altText: this.getAltText(), type: 'image', version: 1 };
    }
  
    getSrc(): string { return this.__src; }
    getAltText(): string { return this.__altText; }
    setSrc(src: string): void {
      const writable = this.getWritable();
      writable.__src = src;
    }
    setAltText(altText: string): void {
      const writable = this.getWritable();
      writable.__altText = altText;
    }
  
    decorate(): React.JSX.Element {
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <ImageComponent 
            src={this.__src} 
            altText={this.__altText} 
            nodeKey={this.__key!} 
          />
        </Suspense>
      );
    }
    
    createDOM(config: EditorConfig): HTMLElement {
      const div = document.createElement('div');
      div.className = config.theme.image ?? 'image-node-container'; 
      return div;
    }
    updateDOM(): boolean { return false; } 
}


export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode;
}

export function $createImageNode({ altText, src }: {altText: string, src: string}): ImageNode {
    return $applyNodeReplacement(new ImageNode(src, altText));
}

export type SerializedImageNode = SerializedLexicalNode & {
  src: string;
  altText: string;
}

interface ImageComponentProps {
  src: string;
  altText: string;
  nodeKey: NodeKey;
}

// ... (Your imports and ImageNode class remain the same)

// ... (Helper Functions and Types remain the same)

function ImageComponent({ src, altText, nodeKey }: ImageComponentProps): React.JSX.Element {
    const [editor] = useLexicalComposerContext();

    // 🚀 RESTORE: This is the original logic to edit via a prompt.
    const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault(); 
        
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            
            if ($isImageNode(node)) {
                // 1. Select the node (required for editing context)
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(node.getKey());
                $setSelection(nodeSelection);

                // 2. Open the prompt to ask for a new URL
                const newSrc = window.prompt("Enter new Image URL:", node.getSrc());
                
                // 3. Validate and update the URL
                if (newSrc !== null) {
                    const cleanedSrc = newSrc.trim();

                    if (cleanedSrc.length > 0 && cleanedSrc !== node.getSrc()) {
                        // Update only if it's a non-empty, different URL
                        node.setSrc(cleanedSrc);
                    } else if (cleanedSrc.length === 0 && node.getSrc() !== "") {
                        // Allows the user to clear the source (handled safely in rendering below)
                        node.setSrc(""); 
                    }
                }
            }
        });
    };

    return (
        <div 
            onClick={onClick}
            className="relative block w-full outline-none cursor-pointer 
                       ring-0 focus:ring-2 focus:ring-blue-500" 
            tabIndex={-1} 
        >
            <img 
                // Retaining the critical fix to prevent the browser error on empty string
                src={src.length > 0 ? src : undefined} 
                alt={altText} 
                style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    display: 'block',
                    userSelect: 'none' 
                }} 
                draggable="false" 
            />
        </div>
    );
}