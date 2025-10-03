// src/components/Whiteboard.tsx

import React, { useRef, useState, useEffect, useCallback, MouseEvent } from 'react';
import { 
    WhiteboardElement, 
    LineElement, 
    ImageElement, 
    TextElement, 
    ToolMode, 
    ResizeHandle,
    SelectionRect 
} from './WhiteboardTypes';
import { 
    getCanvasContext,
    getLineBoundingBox,
    isInsideText,
    getElementBounds,
    getResizeHandleHit,
    isElementInRect,
    drawResizeHandle 
} from './WhiteboardElementUtils';
import { EditLayer } from './EditLayer';


const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [mode, setMode] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#000000');

  // State for drawing/moving
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null); 

  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);

  // OPTIMIZATION STATES
  const [movingElements, setMovingElements] = useState<WhiteboardElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null); 

  // RESIZING STATES
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartElement, setResizeStartElement] = useState<WhiteboardElement | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);

  // --- Utility Functions ---

  const getMousePos = (event: MouseEvent): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const updateTextElement = useCallback((id: number, newText: string) => {
        const ctx = getCanvasContext(canvasRef.current);
        if (!ctx) return;

        setElements(prevElements =>
            prevElements.map(el => {
                if (el.id === id && el.type === 'text') {
                    // Update text, then measure its new width
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

  const handleDelete = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    setElements(prevElements => 
      prevElements.filter(el => !selectedElementIds.includes(el.id))
    );
    setSelectedElementIds([]);
    setEditingTextId(null);
    setMode('draw');
  }, [selectedElementIds]);


  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (!blob) continue;

            event.preventDefault(); 
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const src = e.target?.result as string;
                if (!src) return;

                const img = new Image();
                img.onload = () => {
                    const id = Date.now();
                    
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
          imgToDraw.src = imageEl.src;

          // Note: drawImage needs to be handled carefully in a loop like this for production.
          // For simplicity here, we assume the image is in memory or handles loading quickly.
          ctx.drawImage(imgToDraw, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          break;
      }
      
      if (isSelected && mode === 'select' && element.id !== editingTextId) {
         ctx.strokeStyle = '#007bff';
         ctx.lineWidth = 2;
         ctx.setLineDash([6, 3]);

         const bounds = getElementBounds(element);
         ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
         ctx.setLineDash([]);
         
         if (element.type !== 'line') {
             drawResizeHandle(ctx, bounds.x, bounds.y); // TL
             drawResizeHandle(ctx, bounds.x + bounds.w, bounds.y); // TR
             drawResizeHandle(ctx, bounds.x, bounds.y + bounds.h); // BL
             drawResizeHandle(ctx, bounds.x + bounds.w, bounds.y + bounds.h); // BR
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
    // Only re-render when a state change happens outside of a continuous action (move/resize)
    if (!isMoving && !isResizing && !selectionRect) {
        renderElements();
    }
  }, [elements, renderElements, selectedElementIds, editingTextId, selectionRect, isMoving, isResizing]);

  // --- Keyboard & Paste Effects ---

  useEffect(() => {
      document.addEventListener('paste', handlePaste);
      const handleKeyDown = (event: KeyboardEvent) => {
        const isInput = (event.target as HTMLElement).tagName.toLowerCase() === 'input';
        if (isInput) return;

        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          handleDelete();
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('keydown', handleKeyDown);
      };
  }, [handleDelete]); 

  // --- Event Handlers (trimmed for brevity, focusing on React-specific implementation) ---
  const handleMouseDown = (event: MouseEvent) => {
    const pos = getMousePos(event);
    const isControlOrCommand = event.ctrlKey || event.metaKey; 

    if (editingTextId !== null) setEditingTextId(null);

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
      let hitElement: WhiteboardElement | undefined;
      let hitHandle: ResizeHandle | null = null;
      
      // Check for Resize Handle Hit first (only on selected elements)
      for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          if (selectedElementIds.includes(el.id) && el.type !== 'line') {
              const handle = getResizeHandleHit(pos.x, pos.y, el);
              if (handle) {
                  hitElement = el;
                  hitHandle = handle;
                  break;
              }
          }
      }

      // Start Resizing
      if (hitElement && hitHandle) {
          setIsResizing(true);
          setResizeHandle(hitHandle);
          setResizeStartPos(pos);
          setResizeStartElement({...hitElement}); 
          setSelectedElementIds([hitElement.id]); 
          return;
      }


      // Check for Element Hit (if no resize handle hit)
      for (let i = elements.length - 1; i >= 0; i--) {
          const el = elements[i];
          
          if (el.type === 'text' && isInsideText(pos.x, pos.y, el as TextElement)) {
              hitElement = el;
              break;
          }
          if (el.type === 'line' && selectedElementIds.includes(el.id)) {
              const bbox = getLineBoundingBox(el as LineElement);
              if (pos.x >= bbox.x - 10 && pos.x <= bbox.x + bbox.w + 10 &&
                  pos.y >= bbox.y - 10 && pos.y <= bbox.y + bbox.h + 10) {
                  hitElement = el; 
                  break;
              }
          } 
          if (el.type === 'image') {
            if (pos.x >= el.x && pos.x <= el.x + el.width &&
                pos.y >= el.y && pos.y <= el.y + el.height) {
                hitElement = el;
                break;
            }
          }
      } 

      // Movement Setup or Selection Box Start
      if (hitElement) {
          
          let currentSelectedIds = selectedElementIds;

          if (isControlOrCommand) {
              currentSelectedIds = selectedElementIds.includes(hitElement.id)
                  ? selectedElementIds.filter(id => id !== hitElement.id)
                  : [...selectedElementIds, hitElement.id];
          } else if (!selectedElementIds.includes(hitElement.id)) {
              currentSelectedIds = [hitElement.id];
          }

          setSelectedElementIds(currentSelectedIds);
          
          if (currentSelectedIds.length > 0) {
              setIsMoving(true);
              setMovingElements(elements.filter(el => currentSelectedIds.includes(el.id)));
              lastPosRef.current = pos; 
          } else {
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
      if (!lastPosRef.current) { lastPosRef.current = pos; return; }
      
      const dx = pos.x - lastPosRef.current.x;
      const dy = pos.y - lastPosRef.current.y;

      for (const el of movingElements) {
          if (el.type === 'text' || el.type === 'image') {
              el.x += dx;
              el.y += dy;
          } else if (el.type === 'line') {
              for (const p of el.points) {
                  p.x += dx;
                  p.y += dy;
              }
          }
      }

      lastPosRef.current = pos; 
      if (animationFrameRef.current !== null) { cancelAnimationFrame(animationFrameRef.current); }
      animationFrameRef.current = requestAnimationFrame(() => { renderElements(); animationFrameRef.current = null; });

    } else if (isResizing && resizeStartElement && resizeStartPos && resizeHandle) { 
        const startEl = resizeStartElement; 

        const dx = pos.x - resizeStartPos.x;
        const dy = pos.y - resizeStartPos.y;
        
        let newX = resizeStartElement.x;
        let newY = resizeStartElement.y;
        let newWidth = resizeStartElement.width;
        let newHeight = resizeStartElement.height;

        const isImage = startEl.type === 'image';
        const aspectRatio = isImage && startEl.height > 0 ? startEl.width / startEl.height : 1;
             
        switch (resizeHandle) {
            case 'br':
                newWidth = Math.max(10, startEl.width + dx);
                newHeight = isImage ? newWidth / aspectRatio : Math.max(10, resizeStartElement.height + dy);                
                break;
            case 'bl':
                newX = resizeStartElement.x + dx;
                newWidth = Math.max(10, startEl.width - dx);
                if (isImage) {
                    newHeight = newWidth / aspectRatio;
                    newY = resizeStartElement.y + (resizeStartElement.height - newHeight);
                }
                break;
            case 'tr':
                newY = startEl.y + dy;
                newWidth = Math.max(10, resizeStartElement.width + dx);
                if (isImage) {
                    newHeight = newWidth / aspectRatio;
                    newY = startEl.y + (startEl.height - newHeight);
                } else {
                    newHeight = Math.max(10, resizeStartElement.height - dy);
                    newY = resizeStartElement.y + dy;
                }
                break;
            case 'tl':
                newX = startEl.x + dx;
                newY = startEl.y + dy;
                newWidth = Math.max(10, startEl.width - dx);
                
                if (isImage) {
                    newHeight = newWidth / aspectRatio;
                } else {
                    newHeight = Math.max(10, startEl.height - dy);
                }
                break;
        }
        // --- End Scaling Logic ---

        setElements(prevElements => 
            prevElements.map(el => {
                if (el.id === resizeStartElement.id) {
                    const updatedElement: WhiteboardElement = {
                        ...el,
                        x: newX,
                        y: newY,
                        width: newWidth,
                        height: newHeight,
                    };

                    if (updatedElement.type === 'text') {
                        const newFontSize = Math.floor(newHeight / 1.2); 
                        (updatedElement as TextElement).fontSize = Math.max(8, newFontSize); 
                        const ctx = getCanvasContext(canvasRef.current);
                        if (ctx) {
                             ctx.font = `${(updatedElement as TextElement).fontSize}px sans-serif`;
                             const textMetrics = ctx.measureText((updatedElement as TextElement).text);
                             updatedElement.width = textMetrics.width;
                        }
                    }
                    return updatedElement;
                }
                return el;
            })
        );
        
        if (animationFrameRef.current !== null) { cancelAnimationFrame(animationFrameRef.current); }
        animationFrameRef.current = requestAnimationFrame(() => { renderElements(); animationFrameRef.current = null; });


    } else if (selectionRect && mode === 'select') {
        setSelectionRect(prevRect => {
            if (!prevRect) return null;
            return { ...prevRect, w: pos.x - prevRect.x, h: pos.y - prevRect.y, };
        });
        
        if (animationFrameRef.current !== null) { cancelAnimationFrame(animationFrameRef.current); }
        animationFrameRef.current = requestAnimationFrame(() => { renderElements(); animationFrameRef.current = null; });
    
    } else if (mode === 'select' && !isMoving && !isResizing && !selectionRect) {
        // Cursor change logic
        const elementUnderCursor = elements.slice().reverse().find(el => {
            return selectedElementIds.includes(el.id) && el.type !== 'line' && getResizeHandleHit(pos.x, pos.y, el);
        });

        const canvas = canvasRef.current;
        if (canvas) {
            if (elementUnderCursor) {
                const handle = getResizeHandleHit(pos.x, pos.y, elementUnderCursor);
                if (handle === 'tl' || handle === 'br') {
                    canvas.style.cursor = 'nwse-resize';
                } else if (handle === 'tr' || handle === 'bl') {
                    canvas.style.cursor = 'nesw-resize';
                }
            } else {
                canvas.style.cursor = cursorMap[mode];
            }
        }
    }
  };

  const handleMouseUp = () => {

    if (animationFrameRef.current !== null){
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsDrawing(false);
    setIsMoving(false);
    setIsResizing(false);
    setOffset(null);
    setResizeHandle(null);
    setResizeStartElement(null);
    setResizeStartPos(null);
    lastPosRef.current = null; 

    if (movingElements.length > 0) {
        setElements(prevElements => 
            prevElements.map(el => {
                const movedEl = movingElements.find(mEl => mEl.id === el.id);
                return movedEl ? movedEl : el;
            })
        );
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

  const cursorMap: Record<ToolMode, string> = {
      'select': 'default', 
      'draw': 'crosshair',
      'text': 'default',
  };
  
  const editingElement = elements.find(el => el.id === editingTextId);

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
          Select/Move/Resize 
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

        {/* Delete Button */}
        <button
          onClick={handleDelete} 
          disabled={selectedElementIds.length === 0} 
          style={{ 
            padding: '8px 15px', 
            cursor: selectedElementIds.length > 0 ? 'pointer' : 'not-allowed', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Delete Selected 🗑️
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

      {editingTextId !== null && editingElement && editingElement.type === 'text' && (
          <EditLayer 
            element={editingElement as TextElement}
            canvasRef={canvasRef as React.RefObject<HTMLCanvasElement | null>}
            updateTextElement={updateTextElement}
            setEditingTextId={setEditingTextId}
        />
      )}
    </div>
  );
};