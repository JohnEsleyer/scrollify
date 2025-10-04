
import React, { useState, useEffect, useRef } from 'react';
import { TextElement } from './WhiteboardTypes';

interface EditLayerProps {
    element: TextElement;
    canvasRef: React.RefObject<HTMLCanvasElement | null>; 
    updateTextElement: (id: number, newText: string) => void;
    setEditingTextId: (id: number | null) => void;
}

export const EditLayer: React.FC<EditLayerProps> = ({ 
    element, 
    canvasRef, 
    updateTextElement, 
    setEditingTextId 
}) => {
    const [localText, setLocalText] = useState(element.text);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalText(element.text);
    }, [element.text]);

    const canvas = canvasRef.current;
    if (!canvas) return null;

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
        // Only update if the text has changed or if it was the initial creation
        if (localText !== element.text || element.text === '') {
             updateTextElement(element.id, localText);
        }
        setEditingTextId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            updateTextElement(element.id, localText);
            setEditingTextId(null);
        }
    };

    // Auto-focus and select all text on mount/focus
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    return (
        <input
            ref={inputRef}
            type="text"
            style={style}
            value={localText}
            onChange={(e) => {
                setLocalText(e.target.value);
                updateTextElement(element.id, e.target.value); 
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};