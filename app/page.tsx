'use client'

import React from 'react';
import { EditorState, LexicalEditor } from 'lexical'; 
import dynamic from 'next/dynamic';
import CodeEditorWebview from '@/components/CodeEditorWeview';
const WhiteBoard = dynamic(() => import('../components/WhiteBoard'), {
  ssr: false, 
});

export default function App() {
    return (
    <main style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', paddingTop: '50px' }}>  
    <WhiteBoard/>
    </main>
    )
}