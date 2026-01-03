import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, SafeAreaView, Modal, Animated, Easing } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, FileText, Plus, Dumbbell, Layers, MoreVertical, CalendarDays, Trash2, RefreshCw, Scale, X, Flame, TrendingDown, Zap, Check, Timer, Pause, Play, Delete } from 'lucide-react-native';
import { COLORS } from '../constants/colors';
import { formatDuration } from '../constants/data';
import { useWorkout } from '../context/WorkoutContext';
import WorkoutSetRow from '../components/WorkoutSetRow';
import SavedNoteItem from '../components/SavedNoteItem';
import ExercisePickerModal from '../components/ExercisePickerModal';
import NewExerciseModal from '../components/NewExerciseModal';
import { CATEGORIES } from '../constants/data';

const updateExercisesDeep = (list, instanceId, updateFn) => {
  return list.map(item => {
    if (item.instanceId === instanceId) return updateFn(item);
    if (item.type === 'group' && item.children) {
      return { ...item, children: updateExercisesDeep(item.children, instanceId, updateFn) };
    }
    return item;
  });
};

const deleteExerciseDeep = (list, instanceId) => {
  return list.reduce((acc, item) => {
    if (item.instanceId === instanceId) return acc;
    if (item.type === 'group' && item.children) {
      const newChildren = deleteExerciseDeep(item.children, instanceId);
      if (newChildren.length === 0) return acc; // Remove empty group
      return [...acc, { ...item, children: newChildren }];
    }
    return [...acc, item];
  }, []);
};

// --- Flatten / Reconstruct Helpers ---

const flattenExercises = (exercises) => {
  const rows = [];
  exercises.forEach(item => {
    if (item.type === 'group') {
      rows.push({ type: 'group_header', id: item.instanceId, data: item, depth: 0 });
      if (item.children) {
        item.children.forEach(child => {
          rows.push({ type: 'exercise', id: child.instanceId, data: child, depth: 1, groupId: item.instanceId });
        });
      }
    } else {
      rows.push({ type: 'exercise', id: item.instanceId, data: item, depth: 0, groupId: null });
    }
  });
  return rows;
};

const reconstructExercises = (flatRows) => {
  const newExercises = [];
  let currentGroup = null;

  flatRows.forEach(row => {
    if (row.type === 'group_header') {
      // Start new group
      currentGroup = { ...row.data, children: [] };
      newExercises.push(currentGroup);
    } else if (row.type === 'exercise') {
      // If we are "inside" a group (i.e. following a header), add to it.
      // BUT: We need to respect the user's intent. 
      // Simple heuristic: If the row has a groupId that matches the currentGroup, keep it there?
      // No, the order in flatRows is the truth.
      // The greedy approach: If currentGroup is active, add to it.
      // To allow "breaking out", we would need explicit "end group" markers or depth changes.
      // For this implementation, we'll assume:
      // 1. If we hit a group header, we are in that group.
      // 2. If we hit a standalone exercise (depth 0), we exit the group? 
      //    But how do we know it's depth 0 if we just moved it?
      //    We update the depth based on where it was dropped!
      
      if (row.depth === 1 && currentGroup) {
        currentGroup.children.push(row.data);
      } else {
        // Standalone
        newExercises.push(row.data);
        currentGroup = null; // Reset current group
      }
    }
  });
  return newExercises;
};

const findExerciseDeep = (list, instanceId) => {
  for (const item of list) {
    if (item.instanceId === instanceId) return item;
    if (item.type === 'group' && item.children) {
      const found = findExerciseDeep(item.children, instanceId);
      if (found) return found;
    }
  }
  return null;
};

// Format seconds to MM:SS display
const formatRestTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Smart parse time input to seconds
// - 1-2 digits: treat as seconds (e.g., "30" → 30s, "90" → 90s)
// - 3+ digits with last 2 < 60: parse as MMSS (e.g., "110" → 1:10 = 70s)
// - 3+ digits with last 2 >= 60: treat as total seconds (e.g., "165" → 165s)
const parseRestTimeInput = (input) => {
  const num = parseInt(input, 10);
  if (isNaN(num) || num <= 0) return 0;
  
  if (num <= 99) {
    // 1-2 digits: treat as seconds
    return num;
  } else {
    // 3+ digits: check if last two digits are valid seconds (< 60)
    const lastTwo = num % 100;
    const rest = Math.floor(num / 100);
    
    if (lastTwo < 60) {
      // Parse as MMSS format (e.g., 110 → 1 min 10 sec)
      return rest * 60 + lastTwo;
    } else {
      // Last two digits >= 60, treat as total seconds
      return num;
    }
  }
};

// Helper functions for superset detection
const getAllSupersets = (exercises) => {
  return exercises.filter(ex => ex.type === 'group' && ex.groupType === 'Superset');
};

const findExerciseSuperset = (exercises, exerciseInstanceId) => {
  for (const item of exercises) {
    if (item.type === 'group' && item.groupType === 'Superset' && item.children) {
      const found = item.children.find(child => child.instanceId === exerciseInstanceId);
      if (found) return item;
    }
  }
  return null;
};

const isExerciseInSuperset = (exercises, exerciseInstanceId) => {
  return !!findExerciseSuperset(exercises, exerciseInstanceId);
};

