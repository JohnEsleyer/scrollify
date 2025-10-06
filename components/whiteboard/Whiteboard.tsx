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
import '@/styles/WhiteboardStyle.css';
import { useOrientation } from '@/hooks/useOrientation';
import { useDebounce } from '@/hooks/useDebounce';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

const INTERNAL_WIDTH = 1000;
const INTERNAL_HEIGHT = 600;


const parseInitialElements = (content: string): WhiteboardElement[] => {
    try {
        const data = JSON.parse(content);
        if (Array.isArray(data.elements)) {
            return data.elements as WhiteboardElement[];
        }
        if (Array.isArray(data)) { 
            return data as WhiteboardElement[];
        }
    } catch {
        return [];
    }
    return [];
};

interface WhiteboardProps {
    initialContent: string; // JSON string of WhiteboardElement[]
    onChange: (newContentJson: string) => void;
    onTyping: () => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ initialContent, onChange, onTyping }) => {
  const orientation = useOrientation();
  const isReadOnly = orientation === 'portrait';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 }); // Current canvas translation
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const [elements, setElements] = useState<WhiteboardElement[]>(() => parseInitialElements(initialContent));  const [mode, setMode] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#000000');

  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null); 
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [movingElements, setMovingElements] = useState<WhiteboardElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null); 
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [resizeStartElement, setResizeStartElement] = useState<WhiteboardElement | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);

  const debouncedElements = useDebounce(elements, 2000);

  const getMousePos = (event: MouseEvent): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = rect.width / INTERNAL_WIDTH; 

    return {
      x: (event.clientX - rect.left) / scaleFactor - panOffset.x,
      y: (event.clientY - rect.top) / scaleFactor - panOffset.y, 
    };
  };

  useEffect(() => {
    if (JSON.stringify(parseInitialElements(initialContent)) !== JSON.stringify(debouncedElements)) {
        
        const newContentJson = JSON.stringify({ elements: debouncedElements });
        onChange(newContentJson); 
        console.log(`[Whiteboard] Saving ${debouncedElements.length} elements.`);
    }
  }, [debouncedElements, initialContent, onChange]);


  useEffect(() => {
      const newElements = parseInitialElements(initialContent);
      if (JSON.stringify(elements) !== JSON.stringify(newElements)) {
          setElements(newElements);
      }
  }, [initialContent]);

  const setElementsAndNotify = useCallback((newElements: WhiteboardElement[] | ((prev: WhiteboardElement[]) => WhiteboardElement[])) => {
      setElements(newElements);
      
      onTyping(); 

  }, [onTyping]);

  



   const updateTextElement = useCallback((id: number, newText: string) => {
        const ctx = getCanvasContext(canvasRef.current);
        if (!ctx) return;

        setElementsAndNotify(prevElements =>
            prevElements.map(el => {
                if (el.id === id && el.type === 'text') {
                    ctx.font = `${(el as TextElement).fontSize}px sans-serif`;
                    const textMetrics = ctx.measureText(newText);
                    return { ...el, text: newText, width: textMetrics.width } as TextElement;
                }
                return el;
            })
        );
    }, [setElementsAndNotify]);


    const handleDelete = useCallback(() => {
    if (selectedElementIds.length === 0) return;

    setElementsAndNotify(prevElements =>
      prevElements.filter(el => !selectedElementIds.includes(el.id))
    );
    setSelectedElementIds([]);
    setEditingTextId(null);
    setMode('draw');
  }, [selectedElementIds, setElementsAndNotify]);


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

                       setElementsAndNotify(prev => [...prev, newImageElement]); // <-- UPDATED HERE
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


  const renderElements = useCallback(() => {
    const ctx = getCanvasContext(canvasRef.current);
    if (!ctx) return;

    ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);

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
          ctx.drawImage(imgToDraw, imageEl.x, imageEl.y, imageEl.width, imageEl.height);
          break;
      }
      
      if (!isReadOnly && isSelected && mode === 'select' && element.id !== editingTextId) {
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
    
    ctx.restore();

  }, [elements, selectedElementIds, mode, editingTextId, selectionRect, panOffset, isReadOnly]); 


  useEffect(() => {
    if (!isMoving && !isResizing && !selectionRect) {
        renderElements();
    }
  }, [elements, renderElements, selectedElementIds, editingTextId, selectionRect, isMoving, isResizing]);

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

  useEffect(() => {
    const calculateScale = () => {
        const canvasContainer = canvasRef.current?.parentElement;
        if (!canvasContainer) return;

        const containerWidth = canvasContainer.clientWidth; 
        
        const scaleFactor = containerWidth / INTERNAL_WIDTH;

        canvasContainer.style.setProperty('--scale-factor', scaleFactor.toFixed(4));
    };

    calculateScale();
      window.addEventListener('resize', calculateScale);

      return () => window.removeEventListener('resize', calculateScale);
  }, []);


  const handleMouseDown = (event: MouseEvent) => {    
    if (isReadOnly) {
        setIsPanning(true);
        panStartRef.current = { x: event.clientX, y: event.clientY }; 
        return; 
    }
    
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
      setElementsAndNotify(prev => [...prev, newElement]); 
    } else if (mode === 'select') {
      let hitElement: WhiteboardElement | undefined;
      let hitHandle: ResizeHandle | null = null;
      
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

      if (hitElement && hitHandle) {
          setIsResizing(true);
          setResizeHandle(hitHandle);
          setResizeStartPos(pos);
          setResizeStartElement({...hitElement}); 
          setSelectedElementIds([hitElement.id]); 
          return;
      }

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
          setSelectedElementIds([]);
          setSelectionRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {

    if (isPanning) {
        if (!panStartRef.current) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleFactor = rect.width / INTERNAL_WIDTH;

        // Calculate delta in internal whiteboard units (1000x600)
        const dx = (event.clientX - panStartRef.current.x) / scaleFactor;
        const dy = (event.clientY - panStartRef.current.y) / scaleFactor;

        setPanOffset(prev => ({
            x: prev.x + dx,
            y: prev.y + dy,
        }));
        
        // Update pan start position for next move event
        panStartRef.current = { x: event.clientX, y: event.clientY }; 

        // Rerender via rAF for smooth panning
        if (animationFrameRef.current !== null) { cancelAnimationFrame(animationFrameRef.current); }
        animationFrameRef.current = requestAnimationFrame(renderElements);
        return;
    }

    if (isReadOnly) return;

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
        if (animationFrameRef.current !== null) { 
          cancelAnimationFrame(animationFrameRef.current); 
        }      
        animationFrameRef.current = requestAnimationFrame(() => { 
          renderElements(); animationFrameRef.current = null; 
        }
      );

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

    setIsPanning(false);
    panStartRef.current = null;
    
    if (!isReadOnly){
      setIsDrawing(false);
      setIsMoving(false);
      setIsResizing(false);
      setOffset(null);
      setResizeHandle(null);
      setResizeStartElement(null);
      setResizeStartPos(null);
      lastPosRef.current = null; 

      if (isDrawing || isMoving || isResizing) {
          onTyping(); 
      }
      
      if (isMoving && movingElements.length > 0) {
          setElements(prevElements => {
              const finalElements = prevElements.map(el => {
                  const movedEl = movingElements.find(mEl => mEl.id === el.id);
                  return movedEl ? movedEl : el;
              });
              return finalElements;
          });
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
      }
  };

  const handleDoubleClick = (event: MouseEvent) => {
      if (isReadOnly) return;

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
      setElementsAndNotify(prev => [...prev, newElement]); 
      setMode('select');
    }
  };

   const cursorMap: Record<ToolMode, string> = {
      'select': isPanning ? 'grabbing' : isReadOnly ? 'grab' : 'default',
      'draw': 'crosshair',
      'text': 'default',
  };
  
  const editingElement = elements.find(el => el.id === editingTextId);

  return (
    <div className='whiteboard-wrapper'>
      <h2>Whiteboard</h2>

       {!isReadOnly && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center' }}>
    
            <h2>Whiteboard (Landscape: Editing)</h2>
            <button
                onClick={() => setMode('select')}
                style={{ backgroundColor: mode === 'select' ? '#007bff' : '#fff', color: mode === 'select' ? 'white' : 'black', border: '1px solid #007bff', padding: '8px 15px', cursor: 'pointer' }}>
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
          Delete Selected 
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
      )}
      
      {isReadOnly && (
          <h2>Whiteboard (Portrait: Read-Only & Pan)</h2>
      )}


       <div className="canvas-container">
          <canvas
            ref={canvasRef}
            width={INTERNAL_WIDTH}
            height={INTERNAL_HEIGHT}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            className="whiteboard-canvas"
            style={{ 
                cursor: isPanning ? 'grabbing' : cursorMap[mode] 
            }}
          />
      </div>

      {/* EditLayer is only active in interactive mode */}
     {!isReadOnly && editingTextId !== null && editingElement && editingElement.type === 'text' && (
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