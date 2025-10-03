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

// --- Resize Types ---
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br'; // Top-Left, Top-Right, Bottom-Left, Bottom-Right

// --- Helper Functions ---
const getCanvasContext = (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  return canvas ? canvas.getContext('2d') : null;
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

const isInsideText = (x: number, y: number, textEl: TextElement): boolean => {
    const padding = 5;
    return (
        x >= textEl.x - padding &&
        x <= textEl.x + textEl.width + padding &&
        y >= textEl.y - textEl.fontSize - padding &&
        y <= textEl.y + padding
    );
};

const getElementBounds = (element: WhiteboardElement): { x: number, y: number, w: number, h: number } => {
    const padding = 5; // Padding for the selection box

    if (element.type === 'text') {
        const textEl = element as TextElement;
        return {
            x: textEl.x - padding,
            y: textEl.y - textEl.fontSize - padding,
            w: textEl.width + 2 * padding,
            h: textEl.fontSize + 2 * padding,
        };
    } else if (element.type === 'line') {
        const line = element as LineElement;
        const bbox = getLineBoundingBox(line);
        return {
            x: bbox.x - padding,
            y: bbox.y - padding,
            w: bbox.w + 2 * padding,
            h: bbox.h + 2 * padding,
        };
    } else if (element.type === 'image') {
        const imageEl = element as ImageElement;
        return {
            x: imageEl.x - padding,
            y: imageEl.y - padding,
            w: imageEl.width + 2 * padding,
            h: imageEl.height + 2 * padding,
        };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
}


const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [mode, setMode] = useState<ToolMode>('draw');
  const [color, setColor] = useState<string>('#000000');

  // State for drawing/moving
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isResizing, setIsResizing] = useState(false); // NEW: Resizing state
  const [selectedElementIds, setSelectedElementIds] = useState<number[]>([]);
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null); 

  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // OPTIMIZATION STATES
  const [movingElements, setMovingElements] = useState<WhiteboardElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const lastPosRef = useRef<{ x: number; y: number } | null>(null); 

  // RESIZING STATES
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null); // NEW
  const [resizeStartElement, setResizeStartElement] = useState<WhiteboardElement | null>(null); // NEW
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null); // NEW

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

  

  
  const isElementInRect = (el: WhiteboardElement, rect: { x: number; y: number; w: number; h: number }): boolean => {
      const normalizedRect = {
          x: rect.w < 0 ? rect.x + rect.w : rect.x,
          y: rect.h < 0 ? rect.y + rect.h : rect.y,
          w: Math.abs(rect.w),
          h: Math.abs(rect.h)
      };
      
      const bounds = getElementBounds(el);

      return (
          bounds.x < normalizedRect.x + normalizedRect.w &&
          bounds.x + bounds.w > normalizedRect.x &&
          bounds.y < normalizedRect.y + normalizedRect.h &&
          bounds.y + bounds.h > normalizedRect.y
      );
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

    const getResizeHandleHit = (x: number, y: number, element: WhiteboardElement): ResizeHandle | null => {
        if (element.type === 'line') return null; 

        const bounds = getElementBounds(element);
        const handleSize = 10;
        const halfSize = handleSize / 2;

        const handles = {
            tl: { x: bounds.x, y: bounds.y },
            tr: { x: bounds.x + bounds.w, y: bounds.y },
            bl: { x: bounds.x, y: bounds.y + bounds.h },
            br: { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
        };

        for (const [key, pos] of Object.entries(handles)) {
            if (
                x >= pos.x - halfSize && x <= pos.x + halfSize &&
                y >= pos.y - halfSize && y <= pos.y + halfSize
            ) {
                return key as ResizeHandle;
            }
        }
        return null;
    };


  // --- Rendering Logic (Called by rAF) ---

  // Helper to draw the resize handle
  const drawResizeHandle = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const size = 10;
    const halfSize = size / 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.fillRect(x - halfSize, y - halfSize, size, size);
    ctx.strokeRect(x - halfSize, y - halfSize, size, size);
  }

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
          // Don't draw if currently being edited
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
      
      if (isSelected && mode === 'select' && element.id !== editingTextId) {
         ctx.strokeStyle = '#007bff';
         ctx.lineWidth = 2;
         ctx.setLineDash([6, 3]);

         const bounds = getElementBounds(element);
         ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
         ctx.setLineDash([]);
         
         // Draw resize handles for scalable elements
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
    if (!isMoving && !isResizing && !selectionRect) {
        renderElements();
    }
  }, [elements, renderElements, selectedElementIds, editingTextId, selectionRect, isMoving, isResizing]);



  // --- Event Handlers ---
  const handleMouseDown = (event: MouseEvent) => {
    const pos = getMousePos(event);
    const isControlOrCommand = event.ctrlKey || event.metaKey; 

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
          // Store a copy of the element's state before resizing starts
          setResizeStartElement({...hitElement}); 
          setSelectedElementIds([hitElement.id]); // Single select for resizing
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
              if (selectedElementIds.includes(hitElement.id)) {
                  currentSelectedIds = selectedElementIds.filter(id => id !== hitElement.id);
              } else {
                  currentSelectedIds = [...selectedElementIds, hitElement.id];
              }
          } else if (!selectedElementIds.includes(hitElement.id)) {
              currentSelectedIds = [hitElement.id];
          }

          setSelectedElementIds(currentSelectedIds);
          
          if (currentSelectedIds.length > 0) {
              setIsMoving(true);
              const elementsToMove = elements.filter(el => currentSelectedIds.includes(el.id));
              setMovingElements(elementsToMove);

              lastPosRef.current = pos; 
        
              const firstSelectedEl = elementsToMove[0]; 
              if (firstSelectedEl) {
                  const startX = firstSelectedEl.type === 'line' ? firstSelectedEl.points[0].x : firstSelectedEl.x;
                  const startY = firstSelectedEl.type === 'line' ? firstSelectedEl.points[0].y : firstSelectedEl.y;
                  setOffset({ x: pos.x - startX, y: pos.y - startY });
              }
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

      if (!lastPosRef.current) {
          lastPosRef.current = pos;
          return;
      }
      
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
          renderElements();
          animationFrameRef.current = null;
      });

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
        
        // Scaling logic based on handle
        switch (resizeHandle) {
            case 'br':
                newWidth = Math.max(10, startEl.width + dx);
                newHeight = isImage ? newWidth / aspectRatio : Math.max(10, resizeStartElement.height + dy);                break;
            case 'bl':
                newX = resizeStartElement.x + dx;
                newWidth = Math.max(10, startEl.width - dx);
                if (isImage) {
                    newHeight = newWidth / aspectRatio;
                    // Move Y to keep the bottom fixed
                    newY = resizeStartElement.y + (resizeStartElement.height - newHeight);
                } else {
                    // Only adjust X and Width for non-image elements on BL
                }
                break;
            case 'tr':
                newY = startEl.y + dy;
                newWidth = Math.max(10, resizeStartElement.width + dx);
                if (isImage) {
                    newHeight = newWidth / aspectRatio;
               
                    newY = resizeStartElement.y + dy; 
                    newWidth = Math.max(10, resizeStartElement.width + dx);
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
        
        // Use rAF for smooth rendering
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
    }, []); 


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