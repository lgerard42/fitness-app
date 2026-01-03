import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Check, Trash2, Plus } from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS } from '../constants/colors';

const DeleteAction = ({ progress, dragX, onDelete, buttonStyle }) => {
  const hasDeleted = React.useRef(false);
  const onDeleteRef = React.useRef(onDelete);
  
  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  React.useEffect(() => {
    // Reset hasDeleted when component mounts (new swipe gesture)
    hasDeleted.current = false;
    
    // Listen to dragX directly
    const id = dragX.addListener(({ value }) => {
      // value is negative when swiping left. 
      // Button width is 50.
      // We want to trigger delete when swiped past ~120px (more than double the button)
      if (value < -120 && !hasDeleted.current) {
        hasDeleted.current = true;
        if (onDeleteRef.current) {
          onDeleteRef.current();
        }
      }
    });
    return () => dragX.removeListener(id);
  }, [dragX]);

  const scale = dragX.interpolate({
    inputRange: [-150, -80],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

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

const WorkoutSetRow = ({
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
  groupSetType,
  readOnly = false,
  shouldFocus = null, // 'weight', 'reps', 'duration', 'distance' or null
  onFocusHandled = () => {},
  onCustomKeyboardOpen = null, // ({ field, value }) => void - opens custom keyboard
  customKeyboardActive = false, // true if custom keyboard is currently targeting this set
  customKeyboardField = null // 'weight' | 'reps' | null - which field the custom keyboard is targeting
}) => {
  const isLift = category === "Lifts";
  const isCardio = category === "Cardio";
  const [focusedInput, setFocusedInput] = React.useState(null);
  const firstInputRef = React.useRef(null);
  const secondInputRef = React.useRef(null);
  const indexContainerRef = React.useRef(null);

  // Auto-focus effect when shouldFocus is set
  React.useEffect(() => {
    if (shouldFocus && !readOnly) {
      const focusInput = () => {
        if (shouldFocus === 'weight' && firstInputRef.current) {
          firstInputRef.current.focus();
        } else if (shouldFocus === 'reps' && secondInputRef.current) {
          secondInputRef.current.focus();
        } else if (shouldFocus === 'duration' && firstInputRef.current) {
          firstInputRef.current.focus();
        } else if (shouldFocus === 'distance' && secondInputRef.current) {
          secondInputRef.current.focus();
        }
        onFocusHandled();
      };
      // Small delay to ensure the component is fully rendered
      setTimeout(focusInput, 100);
    }
  }, [shouldFocus, readOnly, onFocusHandled]);

  // Focus the correct input when custom keyboard targets this set
  React.useEffect(() => {
    if (customKeyboardActive && customKeyboardField && !readOnly) {
      const focusInput = () => {
        if (customKeyboardField === 'weight' && firstInputRef.current) {
          firstInputRef.current.focus();
          setFocusedInput('first');
        } else if (customKeyboardField === 'reps' && secondInputRef.current) {
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

  const handleFocus = (inputRef, value, inputId) => {
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

  const getInputStyle = (value) => {
    if (!set.completed) return null;
    const isEmpty = value === null || value === undefined || String(value).trim() === '';
    return isEmpty ? styles.inputCompletedEmpty : styles.inputCompletedFilled;
  };

  const renderRightActions = React.useCallback((progress, dragX) => {
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
          // If fully opened to the right (swiped left past threshold), trigger delete
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
              groupSetType === 'warmup' && styles.dropSetIndicator__warmup,
              groupSetType === 'dropset' && styles.dropSetIndicator__dropset,
              groupSetType === 'failure' && styles.dropSetIndicator__failure
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
                  // For grouped sets
                  if (dropSetId) {
                    // Only show on first set in group
                    if (indexInGroup === 1) {
                      // Check if this is a different group than the one being edited OR if no group is being edited
                      const isDifferentGroup = !editingGroupId || dropSetId !== editingGroupId;
                      
                      if (isDifferentGroup) {
                        // Show "+" icon for groups when: editing an ungrouped set OR editing a different group
                        return (
                          <TouchableOpacity 
                            onPress={() => onToggleSelection(true)}
                            style={styles.selectionPlusButton}
                          >
                            <Plus size={20} color={COLORS.indigo[600]} strokeWidth={3} />
                          </TouchableOpacity>
                        );
                      } else {
                        // Show checkbox for the group being edited
                        return (
                          <TouchableOpacity 
                            onPress={() => onToggleSelection(false)}
                            style={[
                              styles.selectionCheckbox,
                              isSelected && !groupSetType && styles.selectionCheckboxSelected__default,
                              isSelected && groupSetType === 'warmup' && styles.selectionCheckboxSelected__warmup,
                              isSelected && groupSetType === 'dropset' && styles.selectionCheckboxSelected__dropset,
                              isSelected && groupSetType === 'failure' && styles.selectionCheckboxSelected__failure
                            ]}
                          >
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      }
                    } else {
                      // Not the first set in group
                      // If this is the group being edited, show checkbox for each set
                      if (editingGroupId && dropSetId === editingGroupId) {
                        return (
                          <TouchableOpacity 
                            onPress={() => onToggleSelection(false)}
                            style={[
                              styles.selectionCheckbox,
                              isSelected && !groupSetType && styles.selectionCheckboxSelected__default,
                              isSelected && groupSetType === 'warmup' && styles.selectionCheckboxSelected__warmup,
                              isSelected && groupSetType === 'dropset' && styles.selectionCheckboxSelected__dropset,
                              isSelected && groupSetType === 'failure' && styles.selectionCheckboxSelected__failure
                            ]}
                          >
                            {isSelected && <Check size={14} color={COLORS.white} strokeWidth={3} />}
                          </TouchableOpacity>
                        );
                      } else {
                        // Otherwise show empty space
                        return <View style={styles.selectionMode__emptySpace} />;
                      }
                    }
                  } else {
                    // Ungrouped set - always show checkbox (can be added to any group or create new group)
                    return (
                      <TouchableOpacity 
                        onPress={() => onToggleSelection(false)}
                        style={[
                          styles.selectionCheckbox,
                          isSelected && !groupSetType && styles.selectionCheckboxSelected__default,
                          isSelected && groupSetType === 'warmup' && styles.selectionCheckboxSelected__warmup,
                          isSelected && groupSetType === 'dropset' && styles.selectionCheckboxSelected__dropset,
                          isSelected && groupSetType === 'failure' && styles.selectionCheckboxSelected__failure
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
                  onPress={(e) => {
                    if (!readOnly && onPressSetNumber && indexContainerRef.current) {
                      // Measure the indexContainer position instead of using touch coordinates
                      indexContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
                        // Pass the full bounds of the indexContainer
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
                  {/* Display index based on warmupIndex or workingIndex */}
                  {warmupIndex ? (
                    // Warmup set - display warmup-specific index
                    warmupIndex.subIndex !== null ? (
                      <Text style={styles.indexText}>
                        <Text style={styles.indexText__groupMain}>{warmupIndex.group}</Text>
                        <Text style={styles.indexText__groupSub}>.{warmupIndex.subIndex}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.indexText}>{warmupIndex.group}</Text>
                    )
                  ) : workingIndex ? (
                    // Working set - display working-specific index
                    workingIndex.subIndex !== null ? (
                      <Text style={styles.indexText}>
                        <Text style={styles.indexText__groupMain}>{workingIndex.group}</Text>
                        <Text style={styles.indexText__groupSub}>.{workingIndex.subIndex}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.indexText}>{workingIndex.group}</Text>
                    )
                  ) : (
                    // Fallback to legacy display
                    dropSetId ? (
                      <Text style={styles.indexText}>
                        <Text style={styles.indexText__groupMain}>{groupSetNumber}</Text>
                        <Text style={styles.indexText__groupSub}>.{indexInGroup}</Text>
                      </Text>
                    ) : (
                      <Text style={styles.indexText}>{overallSetNumber}</Text>
                    )
                  )}
                  
                  {/* Set type badge */}
                  {set.isWarmup && (
                    <View style={styles.setTypeBadge}>
                      <Text style={[styles.setTypeBadgeText, styles.setTypeBadgeText__warmup]}>W</Text>
                    </View>
                  )}
                  {set.isFailure && (
                    <View style={styles.setTypeBadge}>
                      <Text style={[styles.setTypeBadgeText, styles.setTypeBadgeText__failure]}>F</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

            <View style={styles.previousContainer}>
            {renderPrevious()}
          </View>

          <View style={styles.inputsContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={firstInputRef}
                style={[
                  styles.input, 
                  getInputStyle(isLift ? set.weight : set.duration),
                  (focusedInput === 'first' || (customKeyboardActive && customKeyboardField === 'weight')) && styles.inputFocused
                ]}
                selectTextOnFocus={true}
                showSoftInputOnFocus={!onCustomKeyboardOpen || !isLift}
                onFocus={() => {
                  if (!readOnly) {
                    const val = isLift ? (set.weight || "") : (set.duration || "");
                    if (onCustomKeyboardOpen && isLift) {
                      setFocusedInput('first');
                      onCustomKeyboardOpen({ field: 'weight', value: val });
                    } else {
                      handleFocus(firstInputRef, val, 'first');
                    }
                  }
                }}
                onBlur={() => {
                  // Don't clear focus if custom keyboard is active for this input
                  if (!customKeyboardActive || customKeyboardField !== 'weight') {
                    if (!onCustomKeyboardOpen || !isLift) {
                      setFocusedInput(null);
                    }
                  }
                }}
                placeholder={isLift ? "-" : "min:sec"}
                placeholderTextColor={COLORS.slate[400]}
                keyboardType={isLift ? "decimal-pad" : "default"} 
                value={isLift ? (set.weight || "") : (set.duration || "")}
                onChangeText={(text) => !readOnly && onUpdate({ ...set, [isLift ? 'weight' : 'duration']: text })}
                editable={!readOnly}
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                ref={secondInputRef}
                style={[
                  styles.input, 
                  getInputStyle(isLift ? set.reps : isCardio ? set.distance : set.reps),
                  (focusedInput === 'second' || (customKeyboardActive && customKeyboardField === 'reps')) && styles.inputFocused
                ]}
                selectTextOnFocus={true}
                showSoftInputOnFocus={!onCustomKeyboardOpen || !isLift}
                onFocus={() => {
                  if (!readOnly) {
                    const val = isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "");
                    if (onCustomKeyboardOpen && isLift) {
                      setFocusedInput('second');
                      onCustomKeyboardOpen({ field: 'reps', value: val });
                    } else {
                      handleFocus(secondInputRef, val, 'second');
                    }
                  }
                }}
                onBlur={() => {
                  // Don't clear focus if custom keyboard is active for this input
                  if (!customKeyboardActive || customKeyboardField !== 'reps') {
                    if (!onCustomKeyboardOpen || !isLift) {
                      setFocusedInput(null);
                    }
                  }
                }}
                placeholder={isLift ? "-" : isCardio ? "km" : "-"}
                placeholderTextColor={COLORS.slate[400]}
                keyboardType="decimal-pad"
                value={isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "")}
                onChangeText={(text) => !readOnly && onUpdate({ ...set, [isLift || !isCardio ? 'reps' : 'distance']: text })}
                editable={!readOnly}
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={readOnly ? null : onToggle}
            disabled={readOnly}
            style={[styles.checkButton, set.completed ? styles.checkButtonCompleted : styles.checkButtonIncomplete]}
          >
            <Check size={16} color={set.completed ? COLORS.white : COLORS.slate[400]} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>
        </View>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  // Row wrapper (contains group number and swipeable)
  rowWrapper: {
    position: 'relative',
  },
  
  // Base container styles
  container: {
    flexDirection: 'column',
    overflow: 'visible',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    overflow: 'visible',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.slate[100],
    marginHorizontal: 8,
  },
  completedContainer: {
    backgroundColor: COLORS.green[50],
  },
  
  // Swipeable row
  swipeableRow: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  
  // Drop set indicator styles
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
  dropSetIndicator__warmup: {
    backgroundColor: COLORS.orange[500],
  },
  dropSetIndicator__dropset: {
    backgroundColor: COLORS.blue[500],
  },
  dropSetIndicator__failure: {
    backgroundColor: COLORS.red[500],
  },
  
  // Container conditional styles
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
  
  // Content row conditional styles
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
  
  // Selection mode styles
  selectionMode__emptySpace: {
    width: 32,
    marginRight: 4,
  },
  
  // Index badge styles (consolidated from indexContainer)
  indexBadge: {
    width: 32,
    height: 22,
    minHeight: 22,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 4,
    paddingVertical: 0,
    overflow: 'visible',
  },
  indexBadge__completed: {
    backgroundColor: COLORS.green[50],
  },
  
  // Index text styles
  indexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  indexText__dropSet__Purple: {
    color: COLORS.indigo[400],
  },
  indexText__groupMain: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  indexText__groupSub: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.indigo[400],
  },

  // Set type badge
  setTypeBadge: {
    position: 'absolute',
    top: -3,
    left: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  setTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  setTypeBadgeText__warmup: {
    color: COLORS.orange[500],
  },
  setTypeBadgeText__failure: {
    color: COLORS.red[500],
  },
  
  // Previous container
  previousContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // Input styles
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.slate[50],
    borderRadius: 8,
    paddingVertical: 2,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputFocused: {
    borderColor: COLORS.slate[400],
    borderWidth: 2,
  },
  inputCompletedEmpty: {
    backgroundColor: COLORS.red[50],
    borderColor: COLORS.red[300],
    borderWidth: 2,
  },
  inputCompletedFilled: {
    backgroundColor: COLORS.green[50],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  // Check button styles
  checkButton: {
    width: 32,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: COLORS.green[500],
  },
  checkButtonIncomplete: {
    backgroundColor: COLORS.slate[200],
  },
  
  // Delete button
  deleteButton: {
    backgroundColor: COLORS.red[500],
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: '100%',
    marginLeft: 8,
    borderRadius: 8,
  },
  
  // Delete action animated
  deleteAction__animatedScale: {
    transform: [{ scale: 1 }],
  },
  
  // Selection checkbox styles
  selectionCheckbox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
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
  selectionCheckboxSelected__warmup: {
    backgroundColor: COLORS.orange[500],
    borderColor: COLORS.orange[500],
  },
  selectionCheckboxSelected__dropset: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[500],
  },
  selectionCheckboxSelected__failure: {
    backgroundColor: COLORS.red[500],
    borderColor: COLORS.red[500],
  },
  
  // Selection plus button styles
  selectionPlusButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.indigo[300],
    backgroundColor: COLORS.indigo[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginRight: 4,
  },
});

export default WorkoutSetRow;
