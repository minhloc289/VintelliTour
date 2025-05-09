'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Post, ValidationResult } from '../types/post';

// Create the Context
export const BackgroundValidationContext = createContext<any>(null);

// Create a Provider to wrap your components
export const BackgroundValidationProvider = ({ children }: { children: ReactNode }) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to validate posts in background
    const validatePostsInBackground = async () => {
      try {
        const res = await fetch('/api/posts/validate-all', {
          method: 'GET',  // Change to GET to match the API
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        if (data.success && data.invalidPosts) {
          setValidationResults(data.invalidPosts);  // Save invalid posts globally
        }
      } catch (error) {
        setError('Failed to validate posts in background');
      }
    };

    // Run background validation every 40 seconds
    const intervalId = setInterval(validatePostsInBackground, 40000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <BackgroundValidationContext.Provider value={{ validationResults, error }}>
      {children}
    </BackgroundValidationContext.Provider>
  );
};
