
import { 
    WhiteboardElement, 
    LineElement, 
    TextElement, 
    ResizeHandle, 
    SelectionRect 
} from './WhiteboardTypes';

// --- Canvas Context Helper ---
export const getCanvasContext = (canvas: HTMLCanvasElement | null): CanvasRenderingContext2D | null => {
  return canvas ? canvas.getContext('2d') : null;
};

// --- Geometry Helpers ---
export const getLineBoundingBox = (line: LineElement) => {
      const xs = line.points.map(p => p.x);
      const ys = line.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export const isInsideText = (x: number, y: number, textEl: TextElement): boolean => {
    const padding = 5;
    return (
        x >= textEl.x - padding &&
        x <= textEl.x + textEl.width + padding &&
        y >= textEl.y - textEl.fontSize - padding &&
        y <= textEl.y + padding
    );
};

export const getElementBounds = (element: WhiteboardElement): { x: number, y: number, w: number, h: number } => {
    const padding = 5; 

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
        const imageEl = element as WhiteboardElement;
        return {
            x: imageEl.x - padding,
            y: imageEl.y - padding,
            w: imageEl.width + 2 * padding,
            h: imageEl.height + 2 * padding,
        };
    }
    return { x: 0, y: 0, w: 0, h: 0 };
}

export const getResizeHandleHit = (x: number, y: number, element: WhiteboardElement): ResizeHandle | null => {
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

export const isElementInRect = (el: WhiteboardElement, rect: SelectionRect): boolean => {
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

export const drawResizeHandle = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  const size = 10;
  const halfSize = size / 2;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#007bff';
  ctx.lineWidth = 2;
  ctx.fillRect(x - halfSize, y - halfSize, size, size);
  ctx.strokeRect(x - halfSize, y - halfSize, size, size);
}