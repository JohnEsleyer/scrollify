// src/hooks/useDebounce.ts

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to debounce a value.
 * The returned debouncedValue will only update after the value has stabilized 
 * for the specified delay time.
 * @param value The value to debounce.
 * @param delay The delay in milliseconds (e.g., 500ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set up a timer to update debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup: If value changes before the delay, clear the previous timer
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}