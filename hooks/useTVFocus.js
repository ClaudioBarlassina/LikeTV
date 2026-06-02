import { useState, useCallback, useRef, useEffect } from 'react';
import { findNodeHandle, AccessibilityInfo } from 'react-native';

export default function useTVFocus(options = {}) {
  const { onEnterPress, enabled = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const refs = useRef([]);

  const focusRef = useCallback((index) => {
    return (el) => {
      if (el) refs.current[index] = el;
    };
  }, []);

  const focusNext = useCallback(() => {
    setFocusedIndex((prev) => Math.min(prev + 1, refs.current.length - 1));
  }, []);

  const focusPrev = useCallback(() => {
    setFocusedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const handle = findNodeHandle(refs.current[focusedIndex]);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [focusedIndex, enabled]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusRef,
    focusNext,
    focusPrev,
    refs,
  };
}
