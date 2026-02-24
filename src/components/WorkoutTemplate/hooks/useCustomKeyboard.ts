import { useState, useCallback, useRef } from "react";
import type { TextInput } from "react-native";

export interface CustomKeyboardTarget {
  exerciseId: string;
  setIndex: number;
  field: string;
  inputRef: React.RefObject<TextInput | null>;
}

/**
 * Extracted custom keyboard state from indexWorkoutTemplate.tsx.
 * Manages the visibility, target field, and value for the custom
 * numeric keyboard overlay.
 */
export function useCustomKeyboard() {
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<CustomKeyboardTarget | null>(null);
  const [value, setValue] = useState("");
  const [shouldSelectAll, setShouldSelectAll] = useState(false);

  const previousTargetRef = useRef<CustomKeyboardTarget | null>(null);

  const open = useCallback(
    (
      newTarget: CustomKeyboardTarget,
      initialValue: string,
      selectAll = false
    ) => {
      previousTargetRef.current = target;
      setTarget(newTarget);
      setValue(initialValue);
      setShouldSelectAll(selectAll);
      setVisible(true);
    },
    [target]
  );

  const close = useCallback(() => {
    setVisible(false);
    setTarget(null);
    setValue("");
    setShouldSelectAll(false);
  }, []);

  const updateValue = useCallback((newValue: string) => {
    setValue(newValue);
  }, []);

  const clearSelectAll = useCallback(() => {
    setShouldSelectAll(false);
  }, []);

  return {
    visible,
    target,
    value,
    shouldSelectAll,
    previousTarget: previousTargetRef.current,
    open,
    close,
    updateValue,
    clearSelectAll,
  };
}
