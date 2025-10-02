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
import { $createImageNode, $isImageNode, ImageNode} from '@/nodes/ImageNode'; 
import { ImageTransformerPlugin } from './ImageTransformerPlugin';


const IMAGE_TRANSFORMER: ElementTransformer = {
    dependencies: [ImageNode],
    

    regExp: /\{img:([^,]+),alt:([^}]+)\}\s*$/, 
    
    replace: (
        parentNode: ElementNode, 
        children: Array<LexicalNode>, 
        match: string[], 
        isImport: boolean 
    ) => {
        console.log("--- IMAGE TRANSFORMER TRIGGERED ---");
        
        const url = match[1].trim(); 
        const altText = match[2].trim();
        
        console.log("Captured Alt Text:", altText);
        console.log("Captured URL:", url);
        console.log("Parent Node Type:", parentNode.getType());
        
        const imageNode = $createImageNode({
            src: url, 
            altText: altText || 'Image', 
        });
        
        parentNode.replace(imageNode); 
    },
    
    type: 'element',
    
    export: (node: LexicalNode) => {
        if (!$isImageNode(node)) { return null; }
        return `{img:${node.getSrc()},alt:${node.getAltText()}}`;
    }
};

const ALL_TRANSFORMERS: Transformer[] = [
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
                <ImageTransformerPlugin /> 
                <StateChangeReporter onChange={onChange} />
                
            </div>
        </LexicalComposer>
    );
}