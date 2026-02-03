import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Check, Trash2, Plus } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '@/constants/colors';
import { useSetRowLogic } from './hooks/useSetRowLogic';
import { getGroupColorScheme } from '@/utils/workoutHelpers';
import type { Set, ExerciseCategory, WeightUnit } from '@/types/workout';

interface SetIndex {
  group: number;
  subIndex: number | null;
}

interface DeleteActionProps {
  progress: Animated.AnimatedInterpolation<number>;
  dragX: Animated.AnimatedInterpolation<number>;
  onDelete: () => void;
  buttonStyle: object;
}

const DeleteAction: React.FC<DeleteActionProps> = ({ progress, dragX, onDelete, buttonStyle }) => {
  const hasDeleted = React.useRef(false);
  const onDeleteRef = React.useRef(onDelete);

  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  React.useEffect(() => {
    hasDeleted.current = false;

    const id = dragX.addListener(({ value }) => {
      if (value < -120 && !hasDeleted.current) {
        hasDeleted.current = true;
        if (onDeleteRef.current) {
          onDeleteRef.current();
        }
      }
    });
    return () => dragX.removeListener(id);
  }, [dragX]);

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onDelete}
    >
      <Animated.View style={styles.deleteAction__animatedScale}>
        <Trash2 size={20} color={COLORS.white} />
      </Animated.View>
    </TouchableOpacity>
  );
};

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
  shouldFocus?: 'weight' | 'reps' | 'duration' | 'distance' | null;
  onFocusHandled?: () => void;
  onCustomKeyboardOpen?: ((params: { field: 'weight' | 'reps' | 'duration' | 'distance'; value: string }) => void) | null;
  customKeyboardActive?: boolean;
  customKeyboardField?: 'weight' | 'reps' | 'duration' | 'distance' | null;
  customKeyboardShouldSelectAll?: boolean;
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
  customKeyboardShouldSelectAll = false
}) => {
  const isLift = category === 'Lifts';
  const isCardio = category === 'Cardio';

  // Determine group color scheme
  const groupColorScheme = isGroupChild && parentGroupType
    ? getGroupColorScheme(parentGroupType)
    : null;

  // Check if required values are missing (individually)
  const isMissingWeight = isLift
    ? (!set.weight || set.weight.trim() === '')
    : (!set.duration || set.duration.trim() === '');

  const isMissingReps = isLift || !isCardio
    ? (!set.reps || set.reps.trim() === '')
    : (!set.distance || set.distance.trim() === '');

  const isMissingValue = isMissingWeight || isMissingReps;

  // Track selection for cursor positioning after custom keyboard updates
  const [firstInputSelection, setFirstInputSelection] = useState<{ start: number; end: number } | null>(null);
  const [secondInputSelection, setSecondInputSelection] = useState<{ start: number; end: number } | null>(null);
  const firstInputInitialFocusRef = useRef<boolean>(false);
  const secondInputInitialFocusRef = useRef<boolean>(false);
  const firstInputInitialValueRef = useRef<string | null>(null);
  const secondInputInitialValueRef = useRef<string | null>(null);

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

  // Set cursor position or selection when value changes from custom keyboard
  // Only update selection when explicitly needed (after +/- or after user input), not on initial focus
  useEffect(() => {
    const expectedField = isLift ? 'weight' : (isCardio ? 'duration' : null);
    if (customKeyboardActive && customKeyboardField === expectedField) {
      const value = isLift ? (set.weight || "") : (set.duration || "");
      const length = value.length;
      const initialValue = firstInputInitialValueRef.current;

      // If shouldSelectAll is true (from +/- operations), select entire value
      if (customKeyboardShouldSelectAll && length > 0) {
        setFirstInputSelection({ start: 0, end: length });
        firstInputInitialFocusRef.current = false;
        firstInputInitialValueRef.current = value;
      }
      // If value has changed from initial value, user has typed - position cursor at end
      else if (value !== initialValue) {
        // Value changed, so position cursor at end
        setFirstInputSelection({ start: length, end: length });
        // Mark that user has interacted (so future updates position cursor at end)
        firstInputInitialFocusRef.current = true;
        // Update the initial value ref to current value
        firstInputInitialValueRef.current = value;
      }
      // If value hasn't changed and ref is false, this is initial focus - don't override selection
    } else {
      // Reset when keyboard becomes inactive
      firstInputInitialFocusRef.current = false;
      firstInputInitialValueRef.current = null;
    }
  }, [set.weight, set.duration, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, isLift, isCardio]);

  useEffect(() => {
    const expectedField = isLift ? 'reps' : (isCardio ? 'distance' : null);
    if (customKeyboardActive && customKeyboardField === expectedField) {
      const value = isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "");
      const length = value.length;
      const initialValue = secondInputInitialValueRef.current;

      // If shouldSelectAll is true (from +/- operations), select entire value
      if (customKeyboardShouldSelectAll && length > 0) {
        setSecondInputSelection({ start: 0, end: length });
        secondInputInitialFocusRef.current = false;
        secondInputInitialValueRef.current = value;
      }
      // If value has changed from initial value, user has typed - position cursor at end
      else if (value !== initialValue) {
        // Value changed, so position cursor at end
        setSecondInputSelection({ start: length, end: length });
        // Mark that user has interacted (so future updates position cursor at end)
        secondInputInitialFocusRef.current = true;
        // Update the initial value ref to current value
        secondInputInitialValueRef.current = value;
      }
      // If value hasn't changed and ref is false, this is initial focus - don't override selection
    } else {
      // Reset when keyboard becomes inactive
      secondInputInitialFocusRef.current = false;
      secondInputInitialValueRef.current = null;
    }
  }, [set.reps, set.distance, customKeyboardActive, customKeyboardField, customKeyboardShouldSelectAll, isLift, isCardio]);

  const getInputStyle = (value: string | null | undefined) => {
    if (!set.completed) return null;
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    return isEmpty ? styles.inputCompletedEmpty : styles.inputCompletedFilled;
  };

  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    return <DeleteAction progress={progress} dragX={dragX} onDelete={onDelete} buttonStyle={styles.deleteButton} />;
  }, [onDelete]);

  const renderPrevious = () => {
    if (!previousSet) return <Text style={styles.previousText}>-</Text>;

    const textStyle = [
      styles.previousText,
      previousSetIsFromOlderHistory && styles.previousText__italic
    ];

    if (isLift) {
      return (
        <Text style={textStyle}>
          {previousSet.weight || '-'}
          <Text style={[styles.previousUnitText, previousSetIsFromOlderHistory && styles.previousText__italic]}>
            {weightUnit === 'lbs' ? 'lb' : (weightUnit || 'lb')}{' '}
          </Text>
          x {previousSet.reps || '-'}
        </Text>
      );
    }
    if (isCardio) {
      return <Text style={textStyle}>{`${previousSet.duration || '-'} / ${previousSet.distance || '-'}`}</Text>;
    }
    return <Text style={textStyle}>{`${previousSet.reps || '-'}`}</Text>;
  };

  return (
    <View style={styles.rowWrapper}>
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableWillOpen={(direction) => {
          if (direction === 'right') {
            onDelete();
          }
        }}
        overshootRight={true}
        rightThreshold={120}
        enabled={!isSelectionMode}
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
          <View style={[
            styles.container,
            set.completed && styles.completedContainer,
            dropSetId && isDropSetStart && styles.container__dropSetStart,
            dropSetId && isDropSetEnd && styles.container__dropSetEnd,
            dropSetId ? styles.container__dropSet__flex : styles.container__nonDropSet__flex
          ]}>
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
                <TouchableOpacity
                  ref={indexContainerRef}
                  onPress={() => {
                    if (!readOnly && onPressSetNumber && indexContainerRef.current) {
                      indexContainerRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                        onPressSetNumber(pageX, pageY, width, height);
                      });
                    }
                  }}
                  disabled={readOnly}
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
              )}

              <View style={styles.previousContainer}>
                {renderPrevious()}
              </View>

              <View style={styles.weightContainer}>
                <View style={styles.weightInputWrapper}>
                  <TextInput
                    numberOfLines={1}
                    ref={firstInputRef}
                    style={[
                      styles.weightInput,
                      getInputStyle(isLift ? set.weight : set.duration),
                      (focusedInput === 'first' || (customKeyboardActive && (customKeyboardField === 'weight' || customKeyboardField === 'duration'))) && styles.inputFocused,
                      isMissingWeight && styles.inputCompletedEmpty
                    ]}
                    selectTextOnFocus={true}
                    showSoftInputOnFocus={!onCustomKeyboardOpen}
                    onFocus={() => {
                      if (!readOnly) {
                        const val = isLift ? (set.weight || "") : (set.duration || "");
                        if (onCustomKeyboardOpen) {
                          if (isLift) {
                            onCustomKeyboardOpen({ field: 'weight', value: val });
                          } else if (isCardio) {
                            onCustomKeyboardOpen({ field: 'duration', value: val });
                          }
                          // On initial focus, ref should be false - don't override selection yet
                          // Text will be selected by selectTextOnFocus
                          firstInputInitialFocusRef.current = false;
                          // Store the initial value to detect when it changes
                          firstInputInitialValueRef.current = val;
                          // Clear any existing selection state to let selectTextOnFocus work
                          setFirstInputSelection(null);
                        } else {
                          handleFocus(firstInputRef, val, 'first');
                        }
                      }
                    }}
                    onBlur={() => {
                      const expectedField = isLift ? 'weight' : (isCardio ? 'duration' : null);
                      if (!customKeyboardActive || customKeyboardField !== expectedField) {
                        if (!onCustomKeyboardOpen || (!isLift && !isCardio)) {
                          // Focus cleared by hook
                        }
                      }
                    }}
                    placeholder={isLift ? "" : "min:sec"}
                    placeholderTextColor={COLORS.slate[400]}
                    keyboardType={isLift ? "decimal-pad" : "default"}
                    value={isLift ? (set.weight || "") : (set.duration || "")}
                    selection={firstInputSelection || undefined}
                    onSelectionChange={(e) => {
                      // Only update selection if not from custom keyboard
                      const expectedField = isLift ? 'weight' : (isCardio ? 'duration' : null);
                      if (!customKeyboardActive || customKeyboardField !== expectedField) {
                        setFirstInputSelection(e.nativeEvent.selection);
                      }
                    }}
                    onChangeText={(text) => {
                      if (!readOnly) {
                        // Clear selection when user types normally
                        const expectedField = isLift ? 'weight' : (isCardio ? 'duration' : null);
                        if (!customKeyboardActive || customKeyboardField !== expectedField) {
                          setFirstInputSelection(null);
                        } else {
                          // User has typed via custom keyboard, mark that initial focus is done
                          // This will allow useEffect to position cursor at end on next value change
                          firstInputInitialFocusRef.current = true;
                          // Immediately position cursor at end after typing
                          const length = text.length;
                          setFirstInputSelection({ start: length, end: length });
                        }
                        onUpdate({ ...set, [isLift ? 'weight' : 'duration']: text });
                      }
                    }}
                    editable={!readOnly}
                  />
                </View>
              </View>

              <View style={styles.repsContainer}>
                <View style={styles.repsInputWrapper}>
                  <TextInput
                    numberOfLines={1}
                    ref={secondInputRef}
                    style={[
                      styles.repsInput,
                      getInputStyle(isLift ? set.reps : isCardio ? set.distance : set.reps),
                      (focusedInput === 'second' || (customKeyboardActive && customKeyboardField === 'reps')) && styles.inputFocused,
                      isMissingReps && styles.inputCompletedEmpty
                    ]}
                    selectTextOnFocus={true}
                    showSoftInputOnFocus={!onCustomKeyboardOpen}
                    onFocus={() => {
                      if (!readOnly) {
                        const val = isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "");
                        if (onCustomKeyboardOpen) {
                          if (isLift) {
                            onCustomKeyboardOpen({ field: 'reps', value: val });
                          } else if (isCardio) {
                            onCustomKeyboardOpen({ field: 'distance', value: val });
                          }
                          // On initial focus, ref should be false - don't override selection yet
                          // Text will be selected by selectTextOnFocus
                          secondInputInitialFocusRef.current = false;
                          // Store the initial value to detect when it changes
                          secondInputInitialValueRef.current = val;
                          // Clear any existing selection state to let selectTextOnFocus work
                          setSecondInputSelection(null);
                        } else {
                          handleFocus(secondInputRef, val, 'second');
                        }
                      }
                    }}
                    onBlur={() => {
                      const expectedField = isLift ? 'reps' : (isCardio ? 'distance' : null);
                      if (!customKeyboardActive || customKeyboardField !== expectedField) {
                        if (!onCustomKeyboardOpen || (!isLift && !isCardio)) {
                          // Focus cleared by hook
                        }
                      }
                    }}
                    placeholder={isLift ? "" : isCardio ? "km" : ""}
                    placeholderTextColor={COLORS.slate[400]}
                    keyboardType="decimal-pad"
                    value={isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "")}
                    selection={secondInputSelection || undefined}
                    onSelectionChange={(e) => {
                      // Only update selection if not from custom keyboard
                      const expectedField = isLift ? 'reps' : (isCardio ? 'distance' : null);
                      if (!customKeyboardActive || customKeyboardField !== expectedField) {
                        setSecondInputSelection(e.nativeEvent.selection);
                      }
                    }}
                    onChangeText={(text) => {
                      if (!readOnly) {
                        // Clear selection when user types normally
                        const expectedField = isLift ? 'reps' : (isCardio ? 'distance' : null);
                        if (!customKeyboardActive || customKeyboardField !== expectedField) {
                          setSecondInputSelection(null);
                        } else {
                          // User has typed via custom keyboard, mark that initial focus is done
                          // This will allow useEffect to position cursor at end on next value change
                          secondInputInitialFocusRef.current = true;
                          // Immediately position cursor at end after typing
                          const length = text.length;
                          setSecondInputSelection({ start: length, end: length });
                        }
                        onUpdate({ ...set, [isLift || !isCardio ? 'reps' : 'distance']: text });
                      }
                    }}
                    editable={!readOnly}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={readOnly ? undefined : onToggle}
                disabled={readOnly || isMissingValue}
                style={[
                  styles.checkButton,
                  (readOnly || isMissingValue) ? styles.checkButtonDisabled : (set.completed ? styles.checkButtonCompleted : styles.checkButtonIncomplete)
                ]}
              >
                <Check size={16} color={(readOnly || isMissingValue) ? COLORS.slate[300] : (set.completed ? COLORS.white : COLORS.slate[400])} strokeWidth={3} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    </View>
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
  weightContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weightInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
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
  repsContainer: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  repsInputWrapper: {
    width: '100%',
    position: 'relative',
    maxWidth: '100%',
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
  deleteButton: {
    backgroundColor: COLORS.red[500],
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: '100%',
    marginLeft: 8,
    borderRadius: 8,
  },
  deleteAction__animatedScale: {
    transform: [{ scale: 1 }],
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
