
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isCodeHighlightNode, CodeHighlightNode } from '@lexical/code';
import * as Prism from 'prismjs';
import React, { useEffect } from 'react';

import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-clike';


export function HighlightPlugin() {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        const supportedLanguages = Object.keys(Prism.languages);

        
    return editor.registerMutationListener(CodeHighlightNode, (mutations) => {             
            mutations.forEach((_, nodeKey) => {
                editor.update(() => {
        const nodeElement = editor.getElementByKey(nodeKey);
        
        if (nodeElement instanceof HTMLElement) {
            const codeElement = nodeElement.closest('code');
            const preElement = nodeElement.closest('pre');
            
            if (codeElement && preElement) {
                
                
                const textContent = preElement.textContent || '';
                
                const language = preElement.getAttribute('data-lexical-code-language') || 'clike';

               if (Prism.languages[language]) {
                    Prism.highlightElement(codeElement);
                } else {
                  
                    codeElement.textContent = preElement.textContent || '';
                }
            }
        }
    }, { tag: 'highlight' });

            });
        });
    }, [editor]);

    return null;
}