'use client'

import React from 'react';
import { EditorState, LexicalEditor } from 'lexical'; 
import dynamic from 'next/dynamic';

const ReusableMarkdownEditor = dynamic(
  () => import('@/components/ReusableMarkdownEditor'),
  { 
    ssr: false 
  }
);

function App() {
    const [editorContent, setEditorContent] = React.useState('{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","text":"# Welcome!","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","tag":"h1","version":1}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}');
    
    const handleEditorChange = React.useCallback(
        (editorState: EditorState, _editor: LexicalEditor) => {
            const jsonString = JSON.stringify(editorState.toJSON());
            console.log("New JSON State:", jsonString);
        }, 
        []
    );

    return (
        <ReusableMarkdownEditor 
            content={editorContent}
            onChange={handleEditorChange} 
        />
    );
}

export default App;