import { useState, useMemo, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useDebounce } from '@/hooks/useDebounce';

const DEFAULT_EDITOR_CONTENT = 
`<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .text-red { color: red; font-family: sans-serif; }
    </style>
</head>
<body>
    <h1>Hello World!</h1>
    <p class="text-red">This is a simple demo.</p>
    <script>
        console.log("JavaScript executed!");
        // alert("Script loaded!");
    </script>
</body>
</html>`;



const getInitialStateContent = (content: string | undefined): string => {
    return (content && typeof content === 'string' && content.length > 0) 
        ? content 
        : DEFAULT_EDITOR_CONTENT;
};


interface CodeEditorWebviewProps {
  initialContent?: string; 
  onChange?: (newContentJson: string) => void; 
  onTyping: () => void; 
}

const CodeEditorWebview: React.FC<CodeEditorWebviewProps> = ({ 
    initialContent, 
    onChange, 
    onTyping 
}) => {  
  

  const [rawCode, setRawCode] = useState<string>(() => 
    getInitialStateContent(initialContent)
  );
  

  const debouncedRawCode = useDebounce(rawCode, 1000); 


  useEffect(() => {
    if (!onChange) return;
    
    const initialRawCode = getInitialStateContent(initialContent);
    
    if (debouncedRawCode !== initialRawCode) {
        console.log("[DEBOUNCE SAVE - Webview] Triggering external onChange(save) with raw string.");
        onChange(debouncedRawCode); 
    }
    
  }, [debouncedRawCode, onChange, initialContent]);

  useEffect(() => {
      const newInitialCode = getInitialStateContent(initialContent);
      if (rawCode !== newInitialCode) {
           setRawCode(newInitialCode);
      }
  }, [initialContent]);


  const [activeTab, setActiveTab] = useState<'editor' | 'webview'>('editor');
  
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setRawCode(value);
      onTyping();
    }
  }, [onTyping]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editor.layout();
  };

 
  const srcDoc = useMemo<string>(() => rawCode, [rawCode]);

  const tabClass = (tabName: 'editor' | 'webview') =>
    `px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out border-b-2
    ${activeTab === tabName
      ? 'border-blue-500 text-blue-600 bg-blue-50'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;


  return (
    <div className="w-full h-screen flex flex-col bg-white">
      <div className="flex border-b border-gray-200">
        <button className={tabClass('editor')} onClick={() => setActiveTab('editor')}>
          Code Editor
        </button>
        <button className={tabClass('webview')} onClick={() => setActiveTab('webview')}>
          Webview
        </button>
      </div>

      <div className="flex-grow overflow-hidden">
        {activeTab === 'editor' && (
          <div className="h-full flex flex-col bg-gray-100">
            <div className="flex-grow">
              <Editor
                height="100%"
                language="html" 
                value={rawCode}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  accessibilitySupport: 'off',
                  dragAndDrop: false
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'webview' && (
          <div className="h-full p-4 bg-white border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Live Preview</h2>
            <iframe
              title="Code Preview"
              srcDoc={srcDoc}
              className="w-full h-full border border-gray-300 rounded-lg shadow-inner"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditorWebview;