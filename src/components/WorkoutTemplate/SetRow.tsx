import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useSetRowLogic } from './hooks/useSetRowLogic';
import { getGroupColorScheme, parseRestTimeInput, formatRestTime, parseDurationInput, formatDurationTime } from '@/utils/workoutHelpers';
import SwipeToDelete from '@/components/common/SwipeToDelete';
import type { Set, ExerciseCategory, WeightUnit } from '@/types/workout';

interface SetIndex {
  group: number;
  subIndex: number | null;
}

interface SetRowProps {
  set: Set;
  index: number;
  category: ExerciseCategory;
  onUpdate: (set: Set) => void;
  onToggle: () => void;
  onDelete: () => void;
  weightUnit?: WeightUnit;
  previousSet: Set | null;
  previousSetIsFromOlderHistory?: boolean;
  isLast: boolean;
  onPressSetNumber: (pageX: number, pageY: number, width: number, height: number) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (isAddToGroupAction?: boolean) => void;
  isRestTimerSelectionMode?: boolean;
  isRestTimerSelected?: boolean;
  onToggleRestTimerSelection?: () => void;
  dropSetId?: string;
  isDropSetStart: boolean;
  isDropSetEnd: boolean;
  groupSetNumber: number;
  indexInGroup: number;
  overallSetNumber: number;
  warmupIndex: SetIndex | null;
  workingIndex: SetIndex | null;
  editingGroupId?: string;
  isGroupChild?: boolean;
  parentGroupType?: 'HIIT' | 'Superset' | null;
  readOnly?: boolean;
  shouldFocus?: 'weight' | 'weight2' | 'reps' | 'reps2' | 'duration' | 'distance' | null;
  onFocusHandled?: () => void;
  onCustomKeyboardOpen?: ((params: { field: 'weight' | 'weight2' | 'reps' | 'reps2' | 'duration' | 'distance'; value: string }) => void) | null;
  customKeyboardActive?: boolean;
  customKeyboardField?: 'weight' | 'weight2' | 'reps' | 'reps2' | 'duration' | 'distance' | null;
  hasSecondWeight?: boolean;
  hasLRSplitReps?: boolean;
  customKeyboardShouldSelectAll?: boolean;
  onLongPressRow?: () => void;
  showDuration?: boolean;
  showDistance?: boolean;
  showWeight?: boolean;
  showReps?: boolean;
}