const getStandaloneExercises = (exercises) => {
  const standalone = [];
  exercises.forEach(item => {
    if (item.type === 'exercise') {
      standalone.push(item);
    }
  });
  return standalone;
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Swipe-to-delete action component for rest timers
const RestTimerDeleteAction = ({ progress, dragX, onDelete, onSwipeComplete }) => {
  const hasDeleted = React.useRef(false);
  const onDeleteRef = React.useRef(onDelete);
  
  React.useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  React.useEffect(() => {
    // Reset hasDeleted when component mounts (new swipe gesture)
    hasDeleted.current = false;
    
    const id = dragX.addListener(({ value }) => {
      // Trigger delete when swiped past ~120px (value is negative when swiping left)
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
      style={{
        backgroundColor: COLORS.red[500],
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: '100%',
      }}
      onPress={onDelete}
    >
      <Trash2 size={20} color={COLORS.white} />
    </TouchableOpacity>
  );
};

const LiveWorkoutScreen = ({ 
  navigation, 
  isEditMode = false, 
  editModeWorkout = null, 
  onWorkoutUpdate = null,
  customHeader = null,
  customFinishButton = null,
  hideTimer = false,
  readOnly = false
}) => {
  const { activeWorkout, updateWorkout, finishWorkout, cancelWorkout, exercisesLibrary, addExerciseToLibrary, updateExerciseInLibrary, exerciseStats } = useWorkout();
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [popupKey, setPopupKey] = useState(0); // Force popup re-mount


  // Exercise Options State
  const [optionsModalExId, setOptionsModalExId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16 });
  const [replacingExerciseId, setReplacingExerciseId] = useState(null);
  const [exerciseNoteModalOpen, setExerciseNoteModalOpen] = useState(false);
  const [currentExerciseNote, setCurrentExerciseNote] = useState("");
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState({}); // { [instanceId]: boolean }

  // Move Mode State
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [movingItemId, setMovingItemId] = useState(null);
  const [originalExercisesSnapshot, setOriginalExercisesSnapshot] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef(null);

  // Group Set Type State (for editing groups)
  const [groupSetType, setGroupSetType] = useState(null); // 'warmup', 'dropset', 'failure', or null

  // Superset State
  const [supersetSelectionMode, setSupersetSelectionMode] = useState(null); // { exerciseId, mode: 'create' | 'add' | 'edit' }
  const [selectedExerciseIds, setSelectedExerciseIds] = useState(new Set());

  // Rest Timer State
  const [activeRestTimer, setActiveRestTimer] = useState(null); // { exerciseId, setId, remainingSeconds, totalSeconds, isPaused }
  const [restPeriodModalOpen, setRestPeriodModalOpen] = useState(false); // Shows duration picker
  const [restPeriodSetInfo, setRestPeriodSetInfo] = useState(null); // { exerciseId, setId } - which set we're adding rest to
  const [restTimerInput, setRestTimerInput] = useState(''); // Raw input for rest timer
  const [focusNextSet, setFocusNextSet] = useState(null); // { exerciseId, setId, field: 'weight' | 'reps' } - auto-focus target
  const [restTimerPopupOpen, setRestTimerPopupOpen] = useState(false); // Shows expanded timer popup

  // Custom Keyboard State
  const [customKeyboardVisible, setCustomKeyboardVisible] = useState(false);
  const [customKeyboardTarget, setCustomKeyboardTarget] = useState(null); // { exerciseId, setId, field: 'weight' | 'reps' }
  const [customKeyboardValue, setCustomKeyboardValue] = useState('');

  // Rest Timer Countdown Effect
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.isPaused) return;
    
    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.isPaused) return prev;
        const newRemaining = prev.remainingSeconds - 1;
        if (newRemaining <= 0) {
          // Timer finished - close popup if open and mark timer as completed
          setRestTimerPopupOpen(false);
          
          // Mark this set's rest timer as completed
          handleWorkoutUpdate({
            ...currentWorkout,
            exercises: updateExercisesDeep(currentWorkout.exercises, prev.exerciseId, (ex) => ({
              ...ex,
              sets: ex.sets.map(s => s.id === prev.setId ? { ...s, restTimerCompleted: true } : s)
            }))
          });
          
          return null;
        }
        return { ...prev, remainingSeconds: newRemaining };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeRestTimer?.setId, activeRestTimer?.isPaused]);

  useEffect(() => {
    if (isMoveMode && movingItemId) {
      fadeAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.stopAnimation();
      fadeAnim.setValue(1);
    }
  }, [isMoveMode, movingItemId]);

  // Notes State
  const [showNotes, setShowNotes] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);

  // Use editModeWorkout if in edit mode, otherwise use currentWorkout
  const currentWorkout = isEditMode ? editModeWorkout : activeWorkout;
  const handleWorkoutUpdate = isEditMode ? onWorkoutUpdate : updateWorkout;

  useEffect(() => {
    if (!currentWorkout) {
      if (!isEditMode) {
        navigation.goBack();
      }
      return;
    }
    if (!hideTimer && !isEditMode) {
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - currentWorkout.startedAt) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentWorkout, hideTimer, isEditMode]);

  if (!currentWorkout) return null;

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const noteToAdd = { id: `note-${Date.now()}`, text: newNote, date: newNoteDate, pinned: false };
    handleWorkoutUpdate({ ...currentWorkout, sessionNotes: [noteToAdd, ...(currentWorkout.sessionNotes || [])] });
    setNewNote(""); 
    setNewNoteDate(new Date().toISOString().split('T')[0]); 
    setIsNoteModalOpen(false); 
    setShowNotes(true);
  };

  const handleRemoveNote = (noteId) => { 
    handleWorkoutUpdate({ ...currentWorkout, sessionNotes: (currentWorkout.sessionNotes || []).filter(n => n.id !== noteId) }); 
  };

  const handlePinNote = (noteId) => { 
    handleWorkoutUpdate({ ...currentWorkout, sessionNotes: (currentWorkout.sessionNotes || []).map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n) }); 
  };

  const sortedNotes = useMemo(() => { 
    return [...(currentWorkout.sessionNotes || [])].sort((a, b) => { 
      if (a.pinned && !b.pinned) return -1; 
      if (!a.pinned && b.pinned) return 1; 
      return 0; 
    }); 
  }, [currentWorkout.sessionNotes]);

  const createExerciseInstance = (ex) => {
    // Get pinned notes from the library exercise
    const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.id);
    const pinnedNotes = libraryExercise?.pinnedNotes || [];
    
    return {
      instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      type: 'exercise',
      sets: [{ id: `s-${Date.now()}-${Math.random()}`, type: "Working", weight: "", reps: "", duration: "", distance: "", completed: false }],
      notes: [...pinnedNotes], // Include pinned notes from library
      collapsed: false
    };
  };

  const handleAddExercisesFromPicker = (selectedExercises, groupType) => {
    if (replacingExerciseId) {
      // Handle Replacement
      if (selectedExercises.length > 0) {
        const newEx = createExerciseInstance(selectedExercises[0]);
        // Preserve sets if possible? For now, let's just replace with new sets.
        // Or maybe try to map old sets to new? The user said "replace", usually implies a swap.
        // Let's keep it simple: swap the exercise, keep the instanceId? No, new instanceId is safer.
        // But we need to replace in place.
        
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, replacingExerciseId, (oldEx) => ({
            ...newEx,
            instanceId: oldEx.instanceId, // Keep same ID to avoid re-render jumps? Or new ID?
            // If we keep ID, we must ensure all other props are updated.
            // Actually, let's use the new ID but put it in the same spot.
            // updateExercisesDeep expects to return the *updated* item.
            // So we return newEx.
            ...newEx
          }))
        });
      }
      setReplacingExerciseId(null);
      setShowPicker(false);
      return;
    }

    const newInstances = selectedExercises.map(createExerciseInstance);
    
    let itemsToAdd = [];
    if (groupType && newInstances.length > 1) {
      itemsToAdd = [{
        instanceId: `group-${Date.now()}`,
        type: 'group',
        groupType: groupType, 
        children: newInstances
      }];
    } else {
      itemsToAdd = newInstances;
    }

    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: [...currentWorkout.exercises, ...itemsToAdd]
    });
    setShowPicker(false);
  };

  const handleCreateExerciseSave = (newExData) => {
    const tempEx = { ...newExData, id: `new-${Date.now()}` };
    // Also add to library globally
    addExerciseToLibrary(tempEx);
    handleAddExercisesFromPicker([tempEx], null);
    setIsCreateModalOpen(false);
  };

  const handleUpdateSet = (exInstanceId, updatedSet) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => ({
        ...ex, sets: ex.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
      }))
    });
  };

  const handleAddSet = (exInstanceId) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => {
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet = {
          id: `s-${Date.now()}-${Math.random()}`, type: "Working",
          weight: lastSet ? lastSet.weight : "", reps: lastSet ? lastSet.reps : "", duration: lastSet ? lastSet.duration : "", distance: lastSet ? lastSet.distance : "",
          completed: false
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    });
  };

  const handleToggleComplete = (exInstanceId, set) => {
    const isBeingCompleted = !set.completed;
    
    if (isBeingCompleted) {
      // Mark set as completed
      handleUpdateSet(exInstanceId, { ...set, completed: true });
      
      // Start rest timer if this set has a rest period
      if (set.restPeriodSeconds) {
        setActiveRestTimer({
          exerciseId: exInstanceId,
          setId: set.id,
          remainingSeconds: set.restPeriodSeconds,
          totalSeconds: set.restPeriodSeconds,
          isPaused: false
        });
      }
      
      // Find and focus the next set's input
      const exercise = findExerciseDeep(currentWorkout.exercises, exInstanceId);
      if (exercise) {
        const setIndex = exercise.sets.findIndex(s => s.id === set.id);
        if (setIndex !== -1 && setIndex < exercise.sets.length - 1) {
          const nextSet = exercise.sets[setIndex + 1];
          // Determine which field to focus: first empty one, or reps if both filled
          let fieldToFocus = 'reps';
          if (exercise.category === 'Lifts') {
            if (!nextSet.weight || nextSet.weight === '') {
              fieldToFocus = 'weight';
            } else if (!nextSet.reps || nextSet.reps === '') {
              fieldToFocus = 'reps';
            }
          } else if (exercise.category === 'Cardio') {
            if (!nextSet.duration || nextSet.duration === '') {
              fieldToFocus = 'duration';
            } else if (!nextSet.distance || nextSet.distance === '') {
              fieldToFocus = 'distance';
            } else {
              fieldToFocus = 'distance';
            }
          }
          setFocusNextSet({ exerciseId: exInstanceId, setId: nextSet.id, field: fieldToFocus });
        }
      }
    } else {
      // Uncompleting set - also clear restTimerCompleted
      const updatedSet = { ...set, completed: false };
      delete updatedSet.restTimerCompleted;
      handleUpdateSet(exInstanceId, updatedSet);
      
      // Also cancel any active timer for this set
      if (activeRestTimer?.setId === set.id) {
        setActiveRestTimer(null);
      }
    }
  };

  // Custom keyboard handler
  const handleCustomKeyboardOpen = (exerciseId, setId, field, value) => {
    setCustomKeyboardTarget({ exerciseId, setId, field });
    setCustomKeyboardValue(value || '');
    setCustomKeyboardVisible(true);
  };

  const handleCustomKeyboardInput = (key) => {
    let newValue;
    if (key === 'backspace') {
      newValue = customKeyboardValue.slice(0, -1);
    } else if (key === '.') {
      // Only add decimal if there isn't one already
      if (!customKeyboardValue.includes('.')) {
        newValue = customKeyboardValue + '.';
      } else {
        return; // Don't add another decimal
      }
    } else {
      newValue = customKeyboardValue + key;
    }
    
    setCustomKeyboardValue(newValue);
    
    // Also update the set value in real-time
    if (customKeyboardTarget) {
      const { exerciseId, setId, field } = customKeyboardTarget;
      const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
      if (exercise) {
        const set = exercise.sets.find(s => s.id === setId);
        if (set) {
          handleUpdateSet(exerciseId, { ...set, [field]: newValue });
        }
      }
    }
  };

  const closeCustomKeyboard = () => {
    setCustomKeyboardVisible(false);
    setCustomKeyboardTarget(null);
    setCustomKeyboardValue('');
  };

  const handleCustomKeyboardClose = () => {
    // Value is already saved in real-time, just close
    closeCustomKeyboard();
  };

  const handleCustomKeyboardNext = () => {
    if (!customKeyboardTarget) return;
    const { exerciseId, setId, field } = customKeyboardTarget;
    
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (!exercise) {
      closeCustomKeyboard();
      return;
    }
    
    const setIndex = exercise.sets.findIndex(s => s.id === setId);
    if (setIndex === -1) {
      closeCustomKeyboard();
      return;
    }
    
    if (field === 'weight') {
      // Move to reps of the same set
      const set = exercise.sets[setIndex];
      setCustomKeyboardTarget({ exerciseId, setId, field: 'reps' });
      setCustomKeyboardValue(set.reps || '');
    } else if (field === 'reps') {
      // Move to weight of the next set
      if (setIndex < exercise.sets.length - 1) {
        const nextSet = exercise.sets[setIndex + 1];
        setCustomKeyboardTarget({ exerciseId, setId: nextSet.id, field: 'weight' });
        setCustomKeyboardValue(nextSet.weight || '');
      } else {
        // No more sets, close keyboard
        closeCustomKeyboard();
      }
    }
  };

  const handleDeleteSet = (exInstanceId, setId) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => ({
        ...ex,
        sets: ex.sets.filter(s => s.id !== setId)
      }))
    });
  };


  const [activeSetMenu, setActiveSetMenu] = useState(null); // { exerciseId, setId, top, left, originalTop }
  const [selectionMode, setSelectionMode] = useState(null); // { exerciseId, type: 'drop_set' }
  const [selectedSetIds, setSelectedSetIds] = useState(new Set());
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleSetNumberPress = (exerciseId, setId, pageX, pageY, width, height) => {
    // Close exercise-level popup if open
    setOptionsModalExId(null);

    // Get ScrollView position on screen
    scrollViewRef.current?.measure((x, y, scrollWidth, scrollHeight, pageX_scroll, pageY_scroll) => {
      // Calculate indexContainer position relative to ScrollView's visible viewport
      // pageY is absolute screen position, pageY_scroll is ScrollView's screen position
      // The difference gives us the position within the visible ScrollView area
      const visibleTop = pageY - pageY_scroll - 15;

      // Also calculate the position in the content (for scroll tracking)
      // This is the position if the ScrollView were at scroll position 0
      const contentTop = visibleTop + scrollOffset;

      // Position horizontally centered on indexContainer
      const popupLeft = (pageX - pageX_scroll) + width / 2 + 14;

      // Force popup re-mount and position it correctly
      setPopupKey(prev => prev + 1);
      setActiveSetMenu({
        exerciseId,
        setId,
        top: visibleTop,
        left: popupLeft,
        originalTop: contentTop
      });
    });
  };

  const handleSetMenuAction = (action) => {
    if (!activeSetMenu) return;
    const { exerciseId, setId } = activeSetMenu;
    
    if (action === 'warmup' || action === 'dropset' || action === 'failure') {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          const newSets = ex.sets.map(s => {
            if (s.id === setId) {
              const key = action === 'warmup' ? 'isWarmup' : action === 'dropset' ? 'isDropset' : 'isFailure';
              const isCurrentlyActive = s[key];
              
              // Create new set without any type flags
              const newSet = { ...s };
              delete newSet.isWarmup;
              delete newSet.isDropset;
              delete newSet.isFailure;
              
              // If it wasn't active, set it. If it was active, leave it cleared (toggle off)
              if (!isCurrentlyActive) {
                newSet[key] = true;
              }
              
              return newSet;
            }
            return s;
          });
          return { ...ex, sets: newSets };
        })
      });
      setActiveSetMenu(null);
    } else if (action === 'edit_group') {
      // Find the set and get all sets in its group (if any)
      const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
      const set = exercise?.sets?.find(s => s.id === setId);
      
      if (set?.dropSetId) {
        // Grouped set: Pre-populate selection with all sets in the group
        const groupSetIds = exercise.sets
          .filter(s => s.dropSetId === set.dropSetId)
          .map(s => s.id);
        
        // Check if all sets in the group have the same type
        const groupSets = exercise.sets.filter(s => s.dropSetId === set.dropSetId);
        const allWarmup = groupSets.length > 0 && groupSets.every(s => s.isWarmup);
        const allFailure = groupSets.length > 0 && groupSets.every(s => s.isFailure);
        
        // Initialize groupSetType with the current group type
        if (allWarmup) {
          setGroupSetType('warmup');
        } else if (allFailure) {
          setGroupSetType('failure');
        } else {
          setGroupSetType(null);
        }
        
        setSelectionMode({ exerciseId, type: 'drop_set', editingGroupId: set.dropSetId });
        setSelectedSetIds(new Set(groupSetIds));
      } else {
        // Ungrouped set: Pre-select just this set
        setSelectionMode({ exerciseId, type: 'drop_set', editingGroupId: null });
        setSelectedSetIds(new Set([setId]));
        setGroupSetType(null);
      }
      setActiveSetMenu(null);
    } else if (action === 'add_rest') {
      // Open rest timer input modal
      setRestPeriodSetInfo({ exerciseId, setId });
      setRestTimerInput('');
      setRestPeriodModalOpen(true);
      setActiveSetMenu(null);
    } else if (action === 'remove_rest') {
      // Remove rest period from this set
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
          ...ex,
          sets: ex.sets.map(s => {
            if (s.id === setId) {
              const { restPeriodSeconds, ...rest } = s;
              return rest;
            }
            return s;
          })
        }))
      });
      // Also cancel any active timer for this set
      if (activeRestTimer?.setId === setId) {
        setActiveRestTimer(null);
      }
      setActiveSetMenu(null);
    } else if (action === 'insert_set') {
      // Insert a new set immediately after this set
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          const currentSetIndex = ex.sets.findIndex(s => s.id === setId);
          if (currentSetIndex === -1) return ex;
          
          const currentSet = ex.sets[currentSetIndex];
          const newSet = {
            id: `s-${Date.now()}-${Math.random()}`,
            type: "Working",
            weight: currentSet.weight || "",
            reps: currentSet.reps || "",
            duration: currentSet.duration || "",
            distance: currentSet.distance || "",
            completed: false,
            // If current set is part of a dropset, include the new set in the same dropset
            ...(currentSet.dropSetId && { dropSetId: currentSet.dropSetId }),
            // Copy set type (warmup/failure)
            ...(currentSet.isWarmup && { isWarmup: true }),
            ...(currentSet.isFailure && { isFailure: true }),
            // Copy rest timer if present
            ...(currentSet.restPeriodSeconds && { restPeriodSeconds: currentSet.restPeriodSeconds })
          };
          
          // Insert the new set after the current set
          const newSets = [...ex.sets];
          newSets.splice(currentSetIndex + 1, 0, newSet);
          
          return { ...ex, sets: newSets };
        })
      });
      setActiveSetMenu(null);
    }
  };

  // Handle adding rest period to a set
  const handleAddRestPeriod = () => {
    if (!restPeriodSetInfo) return;
    const { exerciseId, setId } = restPeriodSetInfo;
    const seconds = parseRestTimeInput(restTimerInput);
    
    if (seconds <= 0) return;
    
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds } : s)
      }))
    });
    
    setRestPeriodModalOpen(false);
    setRestPeriodSetInfo(null);
    setRestTimerInput('');
  };

  const handleToggleSetSelection = (setId, isAddToGroupAction = false) => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    const set = exercise?.sets?.find(s => s.id === setId);
    
    // If this is an "add to group" action (clicking + icon)
    if (isAddToGroupAction && set?.dropSetId) {
      const targetGroupId = set.dropSetId;
      
      if (!editingGroupId) {
        // Ungrouped set: Add the originally selected set to this group and move it to the end of the group
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            // First, mark the sets with the new group ID
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });
            
            // Then reorder: remove the newly added sets and insert them at the end of the target group
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });
            
            // Find the last index of the target group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }
            
            // Insert the moved sets after the last set in the target group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }
            
            return { ...ex, sets: setsWithoutMoved };
          })
        });
        
        // Close selection mode
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      } else {
        // Grouped set: Move SELECTED (checked) sets from current group to target group
        // Unselected sets remain in the original group
        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
            // First, mark the sets with the new group ID
            const updatedSets = ex.sets.map(s => {
              if (selectedSetIds.has(s.id)) {
                // Move selected sets to target group
                return { ...s, dropSetId: targetGroupId };
              }
              return s;
            });
            
            // Then reorder: remove the moved sets and insert them at the end of the target group
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedSetIds.has(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });
            
            // Find the last index of the target group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === targetGroupId) {
                lastGroupIndex = i;
                break;
              }
            }
            
            // Insert the moved sets after the last set in the target group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }
            
            return { ...ex, sets: setsWithoutMoved };
          })
        });
        
        // Close selection mode
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        return;
      }
    }
    
    // Regular checkbox toggle behavior
    const newSelectedIds = new Set(selectedSetIds);
    
    if (editingGroupId) {
      // Editing a grouped set - can toggle sets in that group AND ungrouped sets
      if (set?.dropSetId === editingGroupId || !set?.dropSetId) {
        if (newSelectedIds.has(setId)) {
          newSelectedIds.delete(setId);
        } else {
          newSelectedIds.add(setId);
        }
      }
    } else {
      // Creating a new group from ungrouped sets - only toggle ungrouped sets
      if (!set?.dropSetId) {
        if (newSelectedIds.has(setId)) {
          newSelectedIds.delete(setId);
        } else {
          newSelectedIds.add(setId);
        }
      }
    }
    
    setSelectedSetIds(newSelectedIds);
  };

  const handleSubmitDropSet = () => {
    if (!selectionMode) return;
    const { exerciseId, editingGroupId } = selectionMode;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);

    if (editingGroupId) {
      // Editing existing group
      const originalGroupSetIds = exercise.sets
        .filter(s => s.dropSetId === editingGroupId)
        .map(s => s.id);
      
      // Find sets that were deselected from the group (need to be ungrouped)
      const deselectedSetIds = originalGroupSetIds.filter(id => !selectedSetIds.has(id));
      
      // Find ungrouped sets that were selected (need to be added to the group)
      const selectedUngroupedSetIds = Array.from(selectedSetIds).filter(id => {
        const set = exercise.sets.find(s => s.id === id);
        return set && !set.dropSetId;
      });
      
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          // Update the group membership and apply group set type
          let updatedSets = ex.sets.map(s => {
            let updatedSet = { ...s };
            let willBeInGroup = false;
            
            if (s.dropSetId === editingGroupId && !selectedSetIds.has(s.id)) {
              // Remove from group (was deselected)
              delete updatedSet.dropSetId;
              willBeInGroup = false;
            } else if (s.dropSetId === editingGroupId && selectedSetIds.has(s.id)) {
              // Stay in group (still selected)
              willBeInGroup = true;
            } else if (!s.dropSetId && selectedSetIds.has(s.id)) {
              // Add to group (ungrouped set that was selected)
              updatedSet.dropSetId = editingGroupId;
              willBeInGroup = true;
            }
            
            // Apply or remove group set type for all sets that will be in the group
            if (willBeInGroup) {
              if (groupSetType) {
                // Clear previous type flags and set the new one
                delete updatedSet.isWarmup;
                delete updatedSet.isDropset;
                delete updatedSet.isFailure;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                updatedSet[typeKey] = true;
              } else {
                // groupSetType is null, remove all type flags from sets in the group
                delete updatedSet.isWarmup;
                delete updatedSet.isDropset;
                delete updatedSet.isFailure;
              }
            }
            
            return updatedSet;
          });
          
          // Move newly added ungrouped sets to the end of the group
          if (selectedUngroupedSetIds.length > 0) {
            const setsToMove = [];
            const setsWithoutMoved = updatedSets.filter(s => {
              if (selectedUngroupedSetIds.includes(s.id)) {
                setsToMove.push(s);
                return false;
              }
              return true;
            });
            
            // Find the last index of the edited group
            let lastGroupIndex = -1;
            for (let i = setsWithoutMoved.length - 1; i >= 0; i--) {
              if (setsWithoutMoved[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }
            
            // Insert the newly added sets at the end of the group
            if (lastGroupIndex !== -1) {
              setsWithoutMoved.splice(lastGroupIndex + 1, 0, ...setsToMove);
            }
            
            updatedSets = setsWithoutMoved;
          }
          
          // If there are deselected sets, reorder them to appear right after the group
          if (deselectedSetIds.length > 0) {
            // Find the last index of any set in the edited group
            let lastGroupIndex = -1;
            for (let i = updatedSets.length - 1; i >= 0; i--) {
              if (updatedSets[i].dropSetId === editingGroupId) {
                lastGroupIndex = i;
                break;
              }
            }
            
            if (lastGroupIndex !== -1) {
              // Remove deselected sets from their current positions
              const deselectedSets = [];
              const setsWithoutDeselected = updatedSets.filter(s => {
                if (deselectedSetIds.includes(s.id)) {
                  deselectedSets.push(s);
                  return false;
                }
                return true;
              });
              
              // Find the new position to insert (after the group)
              let insertIndex = -1;
              for (let i = setsWithoutDeselected.length - 1; i >= 0; i--) {
                if (setsWithoutDeselected[i].dropSetId === editingGroupId) {
                  insertIndex = i + 1;
                  break;
                }
              }
              
              // Insert deselected sets after the group
              if (insertIndex !== -1) {
                setsWithoutDeselected.splice(insertIndex, 0, ...deselectedSets);
              }
              
              return { ...ex, sets: setsWithoutDeselected };
            }
          }
          
          return { ...ex, sets: updatedSets };
        })
      });
    } else {
      // Creating new group from ungrouped sets
      if (selectedSetIds.size < 2) {
        // Need at least 2 sets to create a group
        setSelectionMode(null);
        setSelectedSetIds(new Set());
        setGroupSetType(null);
        return;
      }
      
      const dropSetId = Date.now().toString();
      
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          // First, separate selected and non-selected sets
          const selectedSets = [];
          const nonSelectedSets = [];
          
          ex.sets.forEach(s => {
            if (selectedSetIds.has(s.id)) {
              let newSet = { ...s, dropSetId };
              
              // Apply group set type if selected
              if (groupSetType) {
                delete newSet.isWarmup;
                delete newSet.isDropset;
                delete newSet.isFailure;
                const typeKey = groupSetType === 'warmup' ? 'isWarmup' : groupSetType === 'dropset' ? 'isDropset' : 'isFailure';
                newSet[typeKey] = true;
              }
              
              selectedSets.push(newSet);
            } else {
              nonSelectedSets.push(s);
            }
          });
          
          // Find the position of the first selected set in the original array
          const firstSelectedIndex = ex.sets.findIndex(s => selectedSetIds.has(s.id));
          
          // Insert all selected sets at the position of the first selected set
          const newSets = [...nonSelectedSets];
          newSets.splice(firstSelectedIndex, 0, ...selectedSets);
          
          return { ...ex, sets: newSets };
        })
      });
    }
    
    setSelectionMode(null);
    setSelectedSetIds(new Set());
    setGroupSetType(null);
  };

  const handleCancelDropSet = () => {
    setSelectionMode(null);
    setSelectedSetIds(new Set());
    setGroupSetType(null);
  };

  const handleFinish = () => {
    finishWorkout();
    navigation.goBack();
  };

  const handleCancel = () => {
    if (currentWorkout.exercises.length > 0) {
      setCancelModalOpen(true);
    } else {
      cancelWorkout();
      navigation.goBack();
    }
  };

  const confirmCancel = () => {
    cancelWorkout();
    setCancelModalOpen(false);
    navigation.goBack();
  };

  // Exercise Options Handlers
  const handleOpenOptions = (instanceId, event) => {
    const { pageY } = event.nativeEvent;
    
    // Close set-level popup if open
    setActiveSetMenu(null);
    
    // Get ScrollView position on screen
    scrollViewRef.current?.measure((x, y, scrollWidth, scrollHeight, pageX_scroll, pageY_scroll) => {
      // Calculate button position relative to ScrollView's visible viewport
      // pageY is absolute screen position, pageY_scroll is ScrollView's screen position
      // The difference gives us the position within the visible ScrollView area
      const visibleTop = pageY - pageY_scroll;
      
      // Also calculate the position in the content (for scroll tracking)
      // This is the position if the ScrollView were at scroll position 0
      const contentTop = visibleTop + scrollOffset;
      
      setDropdownPos({ top: visibleTop, right: 16, originalTop: contentTop });
      setOptionsModalExId(instanceId);
    });
  };

  const handleDeleteExercise = (instanceId) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: deleteExerciseDeep(currentWorkout.exercises, instanceId)
    });
    setOptionsModalExId(null);
  };

  const handleReplaceExercise = (instanceId) => {
    setReplacingExerciseId(instanceId);
    setOptionsModalExId(null);
    setShowPicker(true);
  };

  const handleToggleUnit = (instanceId) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, instanceId, (ex) => {
        const isKg = ex.weightUnit === 'kg';
        const newUnit = isKg ? 'lbs' : 'kg';
        
        const convert = (val) => {
          if (val === "" || val === null || val === undefined) return val;
          const num = parseFloat(val);
          if (isNaN(num)) return val;
          // kg -> lbs: * 2.20462
          // lbs -> kg: / 2.20462
          const result = isKg ? num * 2.20462 : num / 2.20462;
          return parseFloat(result.toFixed(1)).toString();
        };

        return {
          ...ex,
          weightUnit: newUnit,
          sets: ex.sets.map(s => ({
            ...s,
            weight: ex.category === 'Lifts' ? convert(s.weight) : s.weight
          }))
        };
      })
    });
    setOptionsModalExId(null);
  };

  const handleOpenExerciseNote = (instanceId) => {
    setCurrentExerciseNote("");
    setReplacingExerciseId(instanceId); 
    setExerciseNoteModalOpen(true);
    setOptionsModalExId(null);
  };

  const handleSaveExerciseNote = () => {
    if (replacingExerciseId && currentExerciseNote.trim()) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, replacingExerciseId, (ex) => ({
          ...ex,
          notes: [
            { id: `note-${Date.now()}`, text: currentExerciseNote, date: new Date().toISOString().split('T')[0], pinned: false },
            ...(ex.notes || [])
          ]
        }))
      });
      // Auto-expand notes for this exercise
      setExpandedExerciseNotes(prev => ({ ...prev, [replacingExerciseId]: true }));
    }
    setExerciseNoteModalOpen(false);
    setReplacingExerciseId(null);
    setCurrentExerciseNote("");
  };

  const handlePinExerciseNote = (exId, noteId) => {
    const exercise = findExerciseDeep(currentWorkout.exercises, exId);
    if (!exercise) return;
    
    // Update the workout
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => {
        const updatedNotes = (ex.notes || []).map(n => 
          n.id === noteId ? { ...n, pinned: !n.pinned } : n
        );
        
        // If pinning, also save to library
        const pinnedNote = updatedNotes.find(n => n.id === noteId);
        if (pinnedNote && pinnedNote.pinned && ex.exerciseId) {
          // Get current pinned notes from library
          const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
          const currentPinnedNotes = libraryExercise?.pinnedNotes || [];
          
          // Add this note to library's pinned notes
          updateExerciseInLibrary(ex.exerciseId, {
            pinnedNotes: [...currentPinnedNotes, pinnedNote]
          });
        } else if (pinnedNote && !pinnedNote.pinned && ex.exerciseId) {
          // If unpinning, remove from library
          const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
          const currentPinnedNotes = libraryExercise?.pinnedNotes || [];
          
          updateExerciseInLibrary(ex.exerciseId, {
            pinnedNotes: currentPinnedNotes.filter(n => n.id !== noteId)
          });
        }
        
        return {
          ...ex,
          notes: updatedNotes
        };
      })
    });
  };

  const handleRemoveExerciseNote = (exId, noteId) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => ({
        ...ex,
        notes: (ex.notes || []).filter(n => n.id !== noteId)
      }))
    });
  };

  const handleUpdateExerciseNote = (exId, updatedNote) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => ({
        ...ex,
        notes: (ex.notes || []).map(n => n.id === updatedNote.id ? updatedNote : n)
      }))
    });
  };

  const toggleExerciseNotes = (exId) => {
    setExpandedExerciseNotes(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  // --- Superset Handlers ---

  const handleEditSuperset = (exerciseId) => {
    setOptionsModalExId(null);
    const superset = findExerciseSuperset(currentWorkout.exercises, exerciseId);
    
    if (superset) {
      // Exercise is already in a superset - pre-select all exercises in that superset
      const selectedIds = new Set(superset.children.map(child => child.instanceId));
      setSupersetSelectionMode({ exerciseId, mode: 'edit', supersetId: superset.instanceId });
      setSelectedExerciseIds(selectedIds);
    } else {
      // Exercise is NOT in a superset - start fresh selection with just this exercise
      setSupersetSelectionMode({ exerciseId, mode: 'create' });
      setSelectedExerciseIds(new Set([exerciseId]));
    }
  };

  const handleAddToSpecificSuperset = (exerciseId, supersetId) => {
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (exercise) {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, supersetId, (group) => ({
          ...group,
          children: [...(group.children || []), exercise]
        })).filter(ex => ex.instanceId !== exerciseId) // Remove from original position
      });
    }
    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  const handleToggleSupersetSelection = (exerciseId) => {
    if (!supersetSelectionMode) return;
    
    const newSelectedIds = new Set(selectedExerciseIds);
    
    if (newSelectedIds.has(exerciseId)) {
      newSelectedIds.delete(exerciseId);
    } else {
      newSelectedIds.add(exerciseId);
    }
    
    setSelectedExerciseIds(newSelectedIds);
  };

  const handleConfirmSupersetSelection = () => {
    if (!supersetSelectionMode) return;

    const { mode, exerciseId, supersetId } = supersetSelectionMode;

    if (mode === 'edit' && supersetId) {
      // Editing existing superset
      const superset = currentWorkout.exercises.find(ex => ex.instanceId === supersetId);
      if (!superset) return;

      const originalExercises = superset.children || [];
      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter(ex => ex);
      
      // Find exercises that were unselected (removed from superset)
      const unselectedExercises = originalExercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );

      if (selectedExercises.length <= 1) {
        // Dissolve the superset if only 1 or 0 exercises remain selected
        // Place all exercises (selected + unselected) as standalone after the superset position
        const newExercises = currentWorkout.exercises.reduce((acc, item) => {
          if (item.instanceId === supersetId) {
            return [...acc, ...selectedExercises, ...unselectedExercises];
          }
          return [...acc, item];
        }, []);
        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      } else {
        // Update the superset with new selection
        // Place unselected exercises immediately after the superset
        const newExercises = currentWorkout.exercises
          .reduce((acc, item) => {
            if (item.instanceId === supersetId) {
              // Update superset with only selected exercises
              return [...acc, { ...item, children: selectedExercises }, ...unselectedExercises];
            }
            return [...acc, item];
          }, [])
          .filter(ex => {
            // Remove standalone exercises that are now in the superset
            if (ex.type === 'exercise' && selectedExerciseIds.has(ex.instanceId)) {
              return false;
            }
            return true;
          });
        
        handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
      }
    } else if (mode === 'create') {
      // Creating new superset
      if (selectedExerciseIds.size < 2) {
        // Need at least 2 exercises for a superset
        setSupersetSelectionMode(null);
        setSelectedExerciseIds(new Set());
        return;
      }

      const selectedExercises = Array.from(selectedExerciseIds)
        .map(id => findExerciseDeep(currentWorkout.exercises, id))
        .filter(ex => ex);

      const newSuperset = {
        instanceId: `group-${Date.now()}`,
        type: 'group',
        groupType: 'Superset',
        children: selectedExercises
      };

      const newExercises = currentWorkout.exercises.filter(
        ex => !selectedExerciseIds.has(ex.instanceId)
      );
      
      // Insert superset at the position of the first selected exercise
      const firstSelectedId = Array.from(selectedExerciseIds)[0];
      const insertIndex = currentWorkout.exercises.findIndex(ex => ex.instanceId === firstSelectedId);
      newExercises.splice(insertIndex >= 0 ? insertIndex : 0, 0, newSuperset);

      handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
    }

    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  const handleCancelSupersetSelection = () => {
    setSupersetSelectionMode(null);
    setSelectedExerciseIds(new Set());
  };

  // --- Move Mode Handlers ---

  const handleStartMove = (itemId) => {
    if (!isMoveMode) {
      setOriginalExercisesSnapshot(currentWorkout.exercises);
      setIsMoveMode(true);
    }
    setMovingItemId(itemId);
  };

  const handleCancelMove = () => {
    if (originalExercisesSnapshot) {
      handleWorkoutUpdate({ ...currentWorkout, exercises: originalExercisesSnapshot });
    }
    setIsMoveMode(false);
    setMovingItemId(null);
    setOriginalExercisesSnapshot(null);
  };

  const handleDoneMove = () => {
    setIsMoveMode(false);
    setMovingItemId(null);
    setOriginalExercisesSnapshot(null);
  };

  const handleMoveItem = (targetIndex, forceInsideGroup = false) => {
    if (!movingItemId) return;

    const flatRows = flattenExercises(currentWorkout.exercises);
    const movingRowIndex = flatRows.findIndex(r => r.id === movingItemId);
    if (movingRowIndex === -1) return;

    const movingRow = flatRows[movingRowIndex];
    
    // Calculate block size (1 for exercise, 1 + children for group)
    let blockSize = 1;
    if (movingRow.type === 'group_header') {
      blockSize += (movingRow.data.children ? movingRow.data.children.length : 0);
    }

    // Adjust targetIndex if we are moving forward in the list
    // Because removing the item will shift subsequent indices down
    let insertIndex = targetIndex;
    if (insertIndex > movingRowIndex) {
      insertIndex -= blockSize;
    }

    // Remove from old position
    const newFlatRows = [...flatRows];
    
    // Determine new depth based on drop location (using newFlatRows BEFORE removal for context? No, AFTER removal)
    // But we need context of where we are dropping.
    // If we remove first, indices shift.
    // Let's look at `newFlatRows` AFTER removal.
    
    // Remove the block
    const rowsToMove = newFlatRows.splice(movingRowIndex, blockSize);
    const mainMovingRow = rowsToMove[0];

    // Determine new depth based on drop location in the NEW list
    let newDepth = 0;
    let newGroupId = null;

    if (insertIndex > 0) {
      const prevRow = newFlatRows[insertIndex - 1];
      if (forceInsideGroup) {
        if (prevRow.type === 'group_header') {
           newDepth = 1;
           newGroupId = prevRow.id;
        } else if (prevRow.type === 'exercise' && prevRow.depth === 1) {
           newDepth = 1;
           newGroupId = prevRow.groupId;
        }
      } else {
        if (prevRow.type === 'group_header') {
          newDepth = 1;
          newGroupId = prevRow.id;
        } else if (prevRow.type === 'exercise' && prevRow.depth === 1) {
          newDepth = 1;
          newGroupId = prevRow.groupId;
        }
      }
    }
    
    if (!forceInsideGroup && insertIndex > 0) {
       const prevRow = newFlatRows[insertIndex - 1];
       if (prevRow.type === 'exercise' && prevRow.depth === 1) {
          newDepth = 0;
          newGroupId = null;
       }
    }
      
    // Update depth for moved rows
    rowsToMove.forEach(r => {
      if (r.type === 'group_header') {
          r.depth = 0;
          r.groupId = null;
      } else if (r.type === 'exercise') {
          // If it's the main moving row (single exercise), update its depth
          if (r === mainMovingRow) {
             r.depth = newDepth;
             r.groupId = newGroupId;
          }
          // If it's a child of a moving group, it keeps its relative depth (1)
          // But wait, if we move a group, `mainMovingRow` is header.
          // Children are subsequent rows.
          // We don't need to update children depth/groupId if they are still children of the header.
          // `reconstructExercises` handles hierarchy based on header + children sequence.
      }
    });
      
    newFlatRows.splice(insertIndex, 0, ...rowsToMove);

    const newExercises = reconstructExercises(newFlatRows);
    handleWorkoutUpdate({ ...currentWorkout, exercises: newExercises });
  };

  const hasExercises = currentWorkout.exercises.length > 0;

  const renderExerciseCard = (ex, isGroupChild = false, isLastChild = false, isFirstChild = false) => {
    const historyEntries = exerciseStats[ex.exerciseId]?.history || [];

    // Helper function to compute indices for historical sets
    const computeHistoricalIndices = (historicalSets) => {
      const indices = [];
      let warmupGroupNum = 0;
      let workingGroupNum = 0;
      const seenWarmupGroups = new Set();
      const seenWorkingGroups = new Set();
      
      for (let i = 0; i < historicalSets.length; i++) {
        const s = historicalSets[i];
        let warmupIdx = null;
        let workingIdx = null;
        
        if (s.isWarmup) {
          if (s.dropSetId) {
            if (!seenWarmupGroups.has(s.dropSetId)) {
              seenWarmupGroups.add(s.dropSetId);
              warmupGroupNum++;
            }
            // Find sub-index within warmup dropset
            const warmupGroupSets = historicalSets.filter(hs => hs.dropSetId === s.dropSetId && hs.isWarmup);
            const subIdx = warmupGroupSets.findIndex(hs => hs === s) + 1;
            warmupIdx = { group: warmupGroupNum, subIndex: subIdx };
          } else {
            warmupGroupNum++;
            warmupIdx = { group: warmupGroupNum, subIndex: null };
          }
        } else {
          if (s.dropSetId) {
            if (!seenWorkingGroups.has(s.dropSetId)) {
              seenWorkingGroups.add(s.dropSetId);
              workingGroupNum++;
            }
            // Find sub-index within working dropset
            const workingGroupSets = historicalSets.filter(hs => hs.dropSetId === s.dropSetId && !hs.isWarmup);
            const subIdx = workingGroupSets.findIndex(hs => hs === s) + 1;
            workingIdx = { group: workingGroupNum, subIndex: subIdx };
          } else {
            workingGroupNum++;
            workingIdx = { group: workingGroupNum, subIndex: null };
          }
        }
        
        indices.push({ set: s, warmupIndex: warmupIdx, workingIndex: workingIdx });
      }
      
      return indices;
    };
    
    // Smart lookup function to find matching previous set data
    const getPreviousSetData = (currentSet, currentWarmupIndex, currentWorkingIndex) => {
      // Iterate through all history entries (most recent first)
      for (let histIdx = 0; histIdx < historyEntries.length; histIdx++) {
        const histEntry = historyEntries[histIdx];
        const isFromOlderHistory = histIdx > 0;
        
        // Compute indices for this history entry's sets
        const indexedSets = computeHistoricalIndices(histEntry.sets);
        
        // Find a matching set based on whether current set is warmup or not
        if (currentWarmupIndex) {
          // Looking for a warmup set at the same warmup index
          const match = indexedSets.find(indexed => {
            if (!indexed.warmupIndex) return false;
            if (indexed.warmupIndex.group !== currentWarmupIndex.group) return false;
            // For warmup dropsets, match by subIndex
            if (currentWarmupIndex.subIndex !== null) {
              return indexed.warmupIndex.subIndex === currentWarmupIndex.subIndex;
            }
            // For individual warmup sets, match if both are individual (subIndex null)
            return indexed.warmupIndex.subIndex === null;
          });
          
          if (match) {
            return { ...match.set, isFromOlderHistory };
          }
        } else if (currentWorkingIndex) {
          // Looking for a working set at the same working index
          const match = indexedSets.find(indexed => {
            if (!indexed.workingIndex) return false;
            if (indexed.workingIndex.group !== currentWorkingIndex.group) return false;
            
            // For dropsets, match by subIndex
            if (currentWorkingIndex.subIndex !== null) {
              // First dropset set (subIndex 1) can match individual set (subIndex null) OR dropset first
              if (currentWorkingIndex.subIndex === 1) {
                return indexed.workingIndex.subIndex === 1 || indexed.workingIndex.subIndex === null;
              }
              // Other subIndices must match exactly
              return indexed.workingIndex.subIndex === currentWorkingIndex.subIndex;
            }
            
            // For individual working sets, can match individual OR first of dropset
            return indexed.workingIndex.subIndex === null || indexed.workingIndex.subIndex === 1;
          });
          
          if (match) {
            return { ...match.set, isFromOlderHistory };
          }
        }
      }
      
      return null;
    };
    
    // Helper to convert weight units for previous set
    const convertPreviousSet = (prevSet) => {
      if (!prevSet) return null;
      
      // If current unit is kg, convert previous (assumed lbs) to kg
      if (ex.weightUnit === 'kg' && ex.category === 'Lifts' && prevSet.weight) {
        const val = parseFloat(prevSet.weight);
        if (!isNaN(val)) {
          return {
            ...prevSet,
            weight: (val / 2.20462).toFixed(1)
          };
        }
      }
      return prevSet;
    };

    const isMoving = isMoveMode && movingItemId === ex.instanceId;
    const isNotMoving = isMoveMode && !isMoving;

    const cardContent = (
      <TouchableOpacity 
        key={ex.instanceId} 
        activeOpacity={1}
        onLongPress={() => handleStartMove(ex.instanceId)}
        onPress={() => {
          if (isMoveMode) {
             const flatRows = flattenExercises(currentWorkout.exercises);
             const idx = flatRows.findIndex(r => r.id === ex.instanceId);
             if (idx !== -1) handleMoveItem(idx);
          }
        }}
        style={[
          styles.exerciseCard, 
          !isMoveMode && styles.exerciseCard__notMoveMode,
          isMoveMode && styles.exerciseCard__moveMode,
          isMoveMode && isNotMoving && styles.exerciseCard__moveMode__notSelected,
          isMoveMode && isMoving && styles.exerciseCard__moveMode__selected,
          isGroupChild && styles.exerciseCard__groupChild,
          isMoveMode && isGroupChild && isNotMoving && styles.exerciseCard__groupChild__moveMode__notSelected,
          isMoveMode && isGroupChild && isMoving && styles.exerciseCard__groupChild__moveMode__selected,
          isLastChild && !isMoveMode && styles.exerciseCard__groupChild__lastChild
        ]}
      >
         <View style={[
           styles.exerciseHeader,
           !isMoveMode && styles.exerciseHeader__notMoveMode,
           isMoveMode && !isMoving && styles.exerciseHeader__moveMode__notSelected,
           isMoveMode && isMoving && styles.exerciseHeader__moveMode__selected,
           isGroupChild && styles.exerciseHeader__groupChild,
           isGroupChild && isMoving && styles.exerciseHeader__groupChild__moving,
           isGroupChild && !isMoving && styles.exerciseHeader__groupChild__notMoving
         ]}>
            <View style={styles.exerciseHeaderContent}>
              <View style={styles.exerciseHeaderRow}>
                <View style={styles.exerciseHeaderLeft}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                    {!isMoveMode && (
                      <View style={styles.exerciseHeaderIcons}>
                        <TouchableOpacity 
                          onPress={() => {
                            if (!ex.notes || ex.notes.length === 0) {
                              handleOpenExerciseNote(ex.instanceId);
                            } else {
                              toggleExerciseNotes(ex.instanceId);
                            }
                          }}
                          style={styles.noteIconButton}
                        >
                          <FileText 
                            size={16} 
                            color={
                              (!ex.notes || ex.notes.length === 0) 
                                ? COLORS.slate[400] 
                                : (ex.notes.some(n => n.pinned) ? COLORS.amber[500] : COLORS.blue[500])
                            } 
                            fill="transparent"
                          />
                        </TouchableOpacity>
                        
                        {expandedExerciseNotes[ex.instanceId] && (
                          <TouchableOpacity 
                            onPress={() => toggleExerciseNotes(ex.instanceId)}
                            style={styles.addNewNoteButton}
                          >
                            <ChevronDown size={14} color={COLORS.slate[500]} style={{ transform: [{ rotate: '180deg' }] }} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {!isMoveMode && !expandedExerciseNotes[ex.instanceId] && !readOnly && (
                  <View style={styles.exerciseHeaderActions}>
                      <TouchableOpacity 
                        onPress={() => handleAddSet(ex.instanceId)}
                        style={styles.addSetHeaderButton}
                      >
                        <Text style={[
                          styles.addSetHeaderText,
                          isGroupChild && styles.addSetHeaderText__groupChild
                        ]}>+ Set</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={(e) => handleOpenOptions(ex.instanceId, e)} style={styles.optionsButton}>
                        <MoreVertical size={20} color={COLORS.slate[400]} />
                      </TouchableOpacity>
                  </View>
                )}
              </View>

              {!isMoveMode && expandedExerciseNotes[ex.instanceId] && ex.notes && ex.notes.length > 0 && (
                <View style={styles.expandedNotesContainer}>
                  {[...ex.notes].sort((a, b) => { 
                    if (a.pinned && !b.pinned) return -1; 
                    if (!a.pinned && b.pinned) return 1; 
                    return 0; 
                  }).map((note) => (
                    <SavedNoteItem 
                      key={note.id} 
                      note={note} 
                      onPin={(noteId) => handlePinExerciseNote(ex.instanceId, noteId)} 
                      onRemove={(noteId) => handleRemoveExerciseNote(ex.instanceId, noteId)}
                      onUpdate={(updatedNote) => handleUpdateExerciseNote(ex.instanceId, updatedNote)}
                    />
                  ))}

                  <View style={styles.expandedNotesActions}>
                      <View style={styles.expandedNotesLeftActions}>
                        <TouchableOpacity 
                          onPress={() => handleOpenExerciseNote(ex.instanceId)}
                          style={styles.exerciseAddNoteButton}
                        >
                          <Text style={styles.exerciseAddNoteButtonText}>Add note</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          onPress={() => toggleExerciseNotes(ex.instanceId)}
                          style={styles.hideNotesButton}
                        >
                          <Text style={styles.hideNotesText}>Hide notes</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.expandedNotesRightActions}>
                        <TouchableOpacity 
                          onPress={() => handleAddSet(ex.instanceId)}
                          style={styles.addSetHeaderButton}
                        >
                          <Text style={[
                            styles.addSetHeaderText,
                            isGroupChild && styles.addSetHeaderText__groupChild
                          ]}>+Set</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={(e) => handleOpenOptions(ex.instanceId, e)} style={styles.optionsButton}>
                          <MoreVertical size={20} color={COLORS.slate[400]} />
                        </TouchableOpacity>
                      </View>
                  </View>
                </View>
              )}
            </View>
         </View>
         {!isMoveMode && (
         <View style={styles.exerciseContent}>
            <View style={styles.columnHeaders}>
               <View style={styles.colIndex}><Text style={styles.colHeaderText}>Set</Text></View>
               <View style={styles.colPrevious}><Text style={styles.colHeaderText}>Previous</Text></View>
               <View style={styles.colInputs}>
                  <Text style={styles.colHeaderText}>
                    {ex.category === "Lifts" ? `Weight (${ex.weightUnit || 'lbs'})` : "Time"}
                  </Text>
                  <Text style={styles.colHeaderText}>{ex.category === "Lifts" ? "Reps" : "Dist/Reps"}</Text>
               </View>
               <View style={styles.colCheck}><Text style={styles.colHeaderText}>✓</Text></View>
            </View>
            <View style={styles.setsContainer}>
              {ex.sets.map((set, idx) => {
                // Calculate separate indices for warmup vs working sets
                // Warmups are indexed separately: 1.1w, 1.2w, 2.1w, 2.2w, etc.
                // Working sets are indexed separately: 1, 2, 3 or 1.1, 1.2 for dropsets
                
                let warmupIndex = null;  // { group: number, subIndex: number | null }
                let workingIndex = null; // { group: number, subIndex: number | null }
                
                // Track seen groups for warmups and working sets separately
                let warmupGroupNum = 0;
                let workingGroupNum = 0;
                const seenWarmupGroups = new Set();
                const seenWorkingGroups = new Set();
                
                // First pass: count all groups/sets before this index
                for (let i = 0; i < idx; i++) {
                  const s = ex.sets[i];
                  if (s.isWarmup) {
                    if (s.dropSetId) {
                      if (!seenWarmupGroups.has(s.dropSetId)) {
                        seenWarmupGroups.add(s.dropSetId);
                        warmupGroupNum++;
                      }
                    } else {
                      warmupGroupNum++;
                    }
                  } else {
                    if (s.dropSetId) {
                      if (!seenWorkingGroups.has(s.dropSetId)) {
                        seenWorkingGroups.add(s.dropSetId);
                        workingGroupNum++;
                      }
                    } else {
                      workingGroupNum++;
                    }
                  }
                }
                
                // Now calculate the index for the current set
                if (set.isWarmup) {
                  if (set.dropSetId) {
                    if (!seenWarmupGroups.has(set.dropSetId)) {
                      warmupGroupNum++;
                    }
                    // Find all warmup sets in this dropset group
                    const warmupGroupSets = ex.sets.filter(s => s.dropSetId === set.dropSetId && s.isWarmup);
                    const subIdx = warmupGroupSets.findIndex(s => s.id === set.id) + 1;
                    warmupIndex = { group: warmupGroupNum, subIndex: subIdx };
                  } else {
                    warmupGroupNum++;
                    warmupIndex = { group: warmupGroupNum, subIndex: null };
                  }
                } else {
                  if (set.dropSetId) {
                    if (!seenWorkingGroups.has(set.dropSetId)) {
                      workingGroupNum++;
                    }
                    // Find all non-warmup sets in this dropset group
                    const workingGroupSets = ex.sets.filter(s => s.dropSetId === set.dropSetId && !s.isWarmup);
                    const subIdx = workingGroupSets.findIndex(s => s.id === set.id) + 1;
                    workingIndex = { group: workingGroupNum, subIndex: subIdx };
                  } else {
                    workingGroupNum++;
                    workingIndex = { group: workingGroupNum, subIndex: null };
                  }
                }
                
                // Legacy values for backward compatibility (groupSetNumber, indexInGroup, overallSetNumber)
                let overallSetNumber = 0;
                let groupSetNumber = null;
                let indexInGroup = null;
                const seenGroupIds = new Set();
                
                for (let i = 0; i < idx; i++) {
                  if (ex.sets[i].dropSetId) {
                    if (!seenGroupIds.has(ex.sets[i].dropSetId)) {
                      seenGroupIds.add(ex.sets[i].dropSetId);
                      overallSetNumber++;
                    }
                  } else {
                    overallSetNumber++;
                  }
                }
                
                if (set.dropSetId) {
                  if (!seenGroupIds.has(set.dropSetId)) {
                    overallSetNumber++;
                  }
                  groupSetNumber = overallSetNumber;
                  const groupSets = ex.sets.filter(s => s.dropSetId === set.dropSetId);
                  indexInGroup = groupSets.findIndex(s => s.id === set.id) + 1;
                } else {
                  overallSetNumber++;
                }
                
                // Determine the group bar color type
                // If in selection mode editing this group, use the temporary groupSetType state
                // Otherwise, check if ALL sets in the group have the SAME type (indicating group-level type)
                let displayGroupSetType = null;
                if (set.dropSetId) {
                  if (selectionMode?.exerciseId === ex.instanceId && selectionMode?.editingGroupId === set.dropSetId && groupSetType) {
                    displayGroupSetType = groupSetType;
                  } else {
                    // Check if ALL sets in this group have the same type flag
                    const groupSetsForType = ex.sets.filter(s => s.dropSetId === set.dropSetId);
                    const allWarmup = groupSetsForType.length > 0 && groupSetsForType.every(s => s.isWarmup);
                    const allDropset = groupSetsForType.length > 0 && groupSetsForType.every(s => s.isDropset);
                    const allFailure = groupSetsForType.length > 0 && groupSetsForType.every(s => s.isFailure);
                    
                    if (allWarmup) displayGroupSetType = 'warmup';
                    else if (allDropset) displayGroupSetType = 'dropset';
                    else if (allFailure) displayGroupSetType = 'failure';
                  }
                }
                
                // Get the previous set data with smart lookup
                const previousData = getPreviousSetData(set, warmupIndex, workingIndex);
                
                // Determine if rest timer should show after this set
                const showRestTimer = set.restPeriodSeconds && !readOnly;
                const isRestTimerActive = activeRestTimer?.setId === set.id;
                
                return (
                  <React.Fragment key={set.id}>
                    <WorkoutSetRow index={idx} set={set} category={ex.category}
                      weightUnit={ex.weightUnit}
                      previousSet={previousData ? convertPreviousSet(previousData) : null}
                      previousSetIsFromOlderHistory={previousData?.isFromOlderHistory || false}
                      onUpdate={(s) => handleUpdateSet(ex.instanceId, s)}
                      onToggle={() => handleToggleComplete(ex.instanceId, set)}
                      onDelete={() => handleDeleteSet(ex.instanceId, set.id)}
                      isLast={idx === ex.sets.length - 1}
                      onPressSetNumber={(pageX, pageY, width, height) => handleSetNumberPress(ex.instanceId, set.id, pageX, pageY, width, height)}
                      isSelectionMode={selectionMode?.exerciseId === ex.instanceId}
                      isSelected={selectedSetIds.has(set.id)}
                      onToggleSelection={(isAddToGroupAction) => handleToggleSetSelection(set.id, isAddToGroupAction)}
                      dropSetId={set.dropSetId}
                      isDropSetStart={set.dropSetId && (idx === 0 || ex.sets[idx - 1].dropSetId !== set.dropSetId)}
                      isDropSetEnd={set.dropSetId && (idx === ex.sets.length - 1 || ex.sets[idx + 1]?.dropSetId !== set.dropSetId) && !set.restPeriodSeconds}
                      groupSetNumber={groupSetNumber}
                      indexInGroup={indexInGroup}
                      overallSetNumber={overallSetNumber}
                      warmupIndex={warmupIndex}
                      workingIndex={workingIndex}
                      editingGroupId={selectionMode?.editingGroupId}
                      groupSetType={displayGroupSetType}
                      readOnly={readOnly}
                      shouldFocus={focusNextSet?.setId === set.id ? focusNextSet.field : null}
                      onFocusHandled={() => setFocusNextSet(null)}
                      onCustomKeyboardOpen={!readOnly && ex.category === 'Lifts' ? ({ field, value }) => handleCustomKeyboardOpen(ex.instanceId, set.id, field, value) : null}
                      customKeyboardActive={customKeyboardTarget?.exerciseId === ex.instanceId && customKeyboardTarget?.setId === set.id}
                      customKeyboardField={customKeyboardTarget?.exerciseId === ex.instanceId && customKeyboardTarget?.setId === set.id ? customKeyboardTarget.field : null}
                    />
                    
                    {/* Rest Timer Bar */}
                    {showRestTimer && (() => {
                      // Determine if this rest timer is at the end of a dropset
                      const isRestTimerDropSetEnd = set.dropSetId && (idx === ex.sets.length - 1 || ex.sets[idx + 1]?.dropSetId !== set.dropSetId);
                      
                      const handleDeleteRestTimer = () => {
                        handleWorkoutUpdate({
                          ...currentWorkout,
                          exercises: updateExercisesDeep(currentWorkout.exercises, ex.instanceId, (exercise) => ({
                            ...exercise,
                            sets: exercise.sets.map(s => {
                              if (s.id === set.id) {
                                const { restPeriodSeconds, restTimerCompleted, ...rest } = s;
                                return rest;
                              }
                              return s;
                            })
                          }))
                        });
                        // Also cancel any active timer for this set
                        if (activeRestTimer?.setId === set.id) {
                          setActiveRestTimer(null);
                        }
                      };
                      
                      return (
                      <Swipeable
                        renderRightActions={(progress, dragX) => (
                          <RestTimerDeleteAction 
                            progress={progress} 
                            dragX={dragX} 
                            onDelete={handleDeleteRestTimer} 
                          />
                        )}
                        onSwipeableWillOpen={(direction) => {
                          // If fully opened to the right (swiped left), trigger delete
                          if (direction === 'right') {
                            handleDeleteRestTimer();
                          }
                        }}
                        overshootRight={false}
                        friction={2}
                        rightThreshold={120}
                      >
                      <View style={[
                        styles.restTimerBar,
                        set.completed && set.restTimerCompleted && styles.restTimerBar__completed
                      ]}>
                        {/* Dropset indicator for rest timer */}
                        {set.dropSetId && (
                          <View style={[
                            styles.restTimerDropSetIndicator,
                            isRestTimerDropSetEnd && styles.restTimerDropSetIndicator__end,
                            displayGroupSetType === 'warmup' && styles.restTimerDropSetIndicator__warmup,
                            displayGroupSetType === 'failure' && styles.restTimerDropSetIndicator__failure
                          ]} />
                        )}
                        <View style={[
                          styles.restTimerLine,
                          set.restTimerCompleted && styles.restTimerLine__completed
                        ]} />
                        <TouchableOpacity 
                          style={[
                            styles.restTimerBadge,
                            isRestTimerActive && styles.restTimerBadge__active,
                            set.restTimerCompleted && !isRestTimerActive && styles.restTimerBadge__completed
                          ]}
                          onPress={() => {
                            if (isRestTimerActive) {
                              // Open the timer control popup
                              setRestTimerPopupOpen(true);
                            } else {
                              // Open the duration picker to edit the timer
                              setRestPeriodSetInfo({ exerciseId: ex.instanceId, setId: set.id });
                              setRestTimerInput(String(set.restPeriodSeconds));
                              setRestPeriodModalOpen(true);
                            }
                          }}
                        >
                          {isRestTimerActive ? (
                            <Text style={styles.restTimerText__activeLarge}>
                              {formatRestTime(activeRestTimer.remainingSeconds)}
                            </Text>
                          ) : (
                            <>
                              <Timer size={12} color={set.restTimerCompleted ? COLORS.green[600] : COLORS.slate[500]} />
                              <Text style={[
                                styles.restTimerText,
                                set.restTimerCompleted && styles.restTimerText__completed
                              ]}>
                                {formatRestTime(set.restPeriodSeconds)}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <View style={[
                          styles.restTimerLine,
                          set.restTimerCompleted && styles.restTimerLine__completed
                        ]} />
                      </View>
                      </Swipeable>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
            </View>
            
            {selectionMode?.exerciseId === ex.instanceId && (
              <View style={styles.selectionModeFooter}>
                <View style={styles.groupTypeDropdownContainer}>
                  <TouchableOpacity 
                    onPress={() => setGroupSetType(groupSetType === 'warmup' ? null : 'warmup')}
                    style={[
                      styles.groupTypeOption,
                      groupSetType === 'warmup' && styles.groupTypeOption__warmup
                    ]}
                  >
                    <Flame size={14} color={groupSetType === 'warmup' ? COLORS.white : COLORS.orange[500]} />
                    <Text style={[
                      styles.groupTypeOptionText,
                      groupSetType === 'warmup' && styles.groupTypeOptionText__selected
                    ]}>Warmup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setGroupSetType(groupSetType === 'failure' ? null : 'failure')}
                    style={[
                      styles.groupTypeOption,
                      groupSetType === 'failure' && styles.groupTypeOption__failure
                    ]}
                  >
                    <Zap size={14} color={groupSetType === 'failure' ? COLORS.white : COLORS.red[500]} />
                    <Text style={[
                      styles.groupTypeOptionText,
                      groupSetType === 'failure' && styles.groupTypeOptionText__selected
                    ]}>Failure</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.selectionModeActions}>
                  <TouchableOpacity onPress={handleCancelDropSet} style={styles.selectionCancelButton}>
                    <Text style={styles.selectionCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSubmitDropSet}
                    style={styles.selectionSubmitButton}
                  >
                    <Text style={styles.selectionSubmitText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
         </View>
         )}
         
         {isMoving && (
           <Animated.View 
             pointerEvents="none"
             style={[
               StyleSheet.absoluteFillObject,
               styles.movingItemOverlay,
               isGroupChild ? styles.movingItemOverlay__groupChild : styles.movingItemOverlay__regular,
               { opacity: fadeAnim }
             ]}
           />
         )}
      </TouchableOpacity>
    );

    if (isGroupChild) {
      return (
        <View 
          key={ex.instanceId}
          style={[
            styles.groupChildWrapper,
            isLastChild && !isMoveMode && styles.groupChildWrapper__last,
            isMoveMode && styles.groupChildWrapper__moveMode
          ]}
        >
           {cardContent}
        </View>
      );
    }

    return cardContent;
  };

  const renderDropZone = (index, isGroupChild = false, isLastInGroup = false) => {
    // Find the group type if we are inside a group
    let groupType = "";
    let dropZoneGroupId = null;
    const flatRows = flattenExercises(currentWorkout.exercises);

    if (isGroupChild) {
       // We need to find which group we are in.
       // Since we are rendering flat list, we can look backwards from index to find the header.
       // The index passed here is the insertion index.
       // So the item at index-1 might be the previous item in the group.
       // We can traverse back until we find a group_header.
       for (let i = index - 1; i >= 0; i--) {
          if (flatRows[i].type === 'group_header') {
             groupType = flatRows[i].data.groupType;
             dropZoneGroupId = flatRows[i].id;
             break;
          }
       }
    }

    let isAlreadyInGroup = false;
    if (isGroupChild && movingItemId) {
        const movingRow = flatRows.find(r => r.id === movingItemId);
        if (movingRow && movingRow.groupId === dropZoneGroupId) {
            isAlreadyInGroup = true;
        }
    }

    return (
    <TouchableOpacity 
      key={`drop-${index}-${isGroupChild ? 'in' : 'out'}`} 
      style={[
        styles.dropZone,
        isLastInGroup && styles.dropZone__lastInGroup,
        isGroupChild ? styles.dropZone__groupChild : styles.dropZone__regular,
        isGroupChild && isLastInGroup && styles.dropZone__groupChild__last
      ]}
      onPress={() => handleMoveItem(index, isGroupChild)}
    >
      <View style={styles.dropZoneLineContainer}>
        <View style={[
          styles.dropZoneLine,
          isGroupChild && styles.dropZoneLine__groupChild
        ]} />
      </View>
      <Text style={[
        styles.dropZoneText,
        isGroupChild ? styles.dropZoneText__groupChild : styles.dropZoneText__regular
      ]}>
        {isGroupChild && !isAlreadyInGroup ? `Add to ${groupType}` : "Move here"}
      </Text>
    </TouchableOpacity>
  );
  };

  const renderSpacer = (index, isGroupChild = false, isLastInGroup = false) => {
    return (
      <View 
        key={`spacer-${index}-${isGroupChild ? 'in' : 'out'}`}
        style={[
          styles.spacer,
          isGroupChild ? styles.spacer__groupChild : styles.spacer__regular,
          isGroupChild && isLastInGroup && styles.spacer__groupChild__last
        ]}
      />
    );
  };

  const renderFlatList = () => {
    const flatRows = flattenExercises(currentWorkout.exercises);
    const renderedItems = [];

    // Calculate moving item range
    let movingIndex = -1;
    let movingSize = 0;
    let movingEndIndex = -1;

    if (isMoveMode && movingItemId) {
      movingIndex = flatRows.findIndex(r => r.id === movingItemId);
      if (movingIndex !== -1) {
        const movingRow = flatRows[movingIndex];
        if (movingRow.type === 'group_header') {
          movingSize = movingRow.data.children ? movingRow.data.children.length : 0;
        }
        movingEndIndex = movingIndex + 1 + movingSize;
      }
    }

    flatRows.forEach((row, index) => {
      // Skip processing for children of the moving group
      if (isMoveMode && movingItemId) {
          const movingRow = flatRows.find(r => r.id === movingItemId);
          if (movingRow && movingRow.type === 'group_header' && row.groupId === movingItemId) {
             return;
          }
      }

      // Drop Zone before item
      if (isMoveMode) {
        // Determine if this drop zone is inside a group
        let isInsideGroup = false;
        let isEndOfGroup = false;

        if (index > 0) {
            const prevRow = flatRows[index - 1];
            // If previous item is a group header OR a group child, then we are inside.
            if (prevRow.type === 'group_header' || (prevRow.type === 'exercise' && prevRow.depth === 1)) {
              isInsideGroup = true;
            }
            
            // Check if we are at the END of a group (transition from Inside to Outside)
            if (isInsideGroup) {
              if (row.depth === 0 || (row.depth === 1 && row.groupId !== prevRow.groupId && row.groupId !== prevRow.id)) {
                  isEndOfGroup = true;
              }
            }
        }

        // Skip drop zones within the moving block or immediately before/after it
        // Range to skip: [movingIndex, movingEndIndex]
        
        let shouldSkip = false;
        if (movingIndex !== -1) {
           if (index >= movingIndex && index < movingEndIndex) {
             shouldSkip = true;
           }
        }

        if (!shouldSkip) {
          if (isEndOfGroup) {
             // Render TWO drop zones:
             // 1. Inside (to place at end of group)
             let skipInside = false;
             let skipOutside = false;
             let hideInside = false;

             if (index === movingEndIndex) {
                const movingRow = flatRows[movingIndex];
                if (movingRow.depth === 1) skipInside = true;
                if (movingRow.depth === 0) skipOutside = true;

                // If moving a group, and we are at the end of it, hide the "Inside" drop zone completely (no spacer)
                if (movingRow.type === 'group_header' && flatRows[index - 1].groupId === movingRow.id) {
                    hideInside = true;
                }
             }

             if (!hideInside) {
                if (!skipInside) renderedItems.push(renderDropZone(index, true, true));
                else renderedItems.push(renderSpacer(index, true, true));
             }

             if (!skipOutside) renderedItems.push(renderDropZone(index, false, false));
             else renderedItems.push(renderSpacer(index, false, false));
          } else {
             // Normal single drop zone
             let skip = false;
             if (index === movingEndIndex) {
                const movingRow = flatRows[movingIndex];
                if (isInsideGroup && movingRow.depth === 1) skip = true;
                if (!isInsideGroup && movingRow.depth === 0) skip = true;
             }
             
             if (!skip) renderedItems.push(renderDropZone(index, isInsideGroup, false));
             else renderedItems.push(renderSpacer(index, isInsideGroup, false));
          }
        } else {
            // Render spacer instead of skipped drop zone
            // We need to know if we should render an "Inside" spacer or "Outside" spacer.
            // If we are inside a moving group, we are likely "Inside".
            
            // If isEndOfGroup is true, we normally render TWO drop zones.
            // But if we are skipping, we are likely inside the moving block.
            // If the moving block *contains* an end-of-group transition?
            // A moving block is either a single exercise or a whole group.
            // If it's a whole group, it contains Header + Children.
            // The transition from Header to Child is "Inside".
            // The transition from Child to Child is "Inside".
            // The transition from Last Child to Next Item (outside block) is handled by the Next Item's drop zone logic (index = movingEndIndex).
            
            // So within the moving block:
            // Index = movingIndex (Header). Prev is whatever was before. 
            // If Prev was Inside, then Header is Inside? No, Header is depth 0.
            // So Header is never Inside.
            // So drop zone before Header is Outside.
            
            // Index = movingIndex + 1 (Child 1). Prev is Header.
            // Header is group_header. So isInsideGroup = true.
            // Child 1 is depth 1. isEndOfGroup = false.
            // So drop zone is Inside.
            
            // So we can use `isInsideGroup` to style the spacer.
            
            renderedItems.push(renderSpacer(index, isInsideGroup));
        }
      }

      if (row.type === 'group_header') {
        const isMoving = isMoveMode && movingItemId === row.id;
        const isNotMoving = isMoveMode && !isMoving;
        
        // If moving, we want to render a collapsed version that looks like a single item
        if (isMoving) {
           renderedItems.push(
             <View key={row.id} style={styles.movingGroupWrapper}>
                <Animated.View 
                  style={[
                    styles.movingGroupContainer,
                    { opacity: fadeAnim }
                  ]}
                >
                  <View style={styles.movingGroupContent}>
                    <Layers size={16} color={COLORS.indigo[600]} />
                    <Text style={styles.movingGroupText}>
                      {row.data.groupType} ({row.data.children ? row.data.children.length : 0})
                    </Text>
                  </View>
                </Animated.View>
             </View>
           );
           // We also need to skip rendering the children of this group in the main loop
           // The main loop iterates over flatRows.
           // If we are moving a group, the children are subsequent rows.
           // We need to ensure we don't render them.
           // But wait, the `renderFlatList` iterates all rows.
           // We can check if a row is a child of the moving group and skip it.
        } else {
            renderedItems.push(
              <TouchableOpacity 
                key={row.id} 
                activeOpacity={1}
                onLongPress={() => handleStartMove(row.id)}
                onPress={() => {
                  if (isMoveMode) {
                     const idx = flatRows.findIndex(r => r.id === row.id);
                     if (idx !== -1) handleMoveItem(idx);
                  }
                }}
                style={[
                  styles.groupContainer, 
                  styles.groupContainer__notMoving
                ]}
              >
                <View style={[
                  styles.groupHeader,
                  isNotMoving && styles.groupHeader__notMoving
                ]}>
                  <Layers size={14} color={COLORS.indigo[600]} />
                  <Text style={styles.groupTitle}>{row.data.groupType}</Text>
                </View>
              </TouchableOpacity>
            );
        }
      } else {
        // Exercise
        // Check if it's in a group to apply styling
        const isGroupChild = row.depth === 1;
        
        // If this exercise is a child of the currently moving group, skip rendering it
        if (isMoveMode && movingItemId) {
           const movingRow = flatRows.find(r => r.id === movingItemId);
           if (movingRow && movingRow.type === 'group_header' && row.groupId === movingItemId) {
              return; // Skip rendering child of moving group
           }
        }

        // Check if it's the last child of the group
        let isLastChild = false;
        if (isGroupChild) {
           const nextRow = flatRows[index + 1];
           if (!nextRow || nextRow.type === 'group_header' || nextRow.depth === 0) {
             isLastChild = true;
           }
        }
        
        renderedItems.push(renderExerciseCard(row.data, isGroupChild, isLastChild));
      }
    });

    // Final Drop Zone
    if (isMoveMode) {
      const finalIndex = flatRows.length;
      let shouldSkip = false;
      if (movingIndex !== -1) {
         // If moving block is at the end of the list, movingEndIndex === finalIndex.
         // We handle the "skip if matches" logic below.
         // But if movingEndIndex > finalIndex (impossible) or < finalIndex.
         // If movingEndIndex === finalIndex, we are immediately after the block.
         // If movingIndex === finalIndex (impossible).
      }

      let isInsideGroup = false;
      if (flatRows.length > 0) {
         const lastRow = flatRows[flatRows.length - 1];
         if (lastRow.type === 'group_header' || (lastRow.type === 'exercise' && lastRow.depth === 1)) {
           isInsideGroup = true;
         }
      }
      
      if (isInsideGroup) {
         // If the list ends while inside a group, we need TWO drop zones:
         // 1. Inside (End of Group)
         let skipInside = false;
         let skipOutside = false;
         
         if (finalIndex === movingEndIndex) {
            const movingRow = flatRows[movingIndex];
            if (movingRow.depth === 1) skipInside = true;
            if (movingRow.depth === 0) skipOutside = true;
         }

         if (!skipInside) renderedItems.push(renderDropZone(finalIndex, true, true));
         // 2. Outside (After Group)
         if (!skipOutside) renderedItems.push(renderDropZone(finalIndex, false, false));
      } else {
         let skip = false;
         if (finalIndex === movingEndIndex) {
            const movingRow = flatRows[movingIndex];
            if (!isInsideGroup && movingRow.depth === 0) skip = true;
            // If isInsideGroup is false, we can't be depth 1 unless we moved out?
            // But here isInsideGroup refers to the drop zone context (end of list).
            // If end of list is NOT inside a group, then drop zone is depth 0.
         }
         if (!skip) renderedItems.push(renderDropZone(finalIndex, false, false));
      }
    }

    return renderedItems;
  };

  return (
    <SafeAreaView style={styles.container}>
      {isMoveMode && (
        <View style={styles.moveModeBanner}>
          <TouchableOpacity onPress={handleCancelMove}>
            <Text style={styles.moveModeBannerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.moveModeBannerCenter}>
            <Text style={styles.moveModeBannerTitle}>Move Item</Text>
            <Text style={styles.moveModeBannerSubtitle}>Press and hold on an exercise or group to move it</Text>
          </View>
          <TouchableOpacity onPress={handleDoneMove}>
            <Text style={styles.moveModeBannerButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {customHeader ? customHeader : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ChevronDown size={24} color={COLORS.slate[400]} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <TextInput 
              value={currentWorkout.name} 
              onChangeText={(text) => handleWorkoutUpdate({...currentWorkout, name: text})} 
              style={styles.workoutNameInput}
            />
            <View style={styles.headerMeta}>
              <View style={styles.metaItem}>
                <Calendar size={12} color={COLORS.slate[400]} />
                <Text style={styles.metaText}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={12} color={COLORS.slate[400]} />
                <Text style={[styles.metaText, styles.monoText]}>{formatDuration(elapsed)}</Text>
              </View>
            </View>
          </View>
          {isMoveMode ? (
            <TouchableOpacity 
              onPress={handleCancelMove} 
              style={[styles.finishButton, styles.finishButton__cancelMode]}
            >
              <Text style={styles.finishButtonText}>CANCEL</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={handleCancel} 
              style={[styles.finishButton, styles.finishButton__cancelWorkout]}
            >
              <Text style={styles.finishButtonText}>CANCEL</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Pressable 
        style={styles.mainPressableWrapper}
        onPress={() => {
          // Close any open popup when clicking outside
          if (activeSetMenu) {
            setActiveSetMenu(null);
          }
          if (optionsModalExId) {
            setOptionsModalExId(null);
          }
        }}
      >
        <View style={styles.mainContentWrapper}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            onScroll={(event) => {
              const currentOffset = event.nativeEvent.contentOffset.y;
              setScrollOffset(currentOffset);

              // Update set-level popup position if one is open
              if (activeSetMenu) {
                const newTop = activeSetMenu.originalTop - currentOffset - 15;
                setActiveSetMenu(prev => ({
                  ...prev,
                  top: newTop
                }));
              }
              
              // Update 3-dot popup position if one is open
              if (optionsModalExId && dropdownPos.originalTop !== undefined) {
                const newTop = dropdownPos.originalTop - currentOffset;
                setDropdownPos(prev => ({
                  ...prev,
                  top: newTop
                }));
              }
            }}
            scrollEventThrottle={16}
          >
            {!isMoveMode && (
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <TouchableOpacity onPress={() => setShowNotes(!showNotes)} style={styles.notesToggle}>
                  <FileText size={16} color={COLORS.slate[500]} />
                  <Text style={styles.notesTitle}>Workout Notes</Text>
                  {(currentWorkout.sessionNotes && currentWorkout.sessionNotes.length > 0) && (
                    <View style={styles.notesBadge}>
                      <Text style={styles.notesBadgeText}>{currentWorkout.sessionNotes.length}</Text>
                    </View>
                  )}
                  <ChevronDown size={14} color={COLORS.slate[500]} style={{ transform: [{ rotate: showNotes ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsNoteModalOpen(true)} style={styles.addNoteButton}>
                  <Plus size={14} color={COLORS.blue[600]} strokeWidth={3} />
                  <Text style={styles.addNoteText} numberOfLines={1}>Add Note</Text>
                </TouchableOpacity>
              </View>
              {showNotes && (
                <View style={styles.notesList}>
                  {sortedNotes.length > 0 ? (
                    sortedNotes.map((note) => <SavedNoteItem key={note.id} note={note} onPin={handlePinNote} onRemove={handleRemoveNote} />)
                  ) : (
                    <Text style={styles.emptyNotesText}>No notes added yet.</Text>
                  )}
                </View>
              )}
            </View>
            )}

            <View style={styles.exercisesContainer}>
              {currentWorkout.exercises.length === 0 && (
                 <View style={styles.emptyState}>
                    <Dumbbell size={48} color={COLORS.slate[300]} style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyStateText}>No exercises added yet</Text>
                    <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.emptyStateButton}>
                      <Text style={styles.emptyStateButtonText}>Add an Exercise</Text>
                    </TouchableOpacity>
                 </View>
              )}

              {renderFlatList()}

              {!isMoveMode && !readOnly && (
              <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.addExerciseButton}>
                <Plus size={20} color={COLORS.slate[500]} />
                <Text style={styles.addExerciseButtonText}>ADD EXERCISE</Text>
              </TouchableOpacity>
              )}

              {hasExercises && !isMoveMode && (
                customFinishButton ? customFinishButton : (
                  <TouchableOpacity
                    onPress={() => setFinishModalOpen(true)}
                    style={styles.bottomFinishButton}
                  >
                    <Text style={styles.bottomFinishButtonText}>FINISH WORKOUT</Text>
                  </TouchableOpacity>
                )
              )}

              {isMoveMode && (
                <TouchableOpacity
                  onPress={handleCancelMove}
                  style={[styles.bottomFinishButton, { backgroundColor: COLORS.slate[500] }]}
                >
                  <Text style={styles.bottomFinishButtonText}>CANCEL</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Render the set menu outside the Modal, using conditional rendering */}
          {activeSetMenu && (
            <Pressable
              key={popupKey} // Force re-mount when switching popups
              onPress={(e) => {
                // Capture press to prevent closing
                e.stopPropagation();
              }}
              style={[
                styles.setPopupMenuContainer,
                {
                  position: 'absolute',
                  top: activeSetMenu.top,
                  left: activeSetMenu.left,
                  zIndex: 100, // Important for iOS
                  elevation: 10, // Important for Android
                }
              ]}
            >
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setActiveSetMenu(null);
                }}
              >
                <X size={16} color={COLORS.white} />
              </TouchableOpacity>
              {(() => {
                const exercise = findExerciseDeep(currentWorkout.exercises, activeSetMenu?.exerciseId);
                const set = exercise?.sets?.find(s => s.id === activeSetMenu?.setId);
                const setIdx = exercise?.sets?.findIndex(s => s.id === activeSetMenu?.setId) ?? -1;
                const isGrouped = !!set?.dropSetId;
                
                const hasRestPeriod = !!set?.restPeriodSeconds;
                
                return (
                  <>
                    <TouchableOpacity 
                      style={styles.setPopupOptionItem} 
                      onPress={() => handleSetMenuAction('warmup')}
                    >
                      <Flame size={18} color={COLORS.orange[500]} />
                      <Text style={[
                        styles.setPopupOptionText,
                        set?.isWarmup && styles.setPopupOptionText__warmup
                      ]}>Warmup</Text>
                      {set?.isWarmup && <Check size={16} color={COLORS.orange[500]} strokeWidth={3} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.setPopupOptionItem} 
                      onPress={() => handleSetMenuAction('failure')}
                    >
                      <Zap size={18} color={COLORS.red[500]} />
                      <Text style={[
                        styles.setPopupOptionText,
                        set?.isFailure && styles.setPopupOptionText__failure
                      ]}>Failure</Text>
                      {set?.isFailure && <Check size={16} color={COLORS.red[500]} strokeWidth={3} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.setPopupOptionItem} 
                      onPress={() => handleSetMenuAction('edit_group')}
                    >
                      <Layers size={18} color={COLORS.indigo[600]} />
                      <Text style={styles.setPopupOptionText}>{isGrouped ? 'Edit dropset(s)' : 'Edit dropset'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[
                        styles.setPopupOptionItem,
                        hasRestPeriod && styles.setPopupOptionItem__activeRest
                      ]}
                      onPress={() => handleSetMenuAction(hasRestPeriod ? 'remove_rest' : 'add_rest')}
                    >
                      <Timer size={18} color={hasRestPeriod ? COLORS.white : COLORS.blue[500]} />
                      <Text style={[
                        styles.setPopupOptionText,
                        hasRestPeriod && styles.setPopupOptionText__active
                      ]}>{hasRestPeriod ? `Rest: ${formatRestTime(set.restPeriodSeconds)}` : 'Add rest timer'}</Text>
                      {hasRestPeriod && <Check size={16} color={COLORS.white} strokeWidth={3} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.setPopupOptionItem, { borderBottomWidth: 0 }]}
                      onPress={() => handleSetMenuAction('insert_set')}
                    >
                      <Plus size={18} color={COLORS.slate[600]} />
                      <Text style={styles.setPopupOptionText}>Insert set</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </Pressable>
          )}

          {/* Render the exercise options menu outside the Modal, using conditional rendering */}
          {optionsModalExId && (
          <Pressable
            onPress={(e) => {
              // Capture press to prevent closing
              e.stopPropagation();
            }}
            style={[
              styles.setPopupMenuContainer,
              {
                position: 'absolute',
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 100, // Important for iOS
                elevation: 10, // Important for Android
              }
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setOptionsModalExId(null)}
            >
              <X size={16} color={COLORS.white} />
            </TouchableOpacity>
            
            {(() => {
              const currentExercise = findExerciseDeep(currentWorkout.exercises, optionsModalExId);

              return (
                <>
                  <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleToggleUnit(optionsModalExId)}>
                    <Scale size={18} color={COLORS.slate[600]} />
                    <Text style={styles.setPopupOptionText}>
                      {currentExercise?.weightUnit === 'kg' ? 'Switch to lbs' : 'Switch to kg'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleReplaceExercise(optionsModalExId)}>
                    <RefreshCw size={18} color={COLORS.slate[600]} />
                    <Text style={styles.setPopupOptionText}>Replace Exercise</Text>
                  </TouchableOpacity>

                  {/* Superset Options */}
                  <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleEditSuperset(optionsModalExId)}>
                    <Layers size={18} color={COLORS.indigo[600]} />
                    <Text style={styles.setPopupOptionText}>Edit superset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.setPopupOptionItem, { borderBottomWidth: 0 }]} onPress={() => handleDeleteExercise(optionsModalExId)}>
                    <Trash2 size={18} color={COLORS.red[500]} />
                    <Text style={[styles.setPopupOptionText, styles.optionDestructive]}>Delete Exercise</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </Pressable>
          )}
        </View>
      </Pressable>

      <ExercisePickerModal 
        isOpen={showPicker} 
        onClose={() => setShowPicker(false)} 
        onAdd={handleAddExercisesFromPicker}
        onCreate={() => setIsCreateModalOpen(true)}
        exercises={exercisesLibrary}
      />

      <NewExerciseModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateExerciseSave}
        categories={CATEGORIES}
      />

      <Modal visible={isNoteModalOpen} transparent animationType="fade" onRequestClose={() => setIsNoteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput 
              style={styles.noteInput}
              placeholder="Write your note here..."
              placeholderTextColor={COLORS.slate[400]}
              multiline
              numberOfLines={3}
              value={newNote}
              onChangeText={setNewNote}
              autoFocus
            />
            <View style={styles.dateInputContainer}>
               {/* Native Date Picker would be better, but for parity with web code using text input type='date' logic or similar */}
               <TextInput 
                 style={styles.dateInput}
                 value={newNoteDate}
                 onChangeText={setNewNoteDate}
                 placeholder="YYYY-MM-DD"
               />
               <CalendarDays size={18} color={COLORS.slate[400]} style={styles.dateIcon} />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsNoteModalOpen(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddNote} 
                disabled={!newNote.trim()} 
                style={[styles.modalAdd, !newNote.trim() && styles.modalAddDisabled]}
              >
                <Text style={styles.modalAddText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={exerciseNoteModalOpen} transparent animationType="fade" onRequestClose={() => setExerciseNoteModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Exercise Note</Text>
            <TextInput 
              style={styles.noteInput}
              placeholder="Add a note for this exercise..."
              placeholderTextColor={COLORS.slate[400]}
              multiline
              numberOfLines={3}
              value={currentExerciseNote}
              onChangeText={setCurrentExerciseNote}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setExerciseNoteModalOpen(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleSaveExerciseNote} 
                style={styles.modalAdd}
              >
                <Text style={styles.modalAddText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={finishModalOpen} transparent animationType="fade" onRequestClose={() => setFinishModalOpen(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Finish Workout?</Text>
               <Text style={styles.modalSubtitle}>All sets will be saved to your history.</Text>
               <View style={styles.modalActions}>
                 <TouchableOpacity onPress={() => setFinishModalOpen(false)} style={styles.modalCancel}>
                   <Text style={styles.modalCancelText}>Cancel</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={handleFinish} style={styles.modalFinish}>
                   <Text style={styles.modalFinishText}>Finish</Text>
                 </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      <Modal visible={cancelModalOpen} transparent animationType="fade" onRequestClose={() => setCancelModalOpen(false)}>
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Cancel Workout?</Text>
               <Text style={styles.modalSubtitle}>Are you sure you want to cancel? All progress will be lost.</Text>
               <View style={styles.modalActions}>
                 <TouchableOpacity onPress={() => setCancelModalOpen(false)} style={styles.modalCancel}>
                   <Text style={styles.modalCancelText}>No, Keep Going</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={confirmCancel} style={[styles.modalFinish, { backgroundColor: COLORS.red[600] }]}>
                   <Text style={styles.modalFinishText}>Yes, Cancel</Text>
                 </TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>

      {/* Rest Timer Input Modal */}
      <Modal visible={restPeriodModalOpen} transparent animationType="fade" onRequestClose={() => setRestPeriodModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Rest Timer</Text>
            
            {/* Live Preview */}
            <View style={styles.restTimerPreview}>
              <Timer size={28} color={parseRestTimeInput(restTimerInput) > 0 ? COLORS.blue[500] : COLORS.slate[300]} />
              <Text style={[
                styles.restTimerPreviewText,
                parseRestTimeInput(restTimerInput) > 0 && styles.restTimerPreviewText__active
              ]}>
                {parseRestTimeInput(restTimerInput) > 0 
                  ? formatRestTime(parseRestTimeInput(restTimerInput))
                  : '0:00'}
              </Text>
            </View>
            
            {/* Quick Select Buttons - Row 1: 0:30 -> 1:30 */}
            <View style={styles.restPeriodQuickOptions}>
              {[30, 45, 60, 75, 90].map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.restPeriodQuickOption,
                    parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOption__selected
                  ]}
                  onPress={() => setRestTimerInput(String(seconds))}
                >
                  <Text style={[
                    styles.restPeriodQuickOptionText,
                    parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOptionText__selected
                  ]}>{formatRestTime(seconds)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Quick Select Buttons - Row 2: 1:45 -> 3:30 */}
            <View style={[styles.restPeriodQuickOptions, { marginBottom: 16 }]}>
              {[105, 120, 150, 180, 210].map(seconds => (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.restPeriodQuickOption,
                    parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOption__selected
                  ]}
                  onPress={() => setRestTimerInput(String(seconds))}
                >
                  <Text style={[
                    styles.restPeriodQuickOptionText,
                    parseRestTimeInput(restTimerInput) === seconds && styles.restPeriodQuickOptionText__selected
                  ]}>{formatRestTime(seconds)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Phone Dialpad */}
            <View style={styles.dialpad}>
              <View style={styles.dialpadRow}>
                {[1, 2, 3].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={styles.dialpadButton}
                    onPress={() => setRestTimerInput(prev => prev + String(num))}
                  >
                    <Text style={styles.dialpadButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.dialpadRow}>
                {[4, 5, 6].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={styles.dialpadButton}
                    onPress={() => setRestTimerInput(prev => prev + String(num))}
                  >
                    <Text style={styles.dialpadButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.dialpadRow}>
                {[7, 8, 9].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={styles.dialpadButton}
                    onPress={() => setRestTimerInput(prev => prev + String(num))}
                  >
                    <Text style={styles.dialpadButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.dialpadRow}>
                <TouchableOpacity
                  style={styles.dialpadButtonSecondary}
                  onPress={() => setRestTimerInput('')}
                >
                  <Text style={styles.dialpadButtonTextSecondary}>C</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialpadButton}
                  onPress={() => setRestTimerInput(prev => prev + '0')}
                >
                  <Text style={styles.dialpadButtonText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialpadButtonSecondary}
                  onPress={() => setRestTimerInput(prev => prev.slice(0, -1))}
                >
                  <Text style={styles.dialpadButtonTextSecondary}>⌫</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => {
                  setRestPeriodModalOpen(false);
                  setRestPeriodSetInfo(null);
                  setRestTimerInput('');
                }} 
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleAddRestPeriod}
                style={[
                  styles.modalFinish,
                  parseRestTimeInput(restTimerInput) <= 0 && { opacity: 0.5 }
                ]}
                disabled={parseRestTimeInput(restTimerInput) <= 0}
              >
                <Text style={styles.modalFinishText}>Save</Text>
              </TouchableOpacity>
            </View>
            
            {/* Start Timer Button - always visible, disabled when no valid input */}
            <TouchableOpacity 
              onPress={() => {
                const seconds = parseRestTimeInput(restTimerInput);
                if (seconds <= 0 || !restPeriodSetInfo) return;
                
                const { exerciseId, setId } = restPeriodSetInfo;
                
                // Update the set's rest period
                handleWorkoutUpdate({
                  ...currentWorkout,
                  exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => ({
                    ...ex,
                    sets: ex.sets.map(s => s.id === setId ? { ...s, restPeriodSeconds: seconds, restTimerCompleted: false } : s)
                  }))
                });
                
                // Start the timer
                setActiveRestTimer({
                  exerciseId,
                  setId,
                  remainingSeconds: seconds,
                  totalSeconds: seconds,
                  isPaused: false
                });
                
                setRestPeriodModalOpen(false);
                setRestPeriodSetInfo(null);
                setRestTimerInput('');
                setRestTimerPopupOpen(true);
              }}
              style={[
                styles.startTimerButton,
                parseRestTimeInput(restTimerInput) <= 0 && styles.startTimerButton__disabled
              ]}
              disabled={parseRestTimeInput(restTimerInput) <= 0}
            >
              <Play size={16} color={COLORS.white} />
              <Text style={styles.startTimerButtonText}>Start Timer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Active Rest Timer Popup */}
      <Modal 
        visible={restTimerPopupOpen && activeRestTimer !== null} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setRestTimerPopupOpen(false)}
      >
        <Pressable 
          style={styles.timerPopupOverlay} 
          onPress={() => setRestTimerPopupOpen(false)}
        >
          <Pressable style={styles.timerPopupContent} onPress={(e) => e.stopPropagation()}>
            {/* Circular Timer Display */}
            <View style={styles.timerCircleContainer}>
              {/* Background Circle */}
              <View style={styles.timerCircleBg} />
              {/* Progress Circle - using a simple approach with opacity */}
              <View style={[
                styles.timerCircleProgress,
                {
                  opacity: activeRestTimer ? (activeRestTimer.remainingSeconds / activeRestTimer.totalSeconds) : 0
                }
              ]} />
              {/* Timer Text */}
              <View style={styles.timerCircleTextContainer}>
                <Text style={styles.timerCircleText}>
                  {activeRestTimer ? formatRestTime(activeRestTimer.remainingSeconds) : '0:00'}
                </Text>
                <Text style={styles.timerCircleSubtext}>
                  {activeRestTimer?.isPaused ? 'PAUSED' : 'remaining'}
                </Text>
              </View>
            </View>
            
            {/* Pause/Resume Button */}
            <TouchableOpacity 
              style={[
                styles.timerPopupMainButton,
                activeRestTimer?.isPaused && styles.timerPopupMainButton__paused
              ]}
              onPress={() => setActiveRestTimer(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null)}
            >
              {activeRestTimer?.isPaused ? (
                <>
                  <Play size={20} color={COLORS.white} />
                  <Text style={styles.timerPopupMainButtonText}>Resume</Text>
                </>
              ) : (
                <>
                  <Pause size={20} color={COLORS.white} />
                  <Text style={styles.timerPopupMainButtonText}>Pause</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Time Adjustment Buttons */}
            <View style={styles.timerAdjustContainer}>
              {[5, 10, 15, 30].map(seconds => (
                <View key={seconds} style={styles.timerAdjustColumn}>
                  <TouchableOpacity 
                    style={styles.timerAdjustButton}
                    onPress={() => setActiveRestTimer(prev => prev ? { 
                      ...prev, 
                      remainingSeconds: prev.remainingSeconds + seconds,
                      totalSeconds: prev.totalSeconds + seconds
                    } : null)}
                  >
                    <Text style={styles.timerAdjustButtonText}>+{seconds}s</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.timerAdjustButton}
                    onPress={() => setActiveRestTimer(prev => {
                      if (!prev) return null;
                      const newRemaining = Math.max(1, prev.remainingSeconds - seconds);
                      return { ...prev, remainingSeconds: newRemaining };
                    })}
                  >
                    <Text style={styles.timerAdjustButtonText}>-{seconds}s</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            {/* Bottom Buttons */}
            <View style={styles.timerPopupBottomButtons}>
              <TouchableOpacity 
                style={styles.timerPopupCloseButton}
                onPress={() => setRestTimerPopupOpen(false)}
              >
                <Text style={styles.timerPopupCloseButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.timerPopupCompleteButton}
                onPress={() => {
                  if (activeRestTimer) {
                    // Mark timer as completed
                    handleWorkoutUpdate({
                      ...currentWorkout,
                      exercises: updateExercisesDeep(currentWorkout.exercises, activeRestTimer.exerciseId, (ex) => ({
                        ...ex,
                        sets: ex.sets.map(s => s.id === activeRestTimer.setId ? { ...s, restTimerCompleted: true } : s)
                      }))
                    });
                  }
                  setActiveRestTimer(null);
                  setRestTimerPopupOpen(false);
                }}
              >
                <Text style={styles.timerPopupCompleteButtonText}>Completed</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Superset Selection Mode Overlay */}
      {supersetSelectionMode && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={handleCancelSupersetSelection}>
          <View style={styles.supersetSelectionOverlay}>
            <View style={styles.supersetSelectionBanner}>
              <Text style={styles.supersetSelectionTitle}>
                {supersetSelectionMode.mode === 'create' ? 'Create Superset' : 'Edit Superset'}
              </Text>
              <Text style={styles.supersetSelectionSubtitle}>
                Select exercises to group together ({selectedExerciseIds.size} selected)
              </Text>
              <View style={styles.supersetSelectionActions}>
                <TouchableOpacity onPress={handleCancelSupersetSelection} style={styles.supersetCancelButton}>
                  <Text style={styles.supersetCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleConfirmSupersetSelection} 
                  style={[
                    styles.supersetConfirmButton,
                    // Only disable for create mode if less than 2 selected
                    (supersetSelectionMode.mode === 'create' && selectedExerciseIds.size < 2) && styles.supersetConfirmButtonDisabled
                  ]}
                  disabled={supersetSelectionMode.mode === 'create' && selectedExerciseIds.size < 2}
                >
                  <Text style={styles.supersetConfirmButtonText}>
                    {supersetSelectionMode.mode === 'create' ? 'Create' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.supersetSelectionList} contentContainerStyle={styles.supersetSelectionListContent}>
              {currentWorkout.exercises.map(exercise => {
                if (exercise.type === 'group') {
                  // Determine if this is the superset being edited
                  const isEditingThisSuperset = supersetSelectionMode?.mode === 'edit' && 
                                                supersetSelectionMode?.supersetId === exercise.instanceId;
                  
                  // If NOT in a superset (creating new), allow clicking the group to add to it
                  const canClickGroup = supersetSelectionMode?.mode === 'create';

                  return (
                    <View key={exercise.instanceId}>
                      {canClickGroup ? (
                        // Clickable superset group (for adding to existing superset)
                        <TouchableOpacity
                          style={styles.supersetGroupLabelClickable}
                          onPress={() => handleAddToSpecificSuperset(supersetSelectionMode.exerciseId, exercise.instanceId)}
                        >
                          <View style={styles.supersetGroupLabelContent}>
                            <Layers size={14} color={COLORS.indigo[600]} />
                            <Text style={styles.supersetGroupLabelText}>{exercise.groupType}</Text>
                            <Text style={styles.supersetGroupLabelSubtext}>
                              ({exercise.children?.length || 0} exercises)
                            </Text>
                          </View>
                          <ChevronLeft 
                            size={16} 
                            color={COLORS.indigo[600]} 
                            style={{ transform: [{ rotate: '180deg' }] }}
                          />
                        </TouchableOpacity>
                      ) : (
                        // Non-clickable group header (when editing that superset)
                        <View style={styles.supersetGroupLabel}>
                          <Layers size={14} color={COLORS.indigo[600]} />
                          <Text style={styles.supersetGroupLabelText}>{exercise.groupType}</Text>
                        </View>
                      )}
                      
                      {/* Show individual exercises within groups */}
                      {isEditingThisSuperset ? (
                        // If editing this superset, show checkboxes for its exercises
                        exercise.children?.map((child, index, array) => (
                          <TouchableOpacity
                            key={child.instanceId}
                            style={[
                              styles.supersetExerciseItem,
                              styles.supersetExerciseItemGrouped,
                              selectedExerciseIds.has(child.instanceId) && styles.supersetExerciseItemSelected,
                              index === array.length - 1 && { marginBottom: 8 } // Add extra margin to last item
                            ]}
                            onPress={() => handleToggleSupersetSelection(child.instanceId)}
                          >
                            <View style={[
                              styles.supersetCheckbox,
                              selectedExerciseIds.has(child.instanceId) && styles.supersetCheckboxSelected
                            ]}>
                              {selectedExerciseIds.has(child.instanceId) && (
                                <Text style={styles.supersetCheckmark}>✓</Text>
                              )}
                            </View>
                            <Text style={styles.supersetExerciseName}>{child.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        // Otherwise, show as disabled/non-selectable
                        exercise.children?.map((child, index, array) => (
                          <View
                            key={child.instanceId}
                            style={[
                              styles.supersetExerciseItem,
                              styles.supersetExerciseItemGrouped,
                              styles.supersetExerciseItemDisabled,
                              index === array.length - 1 && { marginBottom: 12 } // Add extra margin to last item
                            ]}
                          >
                            <Text style={[styles.supersetExerciseName, styles.supersetExerciseNameDisabled]}>
                              {child.name}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                } else {
                  // Standalone exercise
                  return (
                    <TouchableOpacity
                      key={exercise.instanceId}
                      style={[
                        styles.supersetExerciseItem,
                        selectedExerciseIds.has(exercise.instanceId) && styles.supersetExerciseItemSelected
                      ]}
                      onPress={() => handleToggleSupersetSelection(exercise.instanceId)}
                    >
                      <View style={[
                        styles.supersetCheckbox,
                        selectedExerciseIds.has(exercise.instanceId) && styles.supersetCheckboxSelected
                      ]}>
                        {selectedExerciseIds.has(exercise.instanceId) && (
                          <Text style={styles.supersetCheckmark}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.supersetExerciseName}>{exercise.name}</Text>
                    </TouchableOpacity>
                  );
                }
              })}
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* Custom Number Keyboard */}
      {customKeyboardVisible && (
        <View style={styles.customKeyboardContainer}>
          {/* Display Current Value */}
          <View style={styles.customKeyboardHeader}>
            <View style={styles.customKeyboardValueContainer}>
              <Text style={styles.customKeyboardLabel}>
                {customKeyboardTarget?.field === 'weight' ? 'Weight' : 'Reps'}
              </Text>
              <Text style={styles.customKeyboardValue}>
                {customKeyboardValue || '0'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.customKeyboardCloseButton}
              onPress={handleCustomKeyboardClose}
            >
              <X size={20} color={COLORS.slate[600]} />
            </TouchableOpacity>
          </View>
          
          {/* Keyboard Grid */}
          <View style={styles.customKeyboardGrid}>
            <View style={styles.customKeyboardRow}>
              {['1', '2', '3'].map(key => (
                <TouchableOpacity 
                  key={key}
                  style={styles.customKeyboardKey}
                  onPress={() => handleCustomKeyboardInput(key)}
                >
                  <Text style={styles.customKeyboardKeyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customKeyboardRow}>
              {['4', '5', '6'].map(key => (
                <TouchableOpacity 
                  key={key}
                  style={styles.customKeyboardKey}
                  onPress={() => handleCustomKeyboardInput(key)}
                >
                  <Text style={styles.customKeyboardKeyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customKeyboardRow}>
              {['7', '8', '9'].map(key => (
                <TouchableOpacity 
                  key={key}
                  style={styles.customKeyboardKey}
                  onPress={() => handleCustomKeyboardInput(key)}
                >
                  <Text style={styles.customKeyboardKeyText}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.customKeyboardRow}>
              <TouchableOpacity 
                style={styles.customKeyboardKey}
                onPress={() => handleCustomKeyboardInput('.')}
              >
                <Text style={styles.customKeyboardKeyText}>.</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.customKeyboardKey}
                onPress={() => handleCustomKeyboardInput('0')}
              >
                <Text style={styles.customKeyboardKeyText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.customKeyboardKey}
                onPress={() => handleCustomKeyboardInput('backspace')}
              >
                <Delete size={24} color={COLORS.slate[700]} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Bottom Action Row */}
          <View style={styles.customKeyboardActions}>
            <TouchableOpacity 
              style={styles.customKeyboardNextButton}
              onPress={handleCustomKeyboardNext}
            >
              <Text style={styles.customKeyboardNextButtonText}>Next</Text>
              <ChevronRight size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.customKeyboardSubmitButton}
              onPress={handleCustomKeyboardClose}
            >
              <Text style={styles.customKeyboardSubmitButtonText}>Done</Text>
              <Check size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    zIndex: 1, // Ensure header is below move banner if needed, but move banner is absolute zIndex 100
  },
  headerButton: {
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  workoutNameInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[300],
    minWidth: 120,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.slate[400],
  },
  monoText: {
    fontFamily: 'monospace', // Or Platform.OS === 'ios' ? 'Courier' : 'monospace'
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finishButtonDisabled: {
    opacity: 0.5,
  },
  finishButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  notesSection: {
    backgroundColor: COLORS.slate[100],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    flexWrap: 'nowrap',
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[500],
    flexShrink: 1,
  },
  notesBadge: {
    backgroundColor: COLORS.blue[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  notesBadgeText: {
    fontSize: 10,
    color: COLORS.blue[600],
    fontWeight: 'bold',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blue[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  addNoteText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.blue[600],
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  notesList: {
    padding: 16,
  },
  emptyNotesText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.slate[400],
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  exercisesContainer: {
    paddingVertical: 16,
    paddingHorizontal: 5,
    backgroundColor: COLORS.white,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.slate[200],
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  emptyStateText: {
    color: COLORS.slate[400],
    marginBottom: 16,
  },
  emptyStateButton: {
    
  },
  emptyStateButtonText: {
    color: COLORS.blue[600],
    fontWeight: 'bold',
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  bottomFinishButton: {
    backgroundColor: COLORS.blue[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bottomFinishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  exerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    overflow: 'hidden',
    marginBottom: 8,
    marginHorizontal: 0,
  },
  exerciseCard__notMoveMode: {
    borderWidth: 1,
    borderRadius: 8,
  },
  exerciseCard__moveMode: {
    marginBottom: 0,
  },
  exerciseCard__moveMode__notSelected: {
    borderRadius: 8,
    borderColor:  COLORS.slate[200],
  },
  exerciseCard__moveMode__selected: {
    borderWidth: 0,
    borderRadius: 12,
    backgroundColor: COLORS.slate[50],
    zIndex: 10,
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  exerciseCard__groupChild__moveMode__notSelected: {
    marginHorizontal: 6,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.indigo[200],
    borderTopColor: COLORS.indigo[200],
    paddingBottom: 0,
    backgroundColor: COLORS.indigo[50],
    overflow: 'hidden',
  },
  exerciseCard__groupChild__moveMode__selected: {
    marginHorizontal: 6,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 0,
    paddingBottom: 8,
    backgroundColor: COLORS.indigo[100],
  },

  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.blue[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[200],
  },
  exerciseHeader__notMoveMode: {
    backgroundColor: COLORS.slate[50],
    borderBottomWidth: 0,
  },
  exerciseHeader__moveMode__notSelected: {
    borderBottomWidth: 0,
    paddingBottom: 8,
    opacity: 0.4,
  },
  exerciseHeader__moveMode__selected: {
    borderBottomWidth: 0,
    paddingBottom: 16,
    paddingTop: 16,
  },
  exerciseHeader__groupChild: {
    paddingBottom: 8,
  },
  exerciseHeader__groupChild__moving: {
    backgroundColor: COLORS.indigo[100],
  },
  exerciseHeader__groupChild__notMoving: {
    backgroundColor: COLORS.indigo[50],
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  exerciseContent: {
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 0,
    paddingBottom: 4,
  },
  colIndex: {
    width: 32,
    alignItems: 'center',
  },
  colPrevious: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colInputs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 12,
  },
  colCheck: {
    width: 32,
    alignItems: 'center',
  },
  colHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate[400],
    textTransform: 'uppercase',
  },
  setsContainer: {
    // gap: 4,
  },
  restTimerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  restTimerBar__completed: {
    backgroundColor: COLORS.green[50],
  },
  restTimerDropSetIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: COLORS.indigo[500],
  },
  restTimerDropSetIndicator__end: {
    bottom: 8,
  },
  restTimerDropSetIndicator__warmup: {
    backgroundColor: COLORS.orange[500],
  },
  restTimerDropSetIndicator__failure: {
    backgroundColor: COLORS.red[500],
  },
  restTimerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.slate[200],
  },
  restTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 8,
    minWidth: 58,
  },
  restTimerBadge__active: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 70,
  },
  restTimerBadge__completed: {
    // No background for completed state
  },
  restTimerLine__completed: {
    backgroundColor: COLORS.green[500],
    height: 1,
  },
  restTimerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate[500],
  },
  restTimerText__completed: {
    color: COLORS.green[600],
  },
  restTimerText__active: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue[600],
  },
  restTimerText__activeLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.blue[600],
  },
  timerPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerPopupContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
  },
  timerCircleContainer: {
    width: 180,
    height: 180,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerCircleBg: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: COLORS.slate[200],
  },
  timerCircleProgress: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: COLORS.blue[500],
  },
  timerCircleTextContainer: {
    alignItems: 'center',
  },
  timerCircleText: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.slate[800],
  },
  timerCircleSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate[400],
    marginTop: 4,
  },
  timerPopupMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.blue[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
  },
  timerPopupMainButton__paused: {
    backgroundColor: COLORS.green[500],
  },
  timerPopupMainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  timerAdjustContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timerAdjustColumn: {
    gap: 6,
  },
  timerAdjustButton: {
    backgroundColor: COLORS.slate[100],
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    alignItems: 'center',
    minWidth: 60,
  },
  timerAdjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  timerPopupBottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  timerPopupCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
  },
  timerPopupCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  timerPopupCompleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.green[500],
    borderRadius: 8,
  },
  timerPopupCompleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  startTimerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  startTimerButton__disabled: {
    backgroundColor: COLORS.slate[300],
    opacity: 0.6,
  },
  startTimerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  restTimerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.slate[50],
    borderRadius: 12,
  },
  restTimerPreviewText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.slate[300],
  },
  restTimerPreviewText__active: {
    color: COLORS.blue[500],
  },
  dialpad: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  dialpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dialpadButton: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate[200],
  },
  dialpadButtonSecondary: {
    flex: 1,
    height: 52,
    backgroundColor: COLORS.slate[200],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate[300],
  },
  dialpadButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.slate[800],
  },
  dialpadButtonTextSecondary: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[600],
  },
  restPeriodQuickOptions: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  restPeriodQuickOption: {
    flex: 1,
    backgroundColor: COLORS.slate[100],
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    alignItems: 'center',
  },
  restPeriodQuickOption__selected: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[500],
  },
  restPeriodQuickOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  restPeriodQuickOptionText__selected: {
    color: COLORS.white,
  },
  addSetButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: COLORS.transparent,
  },
  addSetButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.blue[600],
  },
  groupContainer: {
    borderWidth: 2,
    borderColor: COLORS.indigo[100],
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 0,
    marginHorizontal: -2,
    marginTop: 16,
    backgroundColor: COLORS.indigo[100], // Darker than previous rgba(224, 231, 255, 0.3)
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.indigo[600],
    textTransform: 'uppercase',
  },
  groupContent: {
    gap: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
    marginBottom: 24,
  },
  noteInput: {
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: COLORS.slate[900],
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: COLORS.slate[600],
  },
  dateIcon: {
    marginRight: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.transparent,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  modalAdd: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blue[600],
  },
  modalAddDisabled: {
    opacity: 0.5,
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalFinish: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.blue[600],
  },
  modalFinishText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  exerciseNote: {
    fontSize: 12,
    color: COLORS.slate[500],
    fontStyle: 'italic',
    marginTop: 2,
  },
  setPopupMenuContainer: {
    position: 'absolute',
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 8, // Originall 12
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.red[500],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  setPopupOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  setPopupOptionItem__active: {
    backgroundColor: COLORS.orange[500],
    borderRadius: 4,
  },
  setPopupOptionItem__activeDropset: {
    backgroundColor: COLORS.blue[500],
    borderRadius: 4,
  },
  setPopupOptionItem__activeFailure: {
    backgroundColor: COLORS.red[500],
    borderRadius: 4,
  },
  setPopupOptionItem__activeRest: {
    backgroundColor: COLORS.blue[500],
    borderRadius: 4,
  },
  setPopupOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.slate[700],
    flex: 1,
  },
  setPopupOptionText__active: {
    color: COLORS.white,
  },
  setPopupOptionText__warmup: {
    color: COLORS.orange[500],
    fontWeight: '700',
  },
  setPopupOptionText__failure: {
    color: COLORS.red[500],
    fontWeight: '700',
  },
  optionDestructive: {
    color: COLORS.red[500],
  },
  
  // Exercise header content
  exerciseHeaderContent: {
    flex: 1,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseHeaderLeft: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  exerciseHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteIconButton: {
    padding: 4,
  },
  addNewNoteButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  addNewNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue[600],
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetHeaderButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addSetHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.blue[600],
  },
  addSetHeaderText__groupChild: {
    color: COLORS.indigo[600],
  },
  optionsButton: {
    padding: 4,
    marginRight: -2,
  },
  expandedNotesContainer: {
    marginTop: 8,
  },
  expandedNotesActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  expandedNotesLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedNotesRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseAddNoteButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  exerciseAddNoteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.blue[600],
  },
  hideNotesButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  hideNotesText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate[400],
  },
  
  // Selection mode footer
  selectionModeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.slate[50],
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[200],
    gap: 12,
  },
  groupTypeDropdownContainer: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  groupTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[300],
    backgroundColor: COLORS.white,
  },
  groupTypeOption__selected: {
    backgroundColor: COLORS.slate[600],
    borderColor: COLORS.slate[600],
  },
  groupTypeOption__warmup: {
    backgroundColor: COLORS.orange[500],
    borderColor: COLORS.orange[500],
  },
  groupTypeOption__dropset: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[500],
  },
  groupTypeOption__failure: {
    backgroundColor: COLORS.red[500],
    borderColor: COLORS.red[500],
  },
  groupTypeOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.slate[700],
  },
  groupTypeOptionText__selected: {
    color: COLORS.white,
  },
  selectionModeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  selectionCancelButton: {
    padding: 8,
  },
  selectionCancelText: {
    color: COLORS.slate[500],
    fontWeight: '600',
  },
  selectionSubmitButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectionSubmitText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  
  // Moving item overlay
  movingItemOverlay: {
    borderWidth: 2,
    borderRadius: 12,
    zIndex: 20,
  },
  movingItemOverlay__groupChild: {
    borderColor: COLORS.indigo[500],
  },
  movingItemOverlay__regular: {
    borderColor: COLORS.blue[500],
  },
  
  // Group child wrapper
  groupChildWrapper: {
    marginHorizontal: -2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingHorizontal: 1,
    borderColor: COLORS.indigo[100],
    backgroundColor: COLORS.indigo[100],
  },
  groupChildWrapper__last: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  groupChildWrapper__moveMode: {
    backgroundColor: COLORS.indigo[50],
  },
  
  // Drop zone styles
  dropZone: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 0,
    marginHorizontal: -2,
  },
  dropZone__lastInGroup: {
    height: 34,
    paddingBottom: 4,
  },
  dropZone__groupChild: {
    marginHorizontal: -2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.indigo[100],
    backgroundColor: COLORS.indigo[50],
  },
  dropZone__regular: {
    marginHorizontal: -2,
  },
  dropZone__groupChild__last: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  dropZoneLineContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  dropZoneLine: {
    height: 2,
    width: '100%',
    backgroundColor: COLORS.blue[300],
  },
  dropZoneLine__groupChild: {
    backgroundColor: COLORS.indigo[300],
  },
  dropZoneText: {
    position: 'absolute',
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dropZoneText__groupChild: {
    backgroundColor: COLORS.indigo[50],
    color: COLORS.indigo[600],
  },
  dropZoneText__regular: {
    backgroundColor: COLORS.slate[50],
    color: COLORS.blue[600],
  },
  
  // Spacer styles
  spacer: {
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 0,
    marginHorizontal: -2,
  },
  spacer__groupChild: {
    marginHorizontal: -2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.indigo[100],
    backgroundColor: COLORS.indigo[50],
  },
  spacer__regular: {
    marginHorizontal: -2,
  },
  spacer__groupChild__last: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 2,
    marginBottom: 16,
  },
  
  // Moving group styles
  movingGroupWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  movingGroupContainer: {
    backgroundColor: COLORS.indigo[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.indigo[400],
    padding: 16,
    marginBottom: 16,
  },
  movingGroupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movingGroupText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.indigo[900],
  },
  
  // Group container variants
  groupContainer__notMoving: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  groupHeader__notMoving: {
    opacity: 0.4,
  },
  
  // Move mode banner
  moveModeBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: COLORS.blue[600],
    padding: 12,
    paddingTop: 80,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    elevation: 5,
  },
  moveModeBannerButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  moveModeBannerCenter: {
    alignItems: 'center',
  },
  moveModeBannerTitle: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  moveModeBannerSubtitle: {
    color: COLORS.blue[100],
    fontSize: 12,
  },
  
  // Finish button variants
  finishButton__cancelMode: {
    backgroundColor: COLORS.slate[500],
  },
  finishButton__cancelWorkout: {
    backgroundColor: COLORS.red[500],
  },
  
  // Main wrapper styles
  mainPressableWrapper: {
    flex: 1,
  },
  mainContentWrapper: {
    flex: 1,
  },

  // Superset Selection Overlay
  supersetSelectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  supersetSelectionBanner: {
    backgroundColor: COLORS.indigo[600],
    padding: 20,
    paddingTop: 60,
  },
  supersetSelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  supersetSelectionSubtitle: {
    fontSize: 14,
    color: COLORS.indigo[100],
    marginBottom: 16,
  },
  supersetSelectionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  supersetCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.indigo[500],
  },
  supersetCancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  supersetConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  supersetConfirmButtonDisabled: {
    opacity: 0.5,
  },
  supersetConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.indigo[600],
  },
  supersetSelectionList: {
    flex: 1,
  },
  supersetSelectionListContent: {
    padding: 16,
  },
  supersetGroupLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4, // Add space between header and first exercise
    backgroundColor: COLORS.indigo[50],
    borderRadius: 8,
  },
  supersetGroupLabelClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4, // Add more space for clickable groups
    backgroundColor: COLORS.indigo[100],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.indigo[300],
  },
  supersetGroupLabelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  supersetGroupLabelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.indigo[600],
    textTransform: 'uppercase',
  },
  supersetGroupLabelSubtext: {
    fontSize: 11,
    color: COLORS.indigo[500],
  },
  supersetExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent', // Transparent border to prevent height change when selected
  },
  supersetExerciseItemGrouped: {
    marginLeft: 16,
    backgroundColor: COLORS.indigo[50],
    marginTop: 0, // Add space after group header
  },
  supersetExerciseItemSelected: {
    backgroundColor: COLORS.indigo[100],
    borderColor: COLORS.indigo[300], // Only change color, not width
  },
  supersetCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  supersetCheckboxSelected: {
    backgroundColor: COLORS.indigo[600],
    borderColor: COLORS.indigo[600],
  },
  supersetCheckmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  supersetExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[900],
    flex: 1,
  },
  supersetExerciseItemDisabled: {
    opacity: 1,
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 0,
  },
  supersetExerciseNameDisabled: {
    color: COLORS.slate[500],
  },

  // Custom Number Keyboard
  customKeyboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.slate[100],
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[300],
    paddingBottom: 20,
  },
  customKeyboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  customKeyboardValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customKeyboardLabel: {
    fontSize: 14,
    color: COLORS.slate[500],
    fontWeight: '500',
  },
  customKeyboardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    minWidth: 80,
  },
  customKeyboardCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.slate[100],
  },
  customKeyboardGrid: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  customKeyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customKeyboardKey: {
    width: 100,
    height: 52,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardKeyText: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.slate[900],
  },
  customKeyboardActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  customKeyboardNextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.blue[500],
    paddingVertical: 14,
    borderRadius: 10,
  },
  customKeyboardNextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  customKeyboardSubmitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.green[500],
    paddingVertical: 14,
    borderRadius: 10,
    marginLeft: 8,
  },
  customKeyboardSubmitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default LiveWorkoutScreen;
