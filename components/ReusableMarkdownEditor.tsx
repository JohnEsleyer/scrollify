'use client'; 

import * as React from 'react';
import { LexicalComposer, InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'; 

import { 
    ElementTransformer, 
    Transformer, 
    TRANSFORMERS as CORE_TRANSFORMERS,
    CODE as CODE_TRANSFORMER,
    CODE
} from '@lexical/markdown'; 

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { 
    ParagraphNode, TextNode, EditorState, LexicalEditor, 
    ElementNode, LexicalNode, $isElementNode
} from 'lexical'; 
import { LinkNode } from '@lexical/link'; 
import { $createImageNode, $isImageNode, ImageNode} from '@/nodes/ImageNode'; 
import { ImageTransformerPlugin } from '../nodes/ImageTransformerPlugin';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { HighlightPlugin } from './HighlightPlugin';
import { useEffect } from 'react';

const ALL_TRANSFORMERS: Transformer[] = [
    ...CORE_TRANSFORMERS, 
    CODE_TRANSFORMER,
];

const EMPTY_EDITOR_STATE = 
    '{"root": {"children": [{"children": [{"detail": 0, "format": 0, "mode": "normal", "text": "", "type": "text", "version": 1}], "direction": "ltr", "format": "", "indent": 0, "type": "paragraph", "version": 1}], "direction": "ltr", "format": "", "indent": 0, "type": "root", "version": 1}}';
 
const isValidJsonString = (str: string): boolean => {
    if (!str || typeof str !== 'string' || str.trim().length === 0) {
        console.log("Validation: Fail (empty/null)"); 
        return false;
    }
    
    try {
        const obj = JSON.parse(str);
     
        const isValidLexical = typeof obj === 'object' && obj !== null && 
                               'root' in obj && 'children' in obj.root;

        console.log(`Validation: Pass (Valid Lexical structure: ${isValidLexical})`); 
        return isValidLexical;
    } catch (e) {
        console.log("Validation: Fail (Not JSON)"); 
        return false;
    }
};
const createInitialEditorState = (contentJson: string) => (editor: LexicalEditor) => {
    console.log(`[Lexical Init] Attempting to set state from string (Length: ${contentJson.length}):`, contentJson.substring(0, 50) + '...');
    try {
        const editorState = editor.parseEditorState(contentJson); 
        
        const rootNode = editorState._nodeMap.get('root');
        let childrenCount = 0; 
        let isEmpty = false;

        if (rootNode && $isElementNode(rootNode)) {
             childrenCount = rootNode.getChildrenSize();
             isEmpty = childrenCount === 0;
        }

        console.log("[Lexical Init] Successfully parsed state. Root children count:", childrenCount);
        
        if (isEmpty) {
             console.warn("[Lexical Init] Parsed state is valid JSON but has an empty root node. Forcing fallback to safe state.");
             editor.setEditorState(editor.parseEditorState(EMPTY_EDITOR_STATE));
        } else {
             editor.setEditorState(editorState); 
        }

    } catch (e) {
        console.error("CRITICAL: Failed to set state with final string. Resetting.", e);
        editor.setEditorState(editor.parseEditorState(EMPTY_EDITOR_STATE));
        console.warn("[Lexical Init] Resetting editor state to safe empty state.");
    }
};


interface StateChangeReporterProps {
    onLexicalUpdate: (editorState: EditorState, editor: LexicalEditor) => void; 
}


function StateChangeReporter({ onLexicalUpdate }: StateChangeReporterProps) {
    const [editor] = useLexicalComposerContext();
    React.useEffect(() => {
        if (!onLexicalUpdate) return;

        return editor.registerUpdateListener(({ editorState }) => { 
            onLexicalUpdate(editorState, editor); 
        });
    }, [editor, onLexicalUpdate]);
    return null;
}

const createInitialConfig = (contentJson: string): InitialConfigType => ({
    namespace: 'Basic-Lexical-Editor',
    editable: true, 
    editorState: createInitialEditorState(contentJson), 
    
    nodes: [
        ParagraphNode, TextNode, HeadingNode, QuoteNode, ListNode, 
        ListItemNode, CodeNode, CodeHighlightNode, LinkNode, ImageNode, 
    ],
    
    theme: {
        paragraph: 'text-gray-200 leading-relaxed',
        
        heading: {
            h1: 'text-white text-3xl font-extrabold mt-6 mb-3 border-b pb-1 border-gray-700',
            h2: 'text-white text-2xl font-bold mt-5 mb-2',
            h3: 'text-white text-xl font-semibold mt-4 mb-2',
            h4: 'text-white text-lg font-medium mt-3 mb-1',
            h5: 'text-white text-base font-medium mt-2',
            h6: 'text-white text-sm font-normal mt-1',
        },
        
        quote: 'text-gray-400 bg-gray-800 border-l-4 border-gray-500 italic p-3 my-4 rounded-r-md',
        
        list: {
            ul: 'list-disc ml-6 my-3 text-gray-200',
            ol: 'list-decimal ml-6 my-3 text-gray-200',
            listitem: 'pl-2 mb-1',
        },
        
  
        code: 'text-sm font-mono whitespace-pre-wrap bg-gray-900 text-green-300 p-4 my-4 rounded-lg shadow-inner',
        

        text: {
            code: 'bg-gray-700 text-yellow-300 px-1 py-0.5 rounded-sm font-mono text-sm',
            bold: 'font-bold',
            italic: 'italic',
            strikethrough: 'line-through',
        },
        
        link: 'text-blue-400 hover:text-blue-300 underline transition-colors duration-150',
        
        image: 'my-4 block max-w-full mx-auto shadow-xl rounded-lg border border-gray-700',
    },
    
    
    onError: (error: Error) => {
        console.error('Lexical caught an error:', error);
    },
});


interface ReusableEditorProps {
    content?: string;
    onChange?: (newContentJson: string) => void; 
}


export default function ReusableMarkdownEditor({ content, onChange }: ReusableEditorProps) {
    useEffect(() => {
        console.log(`[Editor Mount/Update] Incoming 'content' prop changed (Length: ${content?.length || 0}):`, content ? content.substring(0, 50) + '...' : 'undefined/null');
    }, [content]);

     const validatedContent = React.useMemo(() => {
        const result = (content && isValidJsonString(content)) ? content : EMPTY_EDITOR_STATE;
        console.log(`[Editor Validation] Validated content determined. Used Fallback: ${result === EMPTY_EDITOR_STATE}`);
        return result;
    }, [content]);


    const initialConfig = React.useMemo(() => {
        console.log("[Editor Config] Creating new initialConfig. This triggers full Lexical re-init.");
        return createInitialConfig(validatedContent);
    }, [validatedContent]);
 
    const handleLexicalUpdate = React.useCallback((editorState: EditorState, editor: LexicalEditor) => {
        if (!onChange) return;
        
        const jsonString = JSON.stringify(editorState.toJSON());
        onChange(jsonString);
        
    }, [onChange]);


    return (
     <LexicalComposer initialConfig={initialConfig}>
            
            <div className="editor-container p-4">
                
                <RichTextPlugin
                    contentEditable={<ContentEditable className="content-editable min-h-[150px] outline-none" />}
                    placeholder={<div className="placeholder text-gray-400">Start typing Markdown...</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                />
                
                <HistoryPlugin />
                <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
                <ImageTransformerPlugin /> 
                
                <HighlightPlugin /> 
                
                <StateChangeReporter onLexicalUpdate={handleLexicalUpdate} />                 
            </div>
        </LexicalComposer>
    );
}