const SetRow: React.FC<SetRowProps> = ({
  set,
  index,
  category,
  onUpdate,
  onToggle,
  onDelete,
  weightUnit,
  previousSet,
  previousSetIsFromOlderHistory = false,
  isLast,
  onPressSetNumber,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  isRestTimerSelectionMode = false,
  isRestTimerSelected = false,
  onToggleRestTimerSelection,
  dropSetId,
  isDropSetStart,
  isDropSetEnd,
  groupSetNumber,
  indexInGroup,
  overallSetNumber,
  warmupIndex,
  workingIndex,
  editingGroupId,
  isGroupChild = false,
  parentGroupType = null,
  readOnly = false,
  shouldFocus = null,
  onFocusHandled = () => { },
  onCustomKeyboardOpen = null,
  customKeyboardActive = false,
  customKeyboardField = null,
  customKeyboardShouldSelectAll = false,
  onLongPressRow,
  showDuration = false,
  showDistance = false,
  showWeight = false,
  showReps = false,
  hasSecondWeight = false,
  hasLRSplitReps = false
}) => {
  const isLift = category === 'Lifts';
  const isCardio = category === 'Cardio';

  // Use visibility props if provided, otherwise fallback to category-based logic for backward compatibility
  const shouldShowDuration = showDuration !== undefined ? showDuration : isCardio;
  const shouldShowDistance = showDistance !== undefined ? showDistance : isCardio;
  const shouldShowWeight = showWeight !== undefined ? showWeight : isLift;
  const shouldShowReps = showReps !== undefined ? showReps : (isLift || category === 'Training');

  // Determine group color scheme
  const groupColorScheme = isGroupChild && parentGroupType
    ? getGroupColorScheme(parentGroupType)
    : null;

  // Check if required values are missing (individually)
  const isMissingWeight = shouldShowWeight && (!set.weight || set.weight.trim() === '');
  const isMissingWeight2 = hasSecondWeight && shouldShowWeight && (!set.weight2 || set.weight2.trim() === '');
  const isMissingReps = shouldShowReps && (!set.reps || set.reps.trim() === '');
  const isMissingReps2 = hasLRSplitReps && shouldShowReps && (!set.reps2 || set.reps2.trim() === '');
  const isMissingDuration = shouldShowDuration && (!set.duration || set.duration.trim() === '');
  const isMissingDistance = shouldShowDistance && (!set.distance || set.distance.trim() === '');

  const isMissingValue = isMissingWeight || isMissingWeight2 || isMissingReps || isMissingReps2 || isMissingDuration || isMissingDistance;

  // Track selection for cursor positioning after custom keyboard updates
  const [durationInputSelection, setDurationInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [distanceInputSelection, setDistanceInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [weightInputSelection, setWeightInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [weight2InputSelection, setWeight2InputSelection] = useState<{ start: number; end: number } | null>(null);
  const [repsInputSelection, setRepsInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [reps2InputSelection, setReps2InputSelection] = useState<{ start: number; end: number } | null>(null);

  // Duration: while focused show raw number, when blurred show formatted time
  const [durationIsFocused, setDurationIsFocused] = useState<boolean>(false);

  const durationInputInitialFocusRef = useRef<boolean>(false);
  const distanceInputInitialFocusRef = useRef<boolean>(false);
  const weightInputInitialFocusRef = useRef<boolean>(false);
  const weight2InputInitialFocusRef = useRef<boolean>(false);
  const repsInputInitialFocusRef = useRef<boolean>(false);
  const reps2InputInitialFocusRef = useRef<boolean>(false);

  const durationInputInitialValueRef = useRef<string | null>(null);
  const distanceInputInitialValueRef = useRef<string | null>(null);
  const weightInputInitialValueRef = useRef<string | null>(null);
  const weight2InputInitialValueRef = useRef<string | null>(null);
  const repsInputInitialValueRef = useRef<string | null>(null);
  const reps2InputInitialValueRef = useRef<string | null>(null);

  // Legacy refs for backward compatibility - keep for useSetRowLogic hook
  const [firstInputSelection, setFirstInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [secondInputSelection, setSecondInputSelection] = useState<{ start: number; end: number } | null>(null);
  const firstInputInitialFocusRef = useRef<boolean>(false);
  const secondInputInitialFocusRef = useRef<boolean>(false);
  const firstInputInitialValueRef = useRef<string | null>(null);
  const secondInputInitialValueRef = useRef<string | null>(null);

  // When focused, show raw number directly (like weight/reps). When blurred, show formatted time.
  const getDurationDisplayValue = (): string => {
    if (durationIsFocused) {
      // While editing, show the raw value directly — just like weight/reps
      return set.duration || '';
    }
    // When not editing, format stored seconds as time
    if (!set.duration || set.duration === '') return '';
    if (set.duration.includes(':')) return set.duration; // legacy
    const seconds = parseInt(set.duration, 10);
    if (isNaN(seconds) || seconds <= 0) return '';
    return formatDurationTime(seconds);
  };

  // Create refs for each input type
  const durationInputRef = useRef<TextInput>(null);
  const distanceInputRef = useRef<TextInput>(null);
  const weightInputRef = useRef<TextInput>(null);
  const weight2InputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);
  const reps2InputRef = useRef<TextInput>(null);

  const {
    focusedInput,
    firstInputRef,
    secondInputRef,
    indexContainerRef,
    handleFocus
  } = useSetRowLogic({
    set,
    category,
    shouldFocus: shouldFocus || null,
    onFocusHandled,
    onCustomKeyboardOpen,
    customKeyboardActive,
    customKeyboardField: customKeyboardField || null,
    readOnly
  });

  // Set cursor position or selection when value changes from custom keyboard for each input type
  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'duration' && shouldShowDuration) {
      const value = set.duration || "";
      const length = value.length;
      const initialValue = durationInputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setDurationInputSelection({ start: 0, end: length });
        durationInputInitialFocusRef.current = false;
        durationInputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setDurationInputSelection({ start: length, end: length });
        durationInputInitialFocusRef.current = true;
        durationInputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'duration') {
      durationInputInitialFocusRef.current = false;
      durationInputInitialValueRef.current = null;
    }
  }, [set.duration, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowDuration]);

  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'distance' && shouldShowDistance) {
      const value = set.distance || "";
      const length = value.length;
      const initialValue = distanceInputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setDistanceInputSelection({ start: 0, end: length });
        distanceInputInitialFocusRef.current = false;
        distanceInputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setDistanceInputSelection({ start: length, end: length });
        distanceInputInitialFocusRef.current = true;
        distanceInputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'distance') {
      distanceInputInitialFocusRef.current = false;
      distanceInputInitialValueRef.current = null;
    }
  }, [set.distance, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowDistance]);

  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'weight' && shouldShowWeight) {
      const value = set.weight || "";
      const length = value.length;
      const initialValue = weightInputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setWeightInputSelection({ start: 0, end: length });
        weightInputInitialFocusRef.current = false;
        weightInputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setWeightInputSelection({ start: length, end: length });
        weightInputInitialFocusRef.current = true;
        weightInputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'weight') {
      weightInputInitialFocusRef.current = false;
      weightInputInitialValueRef.current = null;
    }
  }, [set.weight, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowWeight]);

  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'weight2' && shouldShowWeight && hasSecondWeight) {
      const value = set.weight2 || "";
      const length = value.length;
      const initialValue = weight2InputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setWeight2InputSelection({ start: 0, end: length });
        weight2InputInitialFocusRef.current = false;
        weight2InputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setWeight2InputSelection({ start: length, end: length });
        weight2InputInitialFocusRef.current = true;
        weight2InputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'weight2') {
      weight2InputInitialFocusRef.current = false;
      weight2InputInitialValueRef.current = null;
    }
  }, [set.weight2, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowWeight, hasSecondWeight]);

  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'reps2' && shouldShowReps && hasLRSplitReps) {
      const value = set.reps2 || "";
      const length = value.length;
      const initialValue = reps2InputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setReps2InputSelection({ start: 0, end: length });
        reps2InputInitialFocusRef.current = false;
        reps2InputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setReps2InputSelection({ start: length, end: length });
        reps2InputInitialFocusRef.current = true;
        reps2InputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'reps2') {
      reps2InputInitialFocusRef.current = false;
      reps2InputInitialValueRef.current = null;
    }
  }, [set.reps2, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowReps, hasLRSplitReps]);

  useEffect(() => {
    if (customKeyboardActive && customKeyboardField === 'reps' && shouldShowReps) {
      const value = set.reps || "";
      const length = value.length;
      const initialValue = repsInputInitialValueRef.current;

      if (customKeyboardShouldSelectAll && length > 0) {
        setRepsInputSelection({ start: 0, end: length });
        repsInputInitialFocusRef.current = false;
        repsInputInitialValueRef.current = value;
      } else if (value !== initialValue) {
        setRepsInputSelection({ start: length, end: length });
        repsInputInitialFocusRef.current = true;
        repsInputInitialValueRef.current = value;
      }
    } else if (!customKeyboardActive || customKeyboardField !== 'reps') {
      repsInputInitialFocusRef.current = false;
      repsInputInitialValueRef.current = null;
    }
  }, [set.reps, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, shouldShowReps]);

  const getInputStyle = (value: string | null | undefined) => {
    if (!set.completed) return null;
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    return isEmpty ? styles.inputCompletedEmpty : styles.inputCompletedFilled;
  };

  // Calculate total weight for display
  const getTotalWeight = (): number => {
    const weight1 = parseFloat(set.weight || '0') || 0;
    const weight2 = parseFloat(set.weight2 || '0') || 0;
    return weight1 + weight2;
  };

  const renderPrevious = () => {
    if (!previousSet) return <Text style={styles.previousText}>-</Text>;

    const textStyle = [
      styles.previousText,
      previousSetIsFromOlderHistory && styles.previousText__italic
    ];

    const parts: string[] = [];

    // Build previous display based on visible columns
    if (shouldShowDuration && previousSet.duration) {
      parts.push(previousSet.duration);
    }
    if (shouldShowDistance && previousSet.distance) {
      parts.push(previousSet.distance);
    }
    if (shouldShowWeight && previousSet.weight) {
      if (hasSecondWeight && previousSet.weight2) {
        // Show both weights and total: "45lb + 25lb = 70lb"
        const weight1 = parseFloat(previousSet.weight) || 0;
        const weight2 = parseFloat(previousSet.weight2) || 0;
        const total = weight1 + weight2;
        const unit = weightUnit === 'lbs' ? 'lb' : (weightUnit || 'lb');
        const weightText = `${weight1}${unit} + ${weight2}${unit} = ${total}${unit}`;
        parts.push(weightText);
      } else {
        const weightText = previousSet.weight + (weightUnit === 'lbs' ? 'lb' : (weightUnit || 'lb'));
        parts.push(weightText);
      }
    }
    if (shouldShowReps && previousSet.reps) {
      parts.push(previousSet.reps);
    }

    if (parts.length === 0) {
      return <Text style={textStyle}>-</Text>;
    }

    // Format based on what's shown
    if (shouldShowWeight && shouldShowReps && parts.length >= 2) {
      // Weight x Reps format
      return (
        <Text style={textStyle}>
          {previousSet.weight || '-'}
          <Text style={[styles.previousUnitText, previousSetIsFromOlderHistory && styles.previousText__italic]}>
            {weightUnit === 'lbs' ? 'lb' : (weightUnit || 'lb')}{' '}
          </Text>
          x {previousSet.reps || '-'}
        </Text>
      );
    } else if (shouldShowDuration && shouldShowDistance && parts.length >= 2) {
      // Duration / Distance format
      return <Text style={textStyle}>{`${previousSet.duration || '-'} / ${previousSet.distance || '-'}`}</Text>;
    } else {
      // Single value or custom combination
      return <Text style={textStyle}>{parts.join(' / ')}</Text>;
    }
  };

  return (
    <Pressable
      style={styles.rowWrapper}
      onLongPress={!readOnly && !isSelectionMode && onLongPressRow ? onLongPressRow : undefined}
      delayLongPress={150}
    >
      <SwipeToDelete
        onDelete={onDelete}
        disabled={isSelectionMode}
        trashBackgroundColor={groupColorScheme ? groupColorScheme[100] : undefined}
        trashIconColor={groupColorScheme ? groupColorScheme[700] : undefined}
      >
        <View style={styles.swipeableRow}>
          {dropSetId && (
            <View style={[
              styles.dropSetIndicator,
              isDropSetStart && styles.dropSetIndicator__start,
              isDropSetEnd && styles.dropSetIndicator__end,
              groupColorScheme ? { backgroundColor: groupColorScheme[400] } : { backgroundColor: COLORS.slate[400] }
            ]} />
          )}
          <Pressable
            style={[
              styles.container,
              set.completed && styles.completedContainer,
              dropSetId && isDropSetStart && styles.container__dropSetStart,
              dropSetId && isDropSetEnd && styles.container__dropSetEnd,
              dropSetId ? styles.container__dropSet__flex : styles.container__nonDropSet__flex,
              isRestTimerSelectionMode && isRestTimerSelected && styles.container__restTimerSelected
            ]}
            onPress={isRestTimerSelectionMode && onToggleRestTimerSelection ? onToggleRestTimerSelection : undefined}
            disabled={!isRestTimerSelectionMode || !onToggleRestTimerSelection}
          >
            <View style={[
              styles.contentRow,
              dropSetId && styles.contentRow__dropSet,
              dropSetId && isDropSetStart && styles.contentRow__dropSet__start,
              dropSetId && isDropSetEnd && styles.contentRow__dropSet__end
            ]}>
              {isSelectionMode ? (
                (() => {
                  if (dropSetId) {
                    if (indexInGroup === 1) {
                      const isDifferentGroup = !editingGroupId || dropSetId !== editingGroupId;

                      if (isDifferentGroup) {
                        return (
                          <TouchableOpacity
                            onPress={() => onToggleSelection(true)}
                            style={styles.selectionPlusButton}
                          >
                            <Plus size={20} color={COLORS.indigo[600]} strokeWidth={3} />
                          </TouchableOpacity>
                        );
                      } else {
                        return (
                          <TouchableOpacity
                            onPress={() => onToggleSelection(false)}
                            style={[
                              styles.selectionCheckbox,
                              isSelected && (
                                groupColorScheme
                                  ? { backgroundColor: groupColorScheme[500] }
                                  : styles.selectionCheckboxSelected__default
                              )
                            ]}
                          >
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      }
                    } else {
                      if (editingGroupId && dropSetId === editingGroupId) {
                        return (
                          <TouchableOpacity
                            onPress={() => onToggleSelection(false)}
                            style={[
                              styles.selectionCheckbox,
                              isSelected && (
                                groupColorScheme
                                  ? { backgroundColor: groupColorScheme[500] }
                                  : styles.selectionCheckboxSelected__default
                              )
                            ]}
                          >
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      } else {
                        return <View style={styles.selectionMode__emptySpace} />;
                      }
                    }
                  } else {
                    return (
                      <TouchableOpacity
                        onPress={() => onToggleSelection(false)}
                        style={[
                          styles.selectionCheckbox,
                          isSelected && (
                            groupColorScheme
                              ? { backgroundColor: groupColorScheme[500] }
                              : styles.selectionCheckboxSelected__default
                          )
                        ]}
                      >
                        {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  }
                })()
              ) : (
                <View pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                  <TouchableOpacity
                    ref={indexContainerRef}
                    onPress={() => {
                      if (!readOnly && !isRestTimerSelectionMode && onPressSetNumber && indexContainerRef.current) {
                        indexContainerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                          onPressSetNumber(pageX, pageY, width, height);
                        });
                      }
                    }}
                    disabled={readOnly || isRestTimerSelectionMode}
                    style={[
                      styles.indexBadge,
                      set.completed && styles.indexBadge__completed
                    ]}
                  >
                    {(set.isWarmup || set.isFailure) && (
                      <View style={[
                        styles.indexBadge__border,
                        set.isWarmup && styles.indexBadge__border__warmup,
                        set.isFailure && styles.indexBadge__border__failure
                      ]} />
                    )}
                    {warmupIndex ? (
                      warmupIndex.subIndex !== null ? (
                        warmupIndex.subIndex === 1 ? (
                          // First set in dropset: show only primary index
                          <Text style={[
                            styles.indexText,
                            set.isWarmup && { color: COLORS.orange[500] },
                            set.isFailure && { color: COLORS.red[500] }
                          ]}>{warmupIndex.group}</Text>
                        ) : (
                          // Subsequent sets: show only subIndex with "."
                          <Text style={[
                            styles.indexText__groupSub,
                            set.isWarmup && { color: COLORS.orange[350] },
                            set.isFailure && { color: COLORS.red[350] },
                            !set.isWarmup && !set.isFailure && (
                              groupColorScheme ? { color: groupColorScheme[350] } : { color: COLORS.slate[350] }
                            )
                          ]}>.{warmupIndex.subIndex}</Text>
                        )
                      ) : (
                        <Text style={[
                          styles.indexText,
                          ...(set.isWarmup ? [{ color: COLORS.orange[550] }] : []),
                          ...(set.isFailure ? [{ color: COLORS.red[550] }] : [])
                        ]}>{warmupIndex.group}</Text>
                      )
                    ) : workingIndex ? (
                      workingIndex.subIndex !== null ? (
                        workingIndex.subIndex === 1 ? (
                          // First set in dropset: show only primary index
                          <Text style={[
                            styles.indexText,
                            set.isWarmup && { color: COLORS.orange[550] },
                            set.isFailure && { color: COLORS.red[550] }
                          ]}>{workingIndex.group}</Text>
                        ) : (
                          // Subsequent sets: show only subIndex with "."
                          <Text style={[
                            styles.indexText__groupSub,
                            set.isWarmup && { color: COLORS.orange[350] },
                            set.isFailure && { color: COLORS.red[350] },
                            !set.isWarmup && !set.isFailure && (
                              { color: COLORS.slate[350] }
                            )
                          ]}>.{workingIndex.subIndex}</Text>
                        )
                      ) : (
                        <Text style={[
                          styles.indexText,
                          ...(set.isWarmup ? [{ color: COLORS.orange[550] }] : []),
                          ...(set.isFailure ? [{ color: COLORS.red[550] }] : [])
                        ]}>{workingIndex.group}</Text>
                      )
                    ) : (
                      dropSetId ? (
                        indexInGroup === 1 ? (
                          // First set in dropset: show only primary index
                          <Text style={[
                            styles.indexText,
                            set.isWarmup && { color: COLORS.orange[550] },
                            set.isFailure && { color: COLORS.red[550] }
                          ]}>{groupSetNumber}</Text>
                        ) : (
                          // Subsequent sets: show only subIndex with "."
                          <Text style={[
                            styles.indexText__groupSub,
                            set.isWarmup && { color: COLORS.orange[350] },
                            set.isFailure && { color: COLORS.red[350] },
                            !set.isWarmup && !set.isFailure && (
                              { color: COLORS.slate[350] }
                            )
                          ]}>.{indexInGroup}</Text>
                        )
                      ) : (
                        <Text style={[
                          styles.indexText,
                          ...(set.isWarmup ? [{ color: COLORS.orange[550] }] : []),
                          ...(set.isFailure ? [{ color: COLORS.red[550] }] : [])
                        ]}>{overallSetNumber}</Text>
                      )
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.previousContainer}>
                {renderPrevious()}
              </View>

              {shouldShowDuration && (
                <View style={styles.durationContainer} pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                  <View style={styles.durationInputWrapper}>
                    <TextInput
                      numberOfLines={1}
                      ref={durationInputRef}
                      style={[
                        styles.durationInput,
                        getInputStyle(set.duration),
                        (customKeyboardActive && customKeyboardField === 'duration') && styles.inputFocused,
                        isMissingDuration && styles.inputCompletedEmpty
                      ]}
                      selectTextOnFocus={true}
                      showSoftInputOnFocus={!onCustomKeyboardOpen}
                      editable={!readOnly && !isRestTimerSelectionMode}
                      pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                      onFocus={() => {
                        if (!readOnly && !isRestTimerSelectionMode) {
                          setDurationIsFocused(true);
                          const storedValue = set.duration || "";
                          // If stored value is seconds (number), convert to raw format for editing
                          // Otherwise, use as-is (already raw or legacy format)
                          let rawValue = storedValue;
                          if (storedValue && !storedValue.includes(':')) {
                            const seconds = parseInt(storedValue, 10);
                            if (!isNaN(seconds) && seconds > 0) {
                              // Convert seconds to raw input format
                              const hrs = Math.floor(seconds / 3600);
                              const mins = Math.floor((seconds % 3600) / 60);
                              const secs = seconds % 60;
                              if (hrs > 0) {
                                rawValue = String(hrs * 10000 + mins * 100 + secs);
                              } else {
                                rawValue = String(mins * 100 + secs);
                              }
                              // Update to raw format only if different
                              if (rawValue !== storedValue) {
                                onUpdate({ ...set, duration: rawValue });
                              }
                            }
                          }
                          const val = rawValue || "";
                          if (onCustomKeyboardOpen) {
                            onCustomKeyboardOpen({ field: 'duration', value: val });
                            durationInputInitialFocusRef.current = false;
                            durationInputInitialValueRef.current = val;
                            setDurationInputSelection(null);
                          } else {
                            handleFocus(durationInputRef as React.RefObject<TextInput>, val, 'first');
                          }
                        }
                      }}
                      onBlur={() => {
                        setDurationIsFocused(false);
                        // On blur, parse the raw value and save as seconds
                        const raw = set.duration || '';
                        if (raw && !raw.includes(':')) {
                          const seconds = parseDurationInput(raw);
                          if (seconds > 0) {
                            onUpdate({ ...set, duration: String(seconds) });
                          } else {
                            onUpdate({ ...set, duration: '' });
                          }
                        }
                        if (!customKeyboardActive || customKeyboardField !== 'duration') {
                          if (!onCustomKeyboardOpen) {
                            // Focus cleared by hook
                          }
                        }
                      }}
                      placeholder=""
                      placeholderTextColor={COLORS.slate[400]}
                      keyboardType="numeric"
                      value={getDurationDisplayValue()}
                      selection={durationInputSelection || undefined}
                      onSelectionChange={(e) => {
                        if (!customKeyboardActive || customKeyboardField !== 'duration') {
                          setDurationInputSelection(e.nativeEvent.selection);
                        }
                      }}
                      onChangeText={(text) => {
                        if (!readOnly) {
                          // Extract only numeric characters
                          const numericOnly = text.replace(/[^0-9]/g, '');

                          // Update cursor position
                          if (!customKeyboardActive || customKeyboardField !== 'duration') {
                            setDurationInputSelection(null);
                          } else {
                            durationInputInitialFocusRef.current = true;
                            const length = numericOnly.length;
                            setDurationInputSelection({ start: length, end: length });
                          }

                          // Save raw numbers directly - NO parsing until blur
                          onUpdate({ ...set, duration: numericOnly });
                        }
                      }}
                    />
                  </View>
                </View>
              )}

              {shouldShowDistance && (
                <View style={styles.distanceContainer} pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                  <View style={styles.distanceInputWrapper}>
                    <TextInput
                      numberOfLines={1}
                      ref={distanceInputRef}
                      style={[
                        styles.distanceInput,
                        getInputStyle(set.distance),
                        (customKeyboardActive && customKeyboardField === 'distance') && styles.inputFocused,
                        isMissingDistance && styles.inputCompletedEmpty
                      ]}
                      selectTextOnFocus={true}
                      showSoftInputOnFocus={!onCustomKeyboardOpen}
                      editable={!readOnly && !isRestTimerSelectionMode}
                      pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                      onFocus={() => {
                        if (!readOnly && !isRestTimerSelectionMode) {
                          const val = set.distance || "";
                          if (onCustomKeyboardOpen) {
                            onCustomKeyboardOpen({ field: 'distance', value: val });
                            distanceInputInitialFocusRef.current = false;
                            distanceInputInitialValueRef.current = val;
                            setDistanceInputSelection(null);
                          } else {
                            handleFocus(distanceInputRef as React.RefObject<TextInput>, val, 'second');
                          }
                        }
                      }}
                      onBlur={() => {
                        if (!customKeyboardActive || customKeyboardField !== 'distance') {
                          if (!onCustomKeyboardOpen) {
                            // Focus cleared by hook
                          }
                        }
                      }}
                      placeholder=""
                      placeholderTextColor={COLORS.slate[400]}
                      keyboardType="decimal-pad"
                      value={set.distance || ""}
                      selection={distanceInputSelection || undefined}
                      onSelectionChange={(e) => {
                        if (!customKeyboardActive || customKeyboardField !== 'distance') {
                          setDistanceInputSelection(e.nativeEvent.selection);
                        }
                      }}
                      onChangeText={(text) => {
                        if (!readOnly) {
                          if (!customKeyboardActive || customKeyboardField !== 'distance') {
                            setDistanceInputSelection(null);
                          } else {
                            distanceInputInitialFocusRef.current = true;
                            const length = text.length;
                            setDistanceInputSelection({ start: length, end: length });
                          }
                          onUpdate({ ...set, distance: text });
                        }
                      }}
                    />
                  </View>
                </View>
              )}

              {shouldShowWeight && (
                <View style={[
                  styles.weightContainer,
                  hasSecondWeight && hasLRSplitReps && styles.weightContainer__bothSplit,
                  hasSecondWeight && !hasLRSplitReps && styles.weightContainer__twoInputs,
                  !hasSecondWeight && hasLRSplitReps && styles.weightContainer__twoRepsInputs
                ]} pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                  <View style={[styles.weightInputWrapper, hasSecondWeight && styles.weightInputWrapper__row]}>
                    <View style={[styles.weightInputSingleWrapper, hasSecondWeight && styles.weightInputSingleWrapper__half]}>
                      <TextInput
                        numberOfLines={1}
                        ref={weightInputRef}
                        style={[
                          styles.weightInput,
                          getInputStyle(set.weight),
                          (customKeyboardActive && customKeyboardField === 'weight') && styles.inputFocused,
                          isMissingWeight && styles.inputCompletedEmpty
                        ]}
                        selectTextOnFocus={true}
                        showSoftInputOnFocus={!onCustomKeyboardOpen}
                        editable={!readOnly && !isRestTimerSelectionMode}
                        pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                        onFocus={() => {
                          if (!readOnly && !isRestTimerSelectionMode) {
                            const val = set.weight || "";
                            if (onCustomKeyboardOpen) {
                              onCustomKeyboardOpen({ field: 'weight', value: val });
                              weightInputInitialFocusRef.current = false;
                              weightInputInitialValueRef.current = val;
                              setWeightInputSelection(null);
                            } else {
                              handleFocus(weightInputRef as React.RefObject<TextInput>, val, 'first');
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!customKeyboardActive || customKeyboardField !== 'weight') {
                            if (!onCustomKeyboardOpen) {
                              // Focus cleared by hook
                            }
                          }
                        }}
                        placeholder=""
                        placeholderTextColor={COLORS.slate[400]}
                        keyboardType="decimal-pad"
                        value={set.weight || ""}
                        selection={weightInputSelection || undefined}
                        onSelectionChange={(e) => {
                          if (!customKeyboardActive || customKeyboardField !== 'weight') {
                            setWeightInputSelection(e.nativeEvent.selection);
                          }
                        }}
                        onChangeText={(text) => {
                          if (!readOnly) {
                            if (!customKeyboardActive || customKeyboardField !== 'weight') {
                              setWeightInputSelection(null);
                            } else {
                              weightInputInitialFocusRef.current = true;
                              const length = text.length;
                              setWeightInputSelection({ start: length, end: length });
                            }
                            onUpdate({ ...set, weight: text });
                          }
                        }}
                      />
                    </View>
                    {hasSecondWeight && (
                      <View style={[styles.weight2InputWrapper, styles.weightInputSingleWrapper__half]}>
                        <TextInput
                          numberOfLines={1}
                          ref={weight2InputRef}
                          style={[
                            styles.weightInput,
                            getInputStyle(set.weight2),
                            (customKeyboardActive && customKeyboardField === 'weight2') && styles.inputFocused,
                            isMissingWeight2 && styles.inputCompletedEmpty
                          ]}
                          selectTextOnFocus={true}
                          showSoftInputOnFocus={!onCustomKeyboardOpen}
                          editable={!readOnly && !isRestTimerSelectionMode}
                          pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                          onFocus={() => {
                            if (!readOnly && !isRestTimerSelectionMode) {
                              const val = set.weight2 || "";
                              if (onCustomKeyboardOpen) {
                                onCustomKeyboardOpen({ field: 'weight2', value: val });
                                weight2InputInitialFocusRef.current = false;
                                weight2InputInitialValueRef.current = val;
                                setWeight2InputSelection(null);
                              } else {
                                handleFocus(weight2InputRef as React.RefObject<TextInput>, val, 'first');
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!customKeyboardActive || customKeyboardField !== 'weight2') {
                              if (!onCustomKeyboardOpen) {
                                // Focus cleared by hook
                              }
                            }
                          }}
                          placeholder=""
                          placeholderTextColor={COLORS.slate[400]}
                          keyboardType="decimal-pad"
                          value={set.weight2 || ""}
                          selection={weight2InputSelection || undefined}
                          onSelectionChange={(e) => {
                            if (!customKeyboardActive || customKeyboardField !== 'weight2') {
                              setWeight2InputSelection(e.nativeEvent.selection);
                            }
                          }}
                          onChangeText={(text) => {
                            if (!readOnly) {
                              if (!customKeyboardActive || customKeyboardField !== 'weight2') {
                                setWeight2InputSelection(null);
                              } else {
                                weight2InputInitialFocusRef.current = true;
                                const length = text.length;
                                setWeight2InputSelection({ start: length, end: length });
                              }
                              onUpdate({ ...set, weight2: text });
                            }
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {shouldShowReps && (
                <View style={[
                  styles.repsContainer,
                  hasSecondWeight && hasLRSplitReps && styles.repsContainer__bothSplit,
                  hasSecondWeight && !hasLRSplitReps && styles.repsContainer__twoWeightInputs,
                  !hasSecondWeight && hasLRSplitReps && styles.repsContainer__twoRepsInputs
                ]} pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                  <View key={hasLRSplitReps ? 'reps-split' : 'reps-single'} style={[styles.repsInputWrapper, hasLRSplitReps && styles.repsInputWrapper__row]}>
                    <View style={[styles.repsInputSingleWrapper, hasLRSplitReps && styles.repsInputSingleWrapper__half]}>
                      <TextInput
                        numberOfLines={1}
                        ref={repsInputRef}
                        style={[
                          styles.repsInput,
                          getInputStyle(set.reps),
                          (customKeyboardActive && customKeyboardField === 'reps') && styles.inputFocused,
                          isMissingReps && styles.inputCompletedEmpty
                        ]}
                        selectTextOnFocus={true}
                        showSoftInputOnFocus={!onCustomKeyboardOpen}
                        editable={!readOnly && !isRestTimerSelectionMode}
                        pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                        onFocus={() => {
                          if (!readOnly && !isRestTimerSelectionMode) {
                            const val = set.reps || "";
                            if (onCustomKeyboardOpen) {
                              onCustomKeyboardOpen({ field: 'reps', value: val });
                              repsInputInitialFocusRef.current = false;
                              repsInputInitialValueRef.current = val;
                              setRepsInputSelection(null);
                            } else {
                              handleFocus(repsInputRef as React.RefObject<TextInput>, val, hasLRSplitReps ? 'first' : 'second');
                            }
                          }
                        }}
                        onBlur={() => {
                          if (!customKeyboardActive || customKeyboardField !== 'reps') {
                            if (!onCustomKeyboardOpen) {
                              // Focus cleared by hook
                            }
                          }
                        }}
                        placeholder=""
                        placeholderTextColor={COLORS.slate[400]}
                        keyboardType="decimal-pad"
                        value={set.reps || ""}
                        selection={repsInputSelection || undefined}
                        onSelectionChange={(e) => {
                          if (!customKeyboardActive || customKeyboardField !== 'reps') {
                            setRepsInputSelection(e.nativeEvent.selection);
                          }
                        }}
                        onChangeText={(text) => {
                          if (!readOnly) {
                            if (!customKeyboardActive || customKeyboardField !== 'reps') {
                              setRepsInputSelection(null);
                            } else {
                              repsInputInitialFocusRef.current = true;
                              const length = text.length;
                              setRepsInputSelection({ start: length, end: length });
                            }
                            onUpdate({ ...set, reps: text });
                          }
                        }}
                      />
                    </View>
                    {hasLRSplitReps && (
                      <View style={[styles.reps2InputWrapper, styles.repsInputSingleWrapper__half]}>
                        <TextInput
                          numberOfLines={1}
                          ref={reps2InputRef}
                          style={[
                            styles.repsInput,
                            getInputStyle(set.reps2),
                            (customKeyboardActive && customKeyboardField === 'reps2') && styles.inputFocused,
                            isMissingReps2 && styles.inputCompletedEmpty
                          ]}
                          selectTextOnFocus={true}
                          showSoftInputOnFocus={!onCustomKeyboardOpen}
                          editable={!readOnly && !isRestTimerSelectionMode}
                          pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}
                          onFocus={() => {
                            if (!readOnly && !isRestTimerSelectionMode) {
                              const val = set.reps2 || "";
                              if (onCustomKeyboardOpen) {
                                onCustomKeyboardOpen({ field: 'reps2', value: val });
                                reps2InputInitialFocusRef.current = false;
                                reps2InputInitialValueRef.current = val;
                                setReps2InputSelection(null);
                              } else {
                                handleFocus(reps2InputRef as React.RefObject<TextInput>, val, 'second');
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!customKeyboardActive || customKeyboardField !== 'reps2') {
                              if (!onCustomKeyboardOpen) {
                                // Focus cleared by hook
                              }
                            }
                          }}
                          placeholder=""
                          placeholderTextColor={COLORS.slate[400]}
                          keyboardType="decimal-pad"
                          value={set.reps2 || ""}
                          selection={reps2InputSelection || undefined}
                          onSelectionChange={(e) => {
                            if (!customKeyboardActive || customKeyboardField !== 'reps2') {
                              setReps2InputSelection(e.nativeEvent.selection);
                            }
                          }}
                          onChangeText={(text) => {
                            if (!readOnly) {
                              if (!customKeyboardActive || customKeyboardField !== 'reps2') {
                                setReps2InputSelection(null);
                              } else {
                                reps2InputInitialFocusRef.current = true;
                                const length = text.length;
                                setReps2InputSelection({ start: length, end: length });
                              }
                              onUpdate({ ...set, reps2: text });
                            }
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View pointerEvents={isRestTimerSelectionMode ? 'none' : 'auto'}>
                <TouchableOpacity
                  onPress={readOnly || isRestTimerSelectionMode ? undefined : onToggle}
                  disabled={readOnly || isMissingValue || isRestTimerSelectionMode}
                  style={[
                    styles.checkButton,
                    (readOnly || isMissingValue) ? styles.checkButtonDisabled : (set.completed ? styles.checkButtonCompleted : styles.checkButtonIncomplete)
                  ]}
                >
                  <Check size={16} color={(readOnly || isMissingValue) ? COLORS.slate[300] : (set.completed ? COLORS.white : COLORS.slate[400])} strokeWidth={3} />
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </SwipeToDelete>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    position: 'relative',
  },
  container: {
    flexDirection: 'column',
    overflow: 'visible',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'visible',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate[100],
    marginHorizontal: 8,
  },
  completedContainer: {
    backgroundColor: COLORS.green[50],
  },
  container__restTimerSelected: {
    // Border and background are handled by the wrapper in WorkoutTemplateIndex
  },
  swipeableRow: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  dropSetIndicator: {
    position: 'absolute',
    left: 0,
    width: 5,
    backgroundColor: COLORS.indigo[500],
    top: 0,
    bottom: 0,
  },
  dropSetIndicator__start: {
    top: 4,
  },
  dropSetIndicator__end: {
    bottom: 8,
  },
  container__dropSetStart: {
    borderTopWidth: 2,
    borderTopColor: COLORS.indigo[200],
    borderStyle: 'dashed',
  },
  container__dropSetEnd: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.indigo[200],
    borderStyle: 'dashed',
  },
  container__dropSet__flex: {
    flex: 1,
    marginLeft: 5,
  },
  container__nonDropSet__flex: {
    flex: 1,
    marginLeft: 0,
  },
  contentRow__dropSet: {
    paddingLeft: 3,
    paddingTop: 2,
    paddingBottom: 2,
  },
  contentRow__dropSet__start: {
    paddingTop: 6,
  },
  contentRow__dropSet__end: {
    paddingBottom: 8,
  },
  selectionMode__emptySpace: {
    width: 36, // Match colIndex width (32 + 4 margin)
    alignSelf: 'flex-start', // Left align
  },
  indexBadge: {
    width: 30,
    height: 26,
    minHeight: 22,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start', // Left align
    marginRight: 4,
    paddingVertical: 0,
    overflow: 'visible',
  },
  indexBadge__completed: {
    backgroundColor: COLORS.green[50],
  },
  indexBadge__border: {
    position: 'absolute',
    left: 0,
    top: 6, // Start after top border radius
    bottom: 6, // End before bottom border radius
    width: 2,
  },
  indexBadge__border__warmup: {
    backgroundColor: COLORS.orange[500],
  },
  indexBadge__border__failure: {
    backgroundColor: COLORS.red[500],
  },
  indexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  indexText__groupSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slate[400], // Default color when not in a group
  },
  previousContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  durationContainer: {
    width: 80, // Fixed width for duration column
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  durationInput: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: COLORS.slate[150],
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderWidth: 2,
    borderColor: COLORS.slate[150],
  },
  distanceContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  distanceInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  distanceInput: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: COLORS.slate[150],
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderWidth: 2,
    borderColor: COLORS.slate[150],
  },
  weightContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weightContainer__twoInputs: {
    flex: 2, // Takes 2/3 of space when there are 2 weight inputs (so each input gets 1/3)
  },
  weightContainer__twoRepsInputs: {
    flex: 1, // Takes 1/3 of space when there are 2 reps inputs (same as each reps input)
  },
  weightContainer__bothSplit: {
    flex: 2, // Takes 2/4 of space when both are split (so each of 4 inputs gets 1/4)
  },
  weightInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  weightInputWrapper__row: {
    flexDirection: 'row',
    gap: 4,
  },
  weightInputSingleWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  weightInputSingleWrapper__half: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  weightInput: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: COLORS.slate[150],
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderWidth: 2,
    borderColor: COLORS.slate[150],
  },
  weight2InputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  repsContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  repsContainer__twoWeightInputs: {
    flex: 1, // Takes 1/3 of space when there are 2 weight inputs (same as each weight input)
  },
  repsContainer__twoRepsInputs: {
    flex: 2, // Takes 2/3 of space when there are 2 reps inputs (so each input gets 1/3)
  },
  repsContainer__bothSplit: {
    flex: 2, // Takes 2/4 of space when both are split (so each of 4 inputs gets 1/4)
  },
  repsInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
  },
  repsInputWrapper__row: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    flex: 1,
  },
  repsInputSingleWrapper: {
    position: 'relative',
    width: '100%',
  },
  repsInputSingleWrapper__half: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    width: 'auto' as any,
    maxWidth: undefined as any,
  },
  reps2InputWrapper: {
    position: 'relative',
    flexBasis: 0,
    minWidth: 0,
  },
  repsInput: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: COLORS.slate[150],
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderWidth: 2,
    borderColor: COLORS.slate[150],
  },
  previousText: {
    fontSize: 12,
    color: COLORS.slate[400],
    fontWeight: '500',
  },
  previousText__italic: {
    fontStyle: 'italic',
  },
  previousUnitText: {
    fontSize: 12,
    color: COLORS.slate[300],
  },
  inputFocused: {
    borderColor: COLORS.slate[400],
    borderWidth: 2,
  },
  inputCompletedEmpty: {
    backgroundColor: COLORS.red[100],
    borderColor: COLORS.red[100],
    borderWidth: 2,
  },
  inputCompletedFilled: {
    backgroundColor: COLORS.green[50],
    borderWidth: 2,
    borderColor: COLORS.green[50],
  },
  checkButton: {
    width: 25,
    height: 25,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end', // Right align
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkButtonCompleted: {
    backgroundColor: COLORS.green[500],
    borderColor: COLORS.green[500],
  },
  checkButtonIncomplete: {
    backgroundColor: COLORS.slate[200],
    borderColor: COLORS.slate[200],
  },
  checkButtonDisabled: {
    backgroundColor: COLORS.slate[100],
    borderColor: COLORS.slate[100],
    opacity: 0.5,
  },
  selectionCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start', // Left align
    marginRight: 4,
  },
  selectionCheckboxSelected: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[500],
  },
  selectionCheckboxSelected__default: {
    backgroundColor: COLORS.indigo[500],
    borderColor: COLORS.indigo[500],
  },
  selectionPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.indigo[300],
    backgroundColor: COLORS.indigo[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start', // Left align
    marginRight: 4,
  },
});

export default SetRow;
