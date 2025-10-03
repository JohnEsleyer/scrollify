import React, { useRef, useState, useEffect, useCallback, MouseEvent } from 'react';


interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

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

type WhiteboardElement = LineElement | TextElement | ImageElement; 
type WhiteboardElementType = 'line' | 'text' | 'image';


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

const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [mode, setMode] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#000000');

  // State for drawing/moving
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null); 

  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // OPTIMIZATION STATES
  const [movingElements, setMovingElements] = useState<WhiteboardElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const lastPosRef = useRef<{ x: number; y: number } | null>(null); 

  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 600;

  // --- Utility Functions ---

const handleDelete = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    setElements(prevElements => 
      prevElements.filter(el => !selectedElementIds.includes(el.id))
    );
    setSelectedElementIds([]);
    setEditingTextId(null);
    setMode('draw'); // Switch back to a default mode
}, [selectedElementIds]);


const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (!blob) continue;

            // Prevent default paste behavior (e.g., pasting into a focused text input)
            event.preventDefault(); 
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const src = e.target?.result as string;
                if (!src) return;

                // Create an image object to get its dimensions
                const img = new Image();
                img.onload = () => {
                    const id = Date.now();
                    
                    // Set dimensions and position 
                    const imgWidth = img.width > CANVAS_WIDTH / 2 ? CANVAS_WIDTH / 3 : img.width;
                    const imgHeight = (img.height / img.width) * imgWidth;
                    
                    const newImageElement: ImageElement = {
                        id,
                        type: 'image',
                        x: CANVAS_WIDTH / 2 - imgWidth / 2,
                        y: CANVAS_HEIGHT / 2 - imgHeight / 2,
                        width: imgWidth,
                        height: imgHeight,
                        color: '#000000', 
                        src: src,
                    };

                    setElements(prev => [...prev, newImageElement]);
                    setSelectedElementIds([id]);
                    setMode('select');
                };
                img.src = src;
            };
            reader.readAsDataURL(blob);
            return; 
        }
    }
};

  const getMousePos = (event: MouseEvent): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const getLineBoundingBox = (line: LineElement) => {
      const xs = line.points.map(p => p.x);
      const ys = line.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };
  
  const isElementInRect = (el: WhiteboardElement, rect: { x: number; y: number; w: number; h: number }): boolean => {
      const normalizedRect = {
          x: rect.w < 0 ? rect.x + rect.w : rect.x,
          y: rect.h < 0 ? rect.y + rect.h : rect.y,
          w: Math.abs(rect.w),
          h: Math.abs(rect.h)
      };

      if (el.type === 'text') {
          const textTop = el.y - el.fontSize;
          const textBottom = el.y;
          const textLeft = el.x;
          const textRight = el.x + el.width;
          
          return (
              textLeft < normalizedRect.x + normalizedRect.w &&
              textRight > normalizedRect.x &&
              textTop < normalizedRect.y + normalizedRect.h &&
              textBottom > normalizedRect.y
          );
      } else if (el.type === 'line') {
          const bbox = getLineBoundingBox(el as LineElement);
          return (
              bbox.x < normalizedRect.x + normalizedRect.w &&
              bbox.x + bbox.w > normalizedRect.x &&
              bbox.y < normalizedRect.y + normalizedRect.h &&
              bbox.y + bbox.h > normalizedRect.y
          );
      }
      return false;
  };

  const updateTextElement = useCallback((id: number, newText: string) => {
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

  // --- Rendering Logic (Called by rAF) ---
  const renderElements = useCallback(() => {
    const ctx = getCanvasContext(canvasRef.current);
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      const isSelected = selectedElementIds.includes(element.id);

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
          break;
        case 'image':
          const imageEl = element as ImageElement;

          const imgToDraw = new Image();
          imgToDraw.onload = () => {
            ctx.drawImage(imgToDraw, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          };
          imgToDraw.src = imageEl.src;

          ctx.drawImage(imgToDraw, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          break;
      }
      
      if (isSelected && mode === 'select' && element.id !== editingTextId) {
         ctx.strokeStyle = '#007bff';
         ctx.lineWidth = 2;
         if (element.type === 'text') {
             const textEl = element as TextElement;
             ctx.strokeRect(textEl.x - 5, textEl.y - textEl.fontSize - 5, textEl.width + 10, textEl.height + 10);
         } else if (element.type === 'line') {
             const bbox = getLineBoundingBox(element as LineElement);
             ctx.strokeRect(bbox.x - 5, bbox.y - 5, bbox.w + 10, bbox.h + 10);
         } else if (element.type === 'image') {
             const imageEl = element as ImageElement;
             ctx.strokeRect(imageEl.x - 5, imageEl.y - 5, imageEl.width + 10, imageEl.height + 10);
         }
      }
    });

    if (selectionRect) {
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        ctx.setLineDash([]);
    }

  }, [elements, selectedElementIds, mode, editingTextId, selectionRect]);

  useEffect(() => {
    if (!isMoving && !selectionRect) {
        renderElements();
    }
  }, [elements, renderElements, selectedElementIds, editingTextId, selectionRect, isMoving]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no text is currently being edited
      if (editingTextId === null) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault(); 
          handleDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDelete, editingTextId]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // --- Event Handlers ---
  const handleMouseDown = (event: MouseEvent) => {
    const pos = getMousePos(event);
    const isControlOrCommand = event.ctrlKey || event.metaKey; // Check for Ctrl/Cmd key

    // Clear text editing mode if active
    if (editingTextId !== null) setEditingTextId(null);

    if (mode === 'draw') {
      // Line Drawing Setup
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
      let hitElement: WhiteboardElement | undefined;
      
      for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          
          // Check for Text Hit
          if (el.type === 'text' && isInsideText(pos.x, pos.y, el as TextElement)) {
              hitElement = el;
              break;
          }
          
          // Check for Line Hit (Only checking selected lines for better performance)
          if (el.type === 'line' && selectedElementIds.includes(el.id)) {
              const bbox = getLineBoundingBox(el as LineElement);
              if (pos.x >= bbox.x - 10 && pos.x <= bbox.x + bbox.w + 10 &&
                  pos.y >= bbox.y - 10 && pos.y <= bbox.y + bbox.h + 10) {
                  hitElement = el; 
                  break;
              }
          } 
          
          // Check for Image Hit
          if (el.type === 'image') {
            if (pos.x >= el.x && pos.x <= el.x + el.width &&
                pos.y >= el.y && pos.y <= el.y + el.height) {
                hitElement = el;
                break;
            }
          }
      } 

      //  Movement Setup or Selection Box Start
      if (hitElement) {
          
          let currentSelectedIds = selectedElementIds;

          if (isControlOrCommand) {
              // --- Multi-Selection Logic (Ctrl/Cmd pressed) ---
              if (selectedElementIds.includes(hitElement.id)) {
                  // Deselect
                  currentSelectedIds = selectedElementIds.filter(id => id !== hitElement.id);
              } else {
                  // Add to selection
                  currentSelectedIds = [...selectedElementIds, hitElement.id];
              }
          } else if (!selectedElementIds.includes(hitElement.id)) {
              // Single Selection (Ctrl/Cmd not pressed and element not selected)
              currentSelectedIds = [hitElement.id];
          }

          setSelectedElementIds(currentSelectedIds);
          
          // Start moving all currently selected elements
          if (currentSelectedIds.length > 0) {
              setIsMoving(true);
              
              // Setup the fast path mutable array
              const elementsToMove = elements.filter(el => currentSelectedIds.includes(el.id));
              setMovingElements(elementsToMove);

              lastPosRef.current = pos; 
        
              // Use the first selected element for offset calculation (for single-element selection feel)
              const firstSelectedEl = elementsToMove[0]; 
              if (firstSelectedEl) {
                  const startX = firstSelectedEl.type === 'line' ? firstSelectedEl.points[0].x : firstSelectedEl.x;
                  const startY = firstSelectedEl.type === 'line' ? firstSelectedEl.points[0].y : firstSelectedEl.y;
                  setOffset({ x: pos.x - startX, y: pos.y - startY });
              }
          } else {
              // If deselecting the last element with Ctrl/Cmd, start a selection box
              setSelectionRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
          }

      } else {
          // No hit, start a new selection box
          setSelectedElementIds([]);
          setSelectionRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
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

    } else if (isMoving && mode === 'select' && movingElements.length > 0) {

      if (!lastPosRef.current) {
          lastPosRef.current = pos;
          return;
      }
      
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;

      for (const el of movingElements) {
          if (el.type === 'text') {
              el.x += dx;
              el.y += dy;
          } else if (el.type === 'line') {
              for (const p of el.points) {
                  p.x += dx;
                  p.y += dy;
              }
          } else if (el.type === 'image'){
            el.x += dx;
            el.y += dy;
          }
      }

      lastPosRef.current = pos; 

      if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
          renderElements();
          animationFrameRef.current = null;
      });

    } else if (selectionRect && mode === 'select') {
        setSelectionRect(prevRect => {
            if (!prevRect) return null;
            return {
                ...prevRect,
                w: pos.x - prevRect.x,
                h: pos.y - prevRect.y,
            };
        });
        
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
            renderElements();
            animationFrameRef.current = null;
        });
    }
  };

  const handleMouseUp = () => {

    if (animationFrameRef.current !== null){
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsDrawing(false);
    setIsMoving(false);
    setOffset(null);
    
    lastPosRef.current = null; 

    if (movingElements.length > 0) {
        setElements(prevElements => [...prevElements]);
        setMovingElements([]);
    }

    if (selectionRect) {
        const newlySelectedIds = elements
            .filter(el => isElementInRect(el, selectionRect))
            .map(el => el.id);

        setSelectedElementIds(newlySelectedIds);
        setSelectionRect(null);

        if (newlySelectedIds.length === 0) {
            setMode('select');
        }

        // Force a final render to ensure the canvas reflects the new state (no selection rect)
        setElements(prev => [...prev]);
    }
  };

  const handleDoubleClick = (event: MouseEvent) => {
      const pos = getMousePos(event);
      if (mode === 'select') {
          for (let i = elements.length - 1; i >= 0; i--) {
              const el = elements[i];
              if (el.type === 'text' && isInsideText(pos.x, pos.y, el as TextElement)) {
                  setSelectedElementIds([el.id]);
                  setEditingTextId(el.id);
                  return;
              }
          }
      }
  }

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
            updateTextElement(editingTextId, localText);
            setEditingTextId(null);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateTextElement(editingTextId, localText);
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
                    updateTextElement(editingTextId, e.target.value);
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        );
    };

    useEffect(() => {
      document.addEventListener('paste', handlePaste);

      return () => {
        document.removeEventListener('paste', handlePaste);
      };
    }, [handlePaste]);

  // --- Cursor Mapping ---
  const cursorMap: Record<ToolMode, string> = {
      'select': 'default',
      'draw': 'crosshair',
      'text': 'default',
  };


  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '8px', position: 'relative' }}>
      <h2>Whiteboard</h2>

      {/* Toolbar */}
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
          Select/Move 
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
          Draw Line 
        </button>

        <button
          onClick={handleTextPlacement}
          style={{
            padding: '8px 15px',
            cursor: 'pointer',
            border: '1px solid #333'
          }}
        >
          Add Text 
        </button>

        {/* Color Picker and Clear Button */}
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

      {/* Canvas */}
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