'use client'

import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'; 

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const components: Components = {
    code({ node, className, children, ref, ...props }: any) {
      const isBlock = className && className.startsWith('language-');
      const match = /language-(\w+)/.exec(className || '');

      if (isBlock && match) {
        return (
          <SyntaxHighlighter
            style={vscDarkPlus as any} 
            language={match[1]}
            PreTag="div" 
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }
      
      return (
        <code className={className} {...props} ref={ref}>
          {children}
        </code>
      );
    },
  };

  return (
    <ReactMarkdown
      children={content}
      components={components}
    />
  );
};

export default MarkdownRenderer;