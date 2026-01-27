import { useState, useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';
import type { Set, ExerciseCategory, GroupSetType, FocusNextSet } from '@/types/workout';

interface UseSetRowLogicProps {
  set: Set;
  category: ExerciseCategory;
  shouldFocus: 'weight' | 'reps' | 'duration' | 'distance' | null;
  onFocusHandled: () => void;
  onCustomKeyboardOpen: ((params: { field: 'weight' | 'reps' | 'duration' | 'distance'; value: string }) => void) | null;
  customKeyboardActive: boolean;
  customKeyboardField: 'weight' | 'reps' | 'duration' | 'distance' | null;
  readOnly: boolean;
}

interface UseSetRowLogicReturn {
  focusedInput: 'first' | 'second' | null;
  firstInputRef: React.RefObject<TextInput>;
  secondInputRef: React.RefObject<TextInput>;
  indexContainerRef: React.RefObject<any>;
  handleFocus: (inputRef: React.RefObject<TextInput>, value: string | null | undefined, inputId: 'first' | 'second') => void;
}

export const useSetRowLogic = ({
  set,
  category,
  shouldFocus,
  onFocusHandled,
  onCustomKeyboardOpen,
  customKeyboardActive,
  customKeyboardField,
  readOnly
}: UseSetRowLogicProps): UseSetRowLogicReturn => {
  const [focusedInput, setFocusedInput] = useState<'first' | 'second' | null>(null);
  const firstInputRef = useRef<TextInput>(null);
  const secondInputRef = useRef<TextInput>(null);
  const indexContainerRef = useRef<any>(null);

  const isLift = category === 'Lifts';

  // Auto-focus effect when shouldFocus is set
  useEffect(() => {
    if (shouldFocus && !readOnly) {
      const focusInput = () => {
        if (shouldFocus.field === 'weight' && firstInputRef.current) {
          firstInputRef.current.focus();
        } else if (shouldFocus.field === 'reps' && secondInputRef.current) {
          secondInputRef.current.focus();
        } else if (shouldFocus.field === 'duration' && firstInputRef.current) {
          firstInputRef.current.focus();
        } else if (shouldFocus.field === 'distance' && secondInputRef.current) {
          secondInputRef.current.focus();
        }
        onFocusHandled();
      };
      // Small delay to ensure the component is fully rendered
      setTimeout(focusInput, 100);
    }
  }, [shouldFocus, readOnly, onFocusHandled]);

  // Focus the correct input when custom keyboard targets this set
  useEffect(() => {
    if (customKeyboardActive && customKeyboardField && !readOnly) {
      const focusInput = () => {
        if ((customKeyboardField === 'weight' || customKeyboardField === 'duration') && firstInputRef.current) {
          firstInputRef.current.focus();
          setFocusedInput('first');
        } else if ((customKeyboardField === 'reps' || customKeyboardField === 'distance') && secondInputRef.current) {
          secondInputRef.current.focus();
          setFocusedInput('second');
        }
      };
      // Small delay to ensure smooth transition
      setTimeout(focusInput, 50);
    } else if (!customKeyboardActive) {
      // Clear focus state when keyboard is not targeting this set
      setFocusedInput(null);
    }
  }, [customKeyboardActive, customKeyboardField, readOnly]);

  const handleFocus = (
    inputRef: React.RefObject<TextInput>,
    value: string | null | undefined,
    inputId: 'first' | 'second'
  ): void => {
    setFocusedInput(inputId);
    const strVal = value === null || value === undefined ? '' : String(value);
    
    if (strVal.length > 0) {
      const selectAll = () => {
        inputRef.current?.setNativeProps({ 
          selection: { start: 0, end: strVal.length } 
        });
      };

      // Multiple attempts to ensure selection happens after focus/keyboard animation
      selectAll();
      requestAnimationFrame(selectAll);
      setTimeout(selectAll, 50);
      setTimeout(selectAll, 200);
    }
  };

  return {
    focusedInput,
    firstInputRef,
    secondInputRef,
    indexContainerRef,
    handleFocus
  };
};
