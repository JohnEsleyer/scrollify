'use client'; 

import * as React from 'react';
import { LexicalComposer, InitialConfigType } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'; 

import { ElementTransformer, Transformer, TRANSFORMERS as CORE_TRANSFORMERS } from '@lexical/markdown'; 

import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { 
    ParagraphNode, TextNode, EditorState, LexicalEditor, 
    ElementNode, LexicalNode 
} from 'lexical'; 
import { CodeNode, CodeHighlightNode } from '@lexical/code'; 
import { LinkNode } from '@lexical/link'; 
import { ImageNode, $createImageNode, $isImageNode } from '@/nodes/ImageNode'; 


const IMAGE_TRANSFORMER: ElementTransformer = {
    dependencies: [ImageNode], 
    regExp: /!\[(.*?)\]\((.*?)\)/, 
    
    
    replace: (
        parentNode: ElementNode, 
        children: Array<LexicalNode>, 
        match: string[], 
        isImport: boolean 
    ) => {
        const [, altText, url] = match; 
        
        const imageNode = $createImageNode({
            src: url, 
            altText: altText,
        });
        
        parentNode.replace(imageNode); 
        
    },
    type: 'element',
    
    export: (node: LexicalNode) => {
        if (!$isImageNode(node)) {
            return null;
        }
        return `![${node.getAltText()}](${node.getSrc()})`;
    }
};

const ALL_TRANSFORMERS: Transformer[] = [
    IMAGE_TRANSFORMER,
    ...CORE_TRANSFORMERS, 
];


const createInitialEditorState = (content?: string) => (editor: LexicalEditor) => {
    if (content) {
        try {
            const editorState = editor.parseEditorState(content);
            editor.setEditorState(editorState);
        } catch (e) {
            console.error("Could not parse initial content JSON:", e);
        }
    }
};


interface StateChangeReporterProps {
    onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
}

function StateChangeReporter({ onChange }: StateChangeReporterProps) {
    const [editor] = useLexicalComposerContext();
    React.useEffect(() => {
        if (!onChange) return;
        return editor.registerUpdateListener(({ editorState }) => {
            onChange(editorState, editor);
        });
    }, [editor, onChange]);
    return null;
}


interface ReusableEditorProps {
    content?: string;
    onChange?: (editorState: EditorState, editor: LexicalEditor) => void;
}

const createInitialConfig = (content?: string): InitialConfigType => ({
    namespace: 'Basic-Lexical-Editor',
    editable: true, 
    editorState: createInitialEditorState(content), 
    
    nodes: [
        ParagraphNode, TextNode, HeadingNode, QuoteNode, ListNode, 
        ListItemNode, CodeNode, CodeHighlightNode, LinkNode, ImageNode, 
    ],
    
    theme: {
        quote: 'bg-gray-100 border-l-4 border-gray-500 p-2 my-2',
    },
    
    onError: (error: Error) => {
        console.error('Lexical caught an error:', error);
    },
});

export default function ReusableMarkdownEditor({ content, onChange }: ReusableEditorProps) {
    const initialConfig = createInitialConfig(content);
    
    return (
        <LexicalComposer initialConfig={initialConfig}>
            
            <div className="editor-container border rounded-lg p-4 shadow-md">
                
                <RichTextPlugin
                    contentEditable={<ContentEditable className="content-editable min-h-[150px] outline-none" />}
                    placeholder={<div className="placeholder text-gray-400">Start typing Markdown...</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                />
                
                <HistoryPlugin />
                <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
                <StateChangeReporter onChange={onChange} />
                
            </div>
        </LexicalComposer>
    );
}