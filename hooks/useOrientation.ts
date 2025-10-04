import { useState, useEffect } from 'react';

type Orientation = 'landscape' | 'portrait';

export const useOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>('landscape');

  const getOrientation = (): Orientation => {
    // Check innerWidth vs innerHeight to determine orientation
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  };

  useEffect(() => {
    // Set initial orientation
    setOrientation(getOrientation());

    const handleResize = () => {
      setOrientation(getOrientation());
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return orientation;
};