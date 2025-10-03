
import React, { useRef, useState, useEffect, useCallback, MouseEvent } from 'react';


type WhiteboardElementType = 'line' | 'text' | 'image';

interface BaseElement {
  id: number;
  type: WhiteboardElementType;
  x: number;
  y: number; 
  width: number;
  height: number;
  color: string;
}

interface LineElement extends BaseElement {
  type: 'line';
  points: { x: number; y: number }[];
  size: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
}

type WhiteboardElement = LineElement | TextElement;

// --- State and Mode Definitions ---

type ToolMode = 'select' | 'draw' | 'text';

// --- Helper Functions ---

const getCanvasContext = (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  return canvas ? canvas.getContext('2d') : null;
};



const isInsideText = (x: number, y: number, textEl: TextElement): boolean => {
    const padding = 5;
    
    return (
        x >= textEl.x - padding &&
        x <= textEl.x + textEl.width + padding &&
        y >= textEl.y - textEl.fontSize - padding && 
        y <= textEl.y + padding 
    );
};

// --- Whiteboard Component ---

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [mode, setMode] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#000000');
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null); 
  
  const [editingTextId, setEditingTextId] = useState<number | null>(null);

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;


  const getMousePos = (event: MouseEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return { x: 0, y: 0 };
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
};


  // --- Rendering Logic (Draw Function) ---

  const renderElements = useCallback(() => {
    const ctx = getCanvasContext(canvasRef.current);
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;

      switch (element.type) {
        case 'line':
          const line = element as LineElement;
          if (line.points.length < 2) return;

          ctx.lineWidth = line.size;
          ctx.beginPath();
          ctx.moveTo(line.points[0].x, line.points[0].y);
          line.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();
          break;

        case 'text':
          const textEl = element as TextElement;
          
          if (textEl.id === editingTextId) return; 

          ctx.font = `${textEl.fontSize}px sans-serif`;
          ctx.fillText(textEl.text, textEl.x, textEl.y); 

          if (element.id === selectedElementId && mode === 'select') {
             ctx.strokeStyle = '#007bff';
             ctx.lineWidth = 2;
             ctx.strokeRect(
                 textEl.x - 5, 
                 textEl.y - textEl.fontSize - 5, 
                 textEl.width + 10, 
                 textEl.height + 10 
             );
          }
          break;
      }
    });
  }, [elements, selectedElementId, mode, editingTextId]); 

  useEffect(() => {
    renderElements();
  }, [elements, renderElements, selectedElementId, editingTextId]);

  // --- Utility to Update Text Element ---
    const updateTextElement = useCallback((id: number, newText: string, finalUpdate: boolean) => {
        const ctx = getCanvasContext(canvasRef.current);
        if (!ctx) return;

        setElements(prevElements =>
            prevElements.map(el => {
                if (el.id === id && el.type === 'text') {
                    
                    ctx.font = `${(el as TextElement).fontSize}px sans-serif`;
                    const textMetrics = ctx.measureText(newText);

                    return {
                        ...el,
                        text: newText,
                        width: textMetrics.width, 
                    } as TextElement;
                }
                return el;
            })
        );
    }, []); 
    

  // --- Event Handlers ---

  const handleMouseDown = (event: MouseEvent) => {
    const pos = getMousePos(event);
    
    if (editingTextId !== null) {
        setEditingTextId(null);
    }
    
    if (mode === 'draw') {
      
      setIsDrawing(true);
      const newElement: LineElement = {
        id: Date.now(),
        type: 'line',
        x: pos.x, y: pos.y, width: 0, height: 0,
        color: color,
        size: 5,
        points: [pos],
      };
      setElements(prev => [...prev, newElement]);
      
    } else if (mode === 'select') {
      let hitElement: WhiteboardElement | null = null;

      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        
        if (el.type === 'text' && isInsideText(pos.x, pos.y, el as TextElement)) {
          hitElement = el;
          break;
        }
      }
      
      if (hitElement) {
        setSelectedElementId(hitElement.id);
        setIsMoving(true);
        setOffset({ x: pos.x - hitElement.x, y: pos.y - hitElement.y });
      } else {
        setSelectedElementId(null);
        setIsMoving(false);
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    const pos = getMousePos(event);

    if (isDrawing && mode === 'draw') {
      
      setElements(prevElements => {
        const lastIndex = prevElements.length - 1;
        if (lastIndex < 0) return prevElements;
        const lastElement = prevElements[lastIndex];
        if (lastElement.type === 'line') {
          const updatedLine = {
            ...lastElement,
            points: [...lastElement.points, pos],
          } as LineElement;
          return prevElements.map((el, i) => (i === lastIndex ? updatedLine : el));
        }
        return prevElements;
      });
      
    } else if (isMoving && mode === 'select' && selectedElementId !== null && offset) {
      
      setElements(prevElements => 
        prevElements.map(el => {
          if (el.id === selectedElementId) {
            return {
              ...el,
              x: pos.x - offset.x,
              y: pos.y - offset.y,
            };
          }
          return el;
        })
      );
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsMoving(false); 
    setOffset(null);    
  };
  
  const handleDoubleClick = (event: MouseEvent) => {
      const pos = getMousePos(event);
      if (mode === 'select') {
          for (let i = elements.length - 1; i >= 0; i--) {
              const el = elements[i];
              if (el.type === 'text' && isInsideText(pos.x, pos.y, el as TextElement)) {
                  setSelectedElementId(el.id);
                  setEditingTextId(el.id);
                  return;
              }
          }
      }
  }


  // --- Text Input and Placement (Remains the same) ---
  const handleTextPlacement = () => {
    const textPrompt = prompt("Enter text for the whiteboard:");
    const ctx = getCanvasContext(canvasRef.current);
    
    if (textPrompt && ctx) {
      const fontSize = 24;
      ctx.font = `${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(textPrompt);
      const elementWidth = textMetrics.width;
      const elementHeight = fontSize * 1.2;

      const newElement: TextElement = {
        id: Date.now(),
        type: 'text',
        x: CANVAS_WIDTH / 4, 
        y: CANVAS_HEIGHT / 2, 
        width: elementWidth,
        height: elementHeight,
        color: color,
        text: textPrompt,
        fontSize: fontSize,
      };
      setElements(prev => [...prev, newElement]);
      setMode('select');
    }
  };

  // --- Utility Component for Editing ---
   const EditLayer: React.FC = () => {
        if (editingTextId === null) return null;

        const element = elements.find(el => el.id === editingTextId) as TextElement | undefined;
        if (!element) return null;

        const canvas = canvasRef.current;
        if (!canvas) return null;

        const [localText, setLocalText] = useState(element.text);

        useEffect(() => {
            setLocalText(element.text);
        }, [element.text]);

        const canvasRect = canvas.getBoundingClientRect();

        const style: React.CSSProperties = {
            position: 'absolute',
            left: canvasRect.left + element.x - 5,
            top: canvasRect.top + element.y - element.fontSize - 3, 
            
            width: element.width + 50, 
            height: element.fontSize + 6, 
            
            font: `${element.fontSize}px sans-serif`,
            color: element.color,
            border: '1px solid #007bff',
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '1px 3px', 
            margin: 0,
            boxSizing: 'border-box',
            
            direction: 'ltr', 
            textAlign: 'left',
            outline: 'none', 
        };

        const handleBlur = () => {
            
            updateTextElement(editingTextId, localText, true);
            setEditingTextId(null);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { 
            
            if (e.key === 'Enter') {
                e.preventDefault();
                updateTextElement(editingTextId, localText, true);
                setEditingTextId(null);
            }
        };

        return (
            <input
                type="text"
                autoFocus
                style={style}
                value={localText}
                onChange={(e) => {
                    setLocalText(e.target.value);
                    updateTextElement(editingTextId, e.target.value, false);
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    };
  
  
  // --- Cursor Mapping ---
  const cursorMap: Record<ToolMode, string> = {
      'select': 'default', 
      'draw': 'crosshair',
      'text': 'default', 
  };


  return (
    
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', position: 'relative' }}>
      <h2>📐 Excalidraw-like Whiteboard</h2>

      
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
        
        <button
          onClick={() => setMode('select')}
          style={{ 
            backgroundColor: mode === 'select' ? '#007bff' : '#fff', 
            color: mode === 'select' ? 'white' : 'black',
            border: '1px solid #007bff',
            padding: '8px 15px',
            cursor: 'pointer'
          }}
        >
          Select/Move 👈
        </button>
        
        <button
          onClick={() => setMode('draw')}
          style={{ 
            backgroundColor: mode === 'draw' ? '#007bff' : '#fff', 
            color: mode === 'draw' ? 'white' : 'black',
            border: '1px solid #007bff',
            padding: '8px 15px',
            cursor: 'pointer'
          }}
        >
          Draw Line ✍️
        </button>
        
        <button 
          onClick={handleTextPlacement}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #333'
          }}
        >
          Add Text 💬
        </button>

        
        <div>
          <label htmlFor="color-picker" style={{ marginRight: '5px' }}>Color:</label>
          <input
            id="color-picker"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setElements([])}
          style={{ padding: '8px 15px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Clear All
        </button>
      </div>

      
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick} 
        style={{ 
          border: '2px solid #333', 
          backgroundColor: 'white', 
          cursor: cursorMap[mode] 
        }}
      />
      
      
      <EditLayer />
    </div>
  );
};

export default Whiteboard;