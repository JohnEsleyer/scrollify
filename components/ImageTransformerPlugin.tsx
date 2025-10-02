import { $createImageNode } from "@/nodes/ImageNode";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, $isTextNode } from "lexical";
import React from "react";

const IMAGE_REGEX = /\{\{([^}]+)\}\}/; 

export function ImageTransformerPlugin() {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                
                if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                    return;
                }

                const node = selection.anchor.getNode();
                if (!$isTextNode(node)) {
                    return;
                }

                const textContent = node.getTextContent();
                const match = textContent.match(IMAGE_REGEX);

                if (match) {
                    editor.update(() => {
                        const [, url] = match; 
                        
                        const hardcodedAltText = 'Image inserted via text shortcut';
                        
                        const imageNode = $createImageNode({
                            src: url.trim(),
                            altText: hardcodedAltText,
                        });

                        node.setTextContent(textContent.replace(IMAGE_REGEX, ''));
                        
                        node.insertAfter(imageNode);
                        
                        imageNode.selectNext();
                        
                        console.log("✅ Custom Image Transformation Successful!");
                    });
                }
            });
        });
    }, [editor]);

    return null;
}