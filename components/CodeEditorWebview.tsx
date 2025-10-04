import { useState, useMemo, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useDebounce } from '@/hooks/useDebounce';

interface CodeState {
  html: string;
  css: string;
  js: string;
}

const initialCode: CodeState = {
  html: '<h1>Hello World!</h1>\n<p class="text-red">This is a simple demo.</p>',
  css: '.text-red { color: red; font-family: sans-serif; }',
  js: 'console.log("JavaScript executed!");\nalert("Script loaded!");',
};

 const getInitialState = (content: string | undefined): CodeState => {
      if (content && content.startsWith('{') && content.endsWith('}')) {
          try {
              const parsed = JSON.parse(content);
              return {
                  html: parsed.html || initialCode.html,
                  css: parsed.css || initialCode.css,
                  js: parsed.js || initialCode.js,
              };
          } catch (e) {
              console.error("Failed to parse code editor JSON:", e);
          }
      }
      return initialCode; 
  };

interface CodeEditorWebviewProps {
  initialContent?: string; 
  onChange?: (newContentJson: string) => void; 
}
const CodeEditorWebview: React.FC<CodeEditorWebviewProps> = ({ initialContent, onChange}) => {  
  const [code, setCode] = useState<CodeState>(initialCode);
  
  const codeJsonString = JSON.stringify(code);
  const debouncedCodeJson = useDebounce(codeJsonString, 1000); 


  useEffect(() => {
    const initialJsonString = JSON.stringify(getInitialState(initialContent));
    
    if (onChange && debouncedCodeJson !== initialJsonString) {
        console.log("Saving Webview code via debounce...");
        onChange(debouncedCodeJson);
    }
    
  }, [debouncedCodeJson, onChange, initialContent]);

   useEffect(() => {
      setCode(getInitialState(initialContent));
  }, [initialContent]);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'webview'>('editor');
  const [editorPanel, setEditorPanel] = useState<'html' | 'css' | 'js'>('html');

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setCode((prev) => ({
        ...prev,
        [editorPanel]: value,
      }));
    }
  }, [editorPanel]);

 

  const srcDoc = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <style>${code.css}</style>
      </head>
      <body>
          ${code.html}
          <script>${code.js}</script>
      </body>
      </html>
    `;
  }, [code]);

  const tabClass = (tabName: 'editor' | 'webview') =>
    `px-4 py-2 text-sm font-medium transition-colors duration-200 ease-in-out border-b-2
    ${activeTab === tabName
      ? 'border-blue-500 text-blue-600 bg-blue-50'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  const panelTabClass = (panelName: 'html' | 'css' | 'js') =>
    `px-3 py-1 text-xs font-medium transition-colors duration-200 ease-in-out
    ${editorPanel === panelName
      ? 'bg-gray-700 text-white rounded-t'
      : 'text-gray-400 hover:text-white'
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
            <div className="bg-gray-800 flex space-x-2 p-1">
              <button className={panelTabClass('html')} onClick={() => setEditorPanel('html')}>
                HTML
              </button>
              <button className={panelTabClass('css')} onClick={() => setEditorPanel('css')}>
                CSS
              </button>
              <button className={panelTabClass('js')} onClick={() => setEditorPanel('js')}>
                JS
              </button>
            </div>

            <div className="flex-grow">
              <Editor
                height="100%"
                language={editorPanel}
                value={code[editorPanel]}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  accessibilitySupport: 'off',
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