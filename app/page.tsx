'use client'

import React from 'react';
import { EditorState, LexicalEditor } from 'lexical'; 
import dynamic from 'next/dynamic';
import CodeEditorWebview from '@/components/CodeEditorWeview';

export default function App() {
    return (
        <div>
            <CodeEditorWebview/>
        </div>
    )
}