import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, FileText, Plus, Dumbbell, Layers, MoreVertical, CalendarDays, Trash2, RefreshCw, Scale, X, Flame, TrendingDown, Zap, Check, Timer, Pause, Play, Delete } from 'lucide-react-native';
import type { NavigationProp } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { defaultSupersetColorScheme, defaultHiitColorScheme } from '@/constants/defaultStyles';
import { formatDuration } from '@/constants/data';
import SetRow from './SetRow';
import SavedNoteItem from '@/components/SavedNoteItem';
import ExercisePicker from './modals/ExercisePicker';
import NewExercise from './modals/NewExercise';
import { CATEGORIES } from '@/constants/data';
import {
  updateExercisesDeep,
  deleteExerciseDeep,
  findExerciseDeep,
  flattenExercises,
  reconstructExercises,
  formatRestTime,
  parseRestTimeInput,
  getAllSupersets,
  findExerciseSuperset,
  isExerciseInSuperset,
  getStandaloneExercises,
  convertWorkoutUnits
} from '@/utils/workoutHelpers';
import { useWorkoutRestTimer } from './hooks/useWorkoutRestTimer';
import { useWorkoutSupersets } from './hooks/useWorkoutSupersets';
import { useWorkoutGroups } from './hooks/useWorkoutGroups';
import { useWorkoutDragDrop, WorkoutDragItem } from './hooks/useWorkoutDragDrop';
import RestTimerBar from './components/RestTimerBar';
import MoveModeBanner from './components/MoveModeBanner';
import FinishWorkoutModal from './modals/FinishWorkoutModal';
import CancelWorkoutModal from './modals/CancelWorkoutModal';
import RestTimerInputModal from './modals/RestTimerInputModal';
import ActiveRestTimerPopup from './modals/ActiveRestTimerPopup';
import CustomNumberKeyboard from './modals/CustomNumberKeyboard';
import type { Workout, WorkoutMode, ExerciseLibraryItem, ExerciseStatsMap, ExerciseItem, Exercise, Set, RestPeriodSetInfo, FocusNextSet, GroupType } from '@/types/workout';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface WorkoutTemplateProps {
  navigation?: NavigationProp<any>;
  workout: Workout | null;
  mode?: WorkoutMode;
  onUpdate: (workout: Workout) => void;
  onFinish?: () => void;
  onCancel?: () => void;
  exercisesLibrary: ExerciseLibraryItem[];
  addExerciseToLibrary: (exercise: ExerciseLibraryItem) => string;
  updateExerciseInLibrary: (exerciseId: string, updates: Partial<ExerciseLibraryItem>) => void;
  exerciseStats: ExerciseStatsMap;
  customHeader?: React.ReactNode | null;
  customFinishButton?: React.ReactNode | null;
  hideTimer?: boolean;
}

const WorkoutTemplate: React.FC<WorkoutTemplateProps> = ({
  navigation,
  workout,
  mode = 'live',
  onUpdate,
  onFinish,
  onCancel,
  exercisesLibrary,
  addExerciseToLibrary,
  updateExerciseInLibrary,
  exerciseStats,
  customHeader = null,
  customFinishButton = null,
  hideTimer = false,
}) => {
  // Determine mode flags
  const isEditMode = mode === 'edit';
  const isLiveMode = mode === 'live';
  const readOnly = mode === 'readonly';
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newlyCreatedExerciseId, setNewlyCreatedExerciseId] = useState<string | null>(null);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [popupKey, setPopupKey] = useState(0);

  // Exercise Options State
  const [optionsModalExId, setOptionsModalExId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16, originalTop: 0 });
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);
  const [exerciseNoteModalOpen, setExerciseNoteModalOpen] = useState(false);
  const [currentExerciseNote, setCurrentExerciseNote] = useState("");
  const [expandedExerciseNotes, setExpandedExerciseNotes] = useState<Record<string, boolean>>({});

  // Move Mode State
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [originalExercisesSnapshot, setOriginalExercisesSnapshot] = useState<ExerciseItem[] | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Rest Period Modal State
  const [restPeriodModalOpen, setRestPeriodModalOpen] = useState(false);
  const [restPeriodSetInfo, setRestPeriodSetInfo] = useState<RestPeriodSetInfo | null>(null);
  const [restTimerInput, setRestTimerInput] = useState('');
  const [focusNextSet, setFocusNextSet] = useState<FocusNextSet | null>(null);

  // Use the workout prop directly
  const currentWorkout = workout;
  const handleWorkoutUpdate = onUpdate;

  // Create a dummy workout for hooks if currentWorkout is null
  const dummyWorkout: Workout = {
    id: 'dummy',
    name: '',
    startedAt: Date.now(),
    exercises: [],
    sessionNotes: []
  };

  // Custom Hooks
  const {
    activeRestTimer,
    setActiveRestTimer,
    restTimerPopupOpen,
    setRestTimerPopupOpen,
    handleAddRestPeriod: handleAddRestPeriodFromHook,
    startRestTimer,
    cancelRestTimer
  } = useWorkoutRestTimer(currentWorkout || dummyWorkout, handleWorkoutUpdate);

  const {
    supersetSelectionMode,
    selectedExerciseIds,
    handleEditSuperset,
    handleAddToSpecificSuperset,
    handleToggleSupersetSelection,
    handleConfirmSupersetSelection,
    handleCancelSupersetSelection
  } = useWorkoutSupersets(currentWorkout || dummyWorkout, handleWorkoutUpdate);

  const {
    selectionMode,
    setSelectionMode,
    selectedSetIds,
    groupSetType,
    setGroupSetType,
    handleToggleSetSelection,
    handleSubmitDropSet,
    handleCancelDropSet
  } = useWorkoutGroups(currentWorkout || dummyWorkout, handleWorkoutUpdate);

  const {
    isDragging,
    dragItems,
    collapsedGroupId,
    pendingDragCallback,
    pendingDragItemId,
    listRef,
    initiateGroupDrag,
    handlePrepareDrag,
    handleDragBegin,
    handleDragEnd,
    handleCancelDrag,
  } = useWorkoutDragDrop({
    currentWorkout: currentWorkout || dummyWorkout,
    handleWorkoutUpdate,
  });

  // Execute pending drag after layout settles (items collapsed) - for regular exercises
  useEffect(() => {
    if (isDragging && pendingDragCallback.current && pendingDragItemId.current && !collapsedGroupId) {
      // Wait for layout to settle after collapse
      const timer = setTimeout(() => {
        // Scroll to center the item being dragged
        if (pendingDragItemId.current && listRef.current) {
          const itemIndex = dragItems.findIndex(item => item.id === pendingDragItemId.current);
          if (itemIndex !== -1) {
            try {
              listRef.current.scrollToIndex({
                index: itemIndex,
                animated: false,
                viewPosition: 0.5, // Center the item vertically
              });
            } catch (e) {
              // scrollToIndex can fail if layout not ready, ignore
            }
          }
        }

        // Small delay after scroll to let it settle, then trigger drag
        setTimeout(() => {
          if (pendingDragCallback.current) {
            pendingDragCallback.current();
            pendingDragCallback.current = null;
          }
        }, 50);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDragging, pendingDragCallback, pendingDragItemId, dragItems, listRef, collapsedGroupId]);

  // Execute pending drag after group collapse (matches DragAndDropModal pattern)
  useEffect(() => {
    if (collapsedGroupId && pendingDragCallback.current) {
      const timeoutId = setTimeout(() => {
        if (pendingDragCallback.current) {
          pendingDragCallback.current();
          pendingDragCallback.current = null;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [collapsedGroupId, dragItems]);

  // Custom Keyboard State
  const [customKeyboardVisible, setCustomKeyboardVisible] = useState(false);
  const [customKeyboardTarget, setCustomKeyboardTarget] = useState<{ exerciseId: string; setId: string; field: 'weight' | 'reps' | 'duration' | 'distance' } | null>(null);
  const [customKeyboardValue, setCustomKeyboardValue] = useState('');

  // Rest Timer countdown is now handled in useWorkoutRestTimer hook

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

  useEffect(() => {
    if (!currentWorkout) {
      if (isLiveMode && navigation) {
        navigation.goBack();
      }
      return;
    }
    if (!hideTimer && isLiveMode) {
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - currentWorkout.startedAt) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentWorkout, hideTimer, isLiveMode, navigation]);

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

  const handleRemoveNote = (noteId: string) => {
    handleWorkoutUpdate({ ...currentWorkout, sessionNotes: (currentWorkout.sessionNotes || []).filter(n => n.id !== noteId) });
  };

  const handlePinNote = (noteId: string) => {
    handleWorkoutUpdate({ ...currentWorkout, sessionNotes: (currentWorkout.sessionNotes || []).map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n) });
  };

  const sortedNotes = useMemo(() => {
    return [...(currentWorkout.sessionNotes || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [currentWorkout.sessionNotes]);

  const createExerciseInstance = (ex: ExerciseLibraryItem, setCount: number = 1, isDropset: boolean = false): Exercise => {
    // Get pinned notes from the library exercise
    const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.id);
    const pinnedNotes = libraryExercise?.pinnedNotes || [];

    // Generate a shared dropSetId if this is a dropset (groups sets together visually)
    const dropSetId = isDropset ? `dropset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : undefined;

    // Create the specified number of sets
    const sets = Array.from({ length: setCount }, (_, i) => ({
      id: `s-${Date.now()}-${Math.random()}-${i}`,
      type: "Working",
      weight: "",
      reps: "",
      duration: "",
      distance: "",
      completed: false,
      // If dropset, assign the shared dropSetId to group sets together
      ...(dropSetId && { dropSetId })
    }));

    return {
      instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      type: 'exercise',
      sets: sets,
      notes: [...pinnedNotes], // Include pinned notes from library
      collapsed: false
    };
  };

  const handleAddExercisesFromPicker = (selectedExercises: (ExerciseLibraryItem & { _setCount?: number; _isDropset?: boolean })[], groupType: GroupType | null, groupsMetadata: any = null) => {
    if (replacingExerciseId) {
      // Handle Replacement
      if (selectedExercises.length > 0) {
        const setCount = selectedExercises[0]._setCount || 1;
        const isDropset = selectedExercises[0]._isDropset || false;
        const newEx = createExerciseInstance(selectedExercises[0], setCount, isDropset);
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

    // Create instances with the specified set count from grouped exercises
    const newInstances = selectedExercises.map(ex => {
      const setCount = ex._setCount || 1; // Use _setCount if provided, otherwise default to 1
      const isDropset = ex._isDropset || false; // Use _isDropset if provided, otherwise default to false
      return createExerciseInstance(ex, setCount, isDropset);
    });

    let itemsToAdd: ExerciseItem[] = [];

    // Process groupsMetadata if provided
    if (groupsMetadata && Array.isArray(groupsMetadata) && groupsMetadata.length > 0) {
      // Create a map: exercise index -> group it belongs to (if any)
      const exerciseToGroup = new Map<number, typeof groupsMetadata[0]>();
      const exercisesInGroups = new Set<number>();

      groupsMetadata.forEach((group) => {
        group.exerciseIndices.forEach((idx) => {
          if (idx < newInstances.length) {
            exerciseToGroup.set(idx, group);
            exercisesInGroups.add(idx);
          }
        });
      });

      // Build itemsToAdd by iterating through exercises in order
      const processedGroups = new Set<string>();

      for (let i = 0; i < newInstances.length; i++) {
        if (exercisesInGroups.has(i)) {
          const group = exerciseToGroup.get(i);
          if (group && !processedGroups.has(group.id)) {
            // Collect all exercises in this group, sorted by their indices
            const groupExercises = group.exerciseIndices
              .filter(idx => idx < newInstances.length)
              .sort((a, b) => a - b)
              .map(idx => newInstances[idx]);

            if (groupExercises.length > 0) {
              itemsToAdd.push({
                instanceId: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'group',
                groupType: group.type,
                children: groupExercises
              });
              processedGroups.add(group.id);
            }
          }
          // Skip this exercise (it's part of a group we just added)
        } else {
          // Standalone exercise
          itemsToAdd.push(newInstances[i]);
        }
      }
    } else if (groupType && newInstances.length > 1) {
      // Fallback to old behavior if groupsMetadata is not provided
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

  const handleCreateExerciseSave = (newExData: ExerciseLibraryItem) => {
    // Add to library globally - it will create an ID if needed
    const newExerciseId = addExerciseToLibrary(newExData);
    // Set the newly created exercise ID to auto-select it in ExercisePicker
    setNewlyCreatedExerciseId(newExerciseId);
    // Close the NewExercise modal
    setIsCreateModalOpen(false);
    // Reopen the ExercisePicker so user can see the newly created exercise selected
    // Use requestAnimationFrame for fastest possible transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowPicker(true);
      });
    });
  };

  const handleUpdateSet = (exInstanceId: string, updatedSet: Set) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => ({
        ...ex, sets: ex.sets.map(s => s.id === updatedSet.id ? updatedSet : s)
      }))
    });
  };

  const handleAddSet = (exInstanceId: string) => {
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

  const handleToggleComplete = (exInstanceId: string, set: Set) => {
    const isBeingCompleted = !set.completed;

    if (isBeingCompleted) {
      // Mark set as completed
      handleUpdateSet(exInstanceId, { ...set, completed: true });

      // Start rest timer if this set has a rest period
      startRestTimer(exInstanceId, set);

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
      cancelRestTimer(set.id);
    }
  };

  // Custom keyboard handler
  const handleCustomKeyboardOpen = (exerciseId: string, setId: string, field: 'weight' | 'reps' | 'duration' | 'distance', value: string) => {
    setCustomKeyboardTarget({ exerciseId, setId, field });
    setCustomKeyboardValue(value || '');
    setCustomKeyboardVisible(true);
  };

  const handleCustomKeyboardInput = (key: string) => {
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

  const handleDeleteSet = (exInstanceId: string, setId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => ({
        ...ex,
        sets: ex.sets.filter(s => s.id !== setId)
      }))
    });
  };


  const [activeSetMenu, setActiveSetMenu] = useState<{ exerciseId: string; setId: string; top: number; left: number; originalTop: number } | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  // selectionMode and selectedSetIds are now managed by useWorkoutGroups hook

  const handleSetNumberPress = (exerciseId: string, setId: string, pageX: number, pageY: number, width: number, height: number) => {
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

  const handleSetMenuAction = (action: string) => {
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

    handleAddRestPeriodFromHook(exerciseId, setId, seconds);

    setRestPeriodModalOpen(false);
    setRestPeriodSetInfo(null);
    setRestTimerInput('');
  };

  // Group handlers are now in useWorkoutGroups hook

  const handleFinish = () => {
    if (onFinish) {
      onFinish();
    }
  };

  const handleCancel = () => {
    if (currentWorkout.exercises.length > 0) {
      setCancelModalOpen(true);
    } else {
      if (onCancel) {
        onCancel();
      }
    }
  };

  const confirmCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setCancelModalOpen(false);
    if (navigation) {
      navigation.goBack();
    }
  };

  // Exercise Options Handlers
  const handleOpenOptions = (instanceId: string, event: any) => {
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

  const handleDeleteExercise = (instanceId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: deleteExerciseDeep(currentWorkout.exercises, instanceId)
    });
    setOptionsModalExId(null);
  };

  const handleReplaceExercise = (instanceId: string) => {
    setReplacingExerciseId(instanceId);
    setOptionsModalExId(null);
    setShowPicker(true);
  };

  const handleToggleUnit = (instanceId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, instanceId, (ex) => {
        return convertWorkoutUnits(ex);
      })
    });
    setOptionsModalExId(null);
  };

  const handleOpenExerciseNote = (instanceId: string) => {
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

  const handlePinExerciseNote = (exId: string, noteId: string) => {
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

  const handleRemoveExerciseNote = (exId: string, noteId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => ({
        ...ex,
        notes: (ex.notes || []).filter(n => n.id !== noteId)
      }))
    });
  };

  const handleUpdateExerciseNote = (exId: string, updatedNote: any) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exId, (ex) => ({
        ...ex,
        notes: (ex.notes || []).map(n => n.id === updatedNote.id ? updatedNote : n)
      }))
    });
  };

  const toggleExerciseNotes = (exId: string) => {
    setExpandedExerciseNotes(prev => ({ ...prev, [exId]: !prev[exId] }));
  };

  // --- Superset Handlers ---
  // (Now handled by useWorkoutSupersets hook)

  // Wrapper to close options modal when editing superset
  const handleEditSupersetWrapper = (exerciseId: string) => {
    setOptionsModalExId(null);
    handleEditSuperset(exerciseId);
  };

  // --- Move Mode Handlers ---

  const handleStartMove = (itemId: string) => {
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

  const handleMoveItem = (targetIndex: number, forceInsideGroup: boolean = false) => {
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

  const renderExerciseCard = (ex: Exercise, isGroupChild: boolean = false, isLastChild: boolean = false, parentGroupType: GroupType | null = null) => {
    const historyEntries = exerciseStats[ex.exerciseId]?.history || [];
    const groupColorScheme = isGroupChild && parentGroupType
      ? (parentGroupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme)
      : null;

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
      <View
        key={ex.instanceId}
        style={[
          styles.exerciseCard,
          !isMoveMode && styles.exerciseCard__notMoveMode,
          isMoveMode && styles.exerciseCard__moveMode,
          isMoveMode && isNotMoving && styles.exerciseCard__moveMode__notSelected,
          isMoveMode && isMoving && styles.exerciseCard__moveMode__selected,
          isGroupChild && styles.exerciseCard__groupChild,
          isMoveMode && isGroupChild && isNotMoving && groupColorScheme && {
            borderColor: groupColorScheme[200],
            backgroundColor: groupColorScheme[50],
          },
          isMoveMode && isGroupChild && isMoving && groupColorScheme && {
            backgroundColor: groupColorScheme[100],
          },
          isLastChild && !isMoveMode && styles.exerciseCard__groupChild__lastChild
        ]}
      >
        <View style={[
          styles.exerciseHeader,
          !isMoveMode && styles.exerciseHeader__notMoveMode,
          isMoveMode && !isMoving && styles.exerciseHeader__moveMode__notSelected,
          isMoveMode && isMoving && styles.exerciseHeader__moveMode__selected,
          isGroupChild && styles.exerciseHeader__groupChild,
          isGroupChild && isMoving && groupColorScheme && {
            backgroundColor: groupColorScheme[100],
          },
          isGroupChild && !isMoving && groupColorScheme && {
            backgroundColor: groupColorScheme[50],
          }
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
                      isGroupChild && groupColorScheme && { color: groupColorScheme[600] }
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
                        isGroupChild && groupColorScheme && { color: groupColorScheme[600] }
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
              <View style={styles.colCheck}><Text style={styles.colHeaderText}>-</Text></View>
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
                    <SetRow index={idx} set={set} category={ex.category}
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

                      return (
                        <RestTimerBar
                          set={set}
                          exerciseId={ex.instanceId}
                          currentWorkout={currentWorkout}
                          handleWorkoutUpdate={handleWorkoutUpdate}
                          activeRestTimer={activeRestTimer}
                          setActiveRestTimer={setActiveRestTimer}
                          setRestPeriodSetInfo={setRestPeriodSetInfo}
                          setRestTimerInput={setRestTimerInput}
                          setRestPeriodModalOpen={setRestPeriodModalOpen}
                          setRestTimerPopupOpen={setRestTimerPopupOpen}
                          isRestTimerDropSetEnd={isRestTimerDropSetEnd}
                          displayGroupSetType={displayGroupSetType}
                          styles={styles}
                        />
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
              isGroupChild && groupColorScheme ? {
                borderColor: groupColorScheme[500],
              } : styles.movingItemOverlay__regular,
              { opacity: fadeAnim }
            ]}
          />
        )}
      </View>
    );

    if (isGroupChild) {
      return (
        <View
          key={ex.instanceId}
          style={[
            styles.groupChildWrapper,
            groupColorScheme && {
              borderColor: groupColorScheme[100],
              backgroundColor: groupColorScheme[100],
            },
            isLastChild && !isMoveMode && styles.groupChildWrapper__last,
            isMoveMode && groupColorScheme && {
              backgroundColor: groupColorScheme[50],
            }
          ]}
        >
          {cardContent}
        </View>
      );
    }

    return cardContent;
  };

  const renderDropZone = (index: number, isGroupChild: boolean = false, isLastInGroup: boolean = false) => {
    // Find the group type if we are inside a group
    let groupType = "";
    let dropZoneGroupId = null;
    const flatRows = flattenExercises(currentWorkout.exercises);
    let groupColorScheme = null;

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
          groupColorScheme = groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
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
          isGroupChild && groupColorScheme ? {
            borderColor: groupColorScheme[100],
            backgroundColor: groupColorScheme[50],
          } : styles.dropZone__regular,
          isGroupChild && isLastInGroup && groupColorScheme && {
            borderColor: groupColorScheme[100],
            backgroundColor: groupColorScheme[50],
          }
        ]}
        onPress={() => handleMoveItem(index, isGroupChild)}
      >
        <View style={styles.dropZoneLineContainer}>
          <View style={[
            styles.dropZoneLine,
            isGroupChild && groupColorScheme && {
              backgroundColor: groupColorScheme[300],
            }
          ]} />
        </View>
        <Text style={[
          styles.dropZoneText,
          isGroupChild && groupColorScheme ? {
            backgroundColor: groupColorScheme[50],
            color: groupColorScheme[600],
          } : styles.dropZoneText__regular
        ]}>
          {isGroupChild && !isAlreadyInGroup ? `Add to ${groupType}` : "Move here"}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSpacer = (index: number, isGroupChild: boolean = false, isLastInGroup: boolean = false) => {
    const flatRows = flattenExercises(currentWorkout.exercises);
    let groupColorScheme = null;

    if (isGroupChild) {
      // Find the group type
      for (let i = index - 1; i >= 0; i--) {
        if (flatRows[i]?.type === 'group_header') {
          const groupType = flatRows[i].data.groupType;
          groupColorScheme = groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
          break;
        }
      }
    }

    return (
      <View
        key={`spacer-${index}-${isGroupChild ? 'in' : 'out'}`}
        style={[
          styles.spacer,
          isGroupChild && groupColorScheme ? {
            borderColor: groupColorScheme[100],
            backgroundColor: groupColorScheme[50],
          } : styles.spacer__regular,
          isGroupChild && isLastInGroup && groupColorScheme && {
            borderColor: groupColorScheme[100],
            backgroundColor: groupColorScheme[50],
          }
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
        const groupColorScheme = row.data.groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;

        // If moving, we want to render a collapsed version that looks like a single item
        if (isMoving) {
          renderedItems.push(
            <View key={row.id} style={styles.movingGroupWrapper}>
              <Animated.View
                style={[
                  styles.movingGroupContainer,
                  {
                    backgroundColor: groupColorScheme[50],
                    borderColor: groupColorScheme[400],
                    opacity: fadeAnim
                  }
                ]}
              >
                <View style={styles.movingGroupContent}>
                  <Layers size={16} color={groupColorScheme[600]} />
                  <Text style={[styles.movingGroupText, { color: groupColorScheme[700] }]}>
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
                styles.groupContainer__notMoving,
                {
                  borderColor: groupColorScheme[100],
                  backgroundColor: groupColorScheme[100],
                }
              ]}
            >
              <View style={[
                styles.groupHeader,
                isNotMoving && styles.groupHeader__notMoving
              ]}>
                <Layers size={14} color={groupColorScheme[600]} />
                <Text style={[styles.groupTitle, { color: groupColorScheme[600] }]}>{row.data.groupType}</Text>
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
        let parentGroupType = null;
        if (isGroupChild) {
          const nextRow = flatRows[index + 1];
          if (!nextRow || nextRow.type === 'group_header' || nextRow.depth === 0) {
            isLastChild = true;
          }
          // Find parent group to get group type
          for (let i = index - 1; i >= 0; i--) {
            if (flatRows[i].type === 'group_header') {
              parentGroupType = flatRows[i].data.groupType;
              break;
            }
          }
        }

        renderedItems.push(renderExerciseCard(row.data, isGroupChild, isLastChild, parentGroupType));
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

  // Draggable list item renderer - shows collapsed cards when dragging, full view otherwise
  const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<WorkoutDragItem>) => {
    // Helper to initiate drag with two-phase approach - passes item ID for scroll centering
    const initiateDelayedDrag = () => {
      handlePrepareDrag(drag, item.id);
    };

    if (item.type === 'GroupHeader') {
      const groupColorScheme = item.groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;

      // Hide collapsed group headers (they're part of other groups being collapsed)
      if (isCollapsed && !isDraggedGroup) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      return (
        <TouchableOpacity
          onLongPress={() => {
            if (item.groupId) {
              initiateGroupDrag(item.groupId, drag);
            }
          }}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.dragGroupHeader,
            {
              backgroundColor: groupColorScheme[100],
              borderColor: groupColorScheme[200],
            },
            isActive && styles.dragItem__active,
            isDraggedGroup && isActive && {
              borderColor: groupColorScheme[300],
              zIndex: 9999,
              elevation: 20,
            },
          ]}
        >
          <Layers size={16} color={groupColorScheme[600]} />
          <Text style={[styles.dragGroupHeaderText, { color: groupColorScheme[700] }]}>
            {item.groupType} ({item.childCount})
          </Text>
        </TouchableOpacity>
      );
    }

    if (item.type === 'GroupFooter') {
      const groupColorScheme = item.groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;

      // Hide collapsed group footers
      if (isCollapsed) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      return (
        <View
          style={[
            styles.dragGroupFooter,
            {
              backgroundColor: groupColorScheme[100],
              borderColor: groupColorScheme[200],
            },
          ]}
        />
      );
    }

    // Exercise item
    const groupColorScheme = item.groupId
      ? (dragItems.find(d => d.type === 'GroupHeader' && d.groupId === item.groupId) as any)?.groupType === 'HIIT'
        ? defaultHiitColorScheme
        : defaultSupersetColorScheme
      : null;

    const isCollapsed = item.isCollapsed || (collapsedGroupId && item.groupId === collapsedGroupId);

    // Hide collapsed exercises (they're part of a group being dragged)
    if (isCollapsed) {
      return <View style={{ height: 0, overflow: 'hidden' }} />;
    }

    // When dragging or active, show collapsed card
    if (isDragging || isActive) {
      return (
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.dragExerciseCard,
            item.groupId && styles.dragExerciseCard__inGroup,
            item.groupId && groupColorScheme && {
              backgroundColor: groupColorScheme[50],
              borderColor: groupColorScheme[200],
            },
            item.isFirstInGroup && styles.dragExerciseCard__firstInGroup,
            item.isLastInGroup && styles.dragExerciseCard__lastInGroup,
            isActive && styles.dragItem__active,
          ]}
        >
          <View style={styles.dragExerciseContent}>
            <Text style={styles.dragExerciseName}>{item.exercise.name}</Text>
            <Text style={[
              styles.dragExerciseSetCount,
              groupColorScheme && { color: groupColorScheme[600] }
            ]}>
              {item.setCount} sets
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    // When not dragging, render full exercise card wrapped with long-press handler
    const fullCard = renderExerciseCard(
      item.exercise,
      !!item.groupId,
      item.isLastInGroup,
      item.groupId
        ? (dragItems.find(d => d.type === 'GroupHeader' && d.groupId === item.groupId) as any)?.groupType || null
        : null
    );

    // Wrap with TouchableOpacity that triggers two-phase drag
    return (
      <TouchableOpacity
        onLongPress={initiateDelayedDrag}
        delayLongPress={200}
        activeOpacity={1}
        disabled={isActive}
      >
        {fullCard}
      </TouchableOpacity>
    );
  }, [dragItems, isDragging, collapsedGroupId, renderExerciseCard, handlePrepareDrag, initiateGroupDrag]);

  const dragKeyExtractor = useCallback((item: WorkoutDragItem) => item.id, []);

  const notesHeaderComponent = useMemo(() => {
    if (isDragging || isMoveMode) return null;
    return (
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
    );
  }, [isDragging, isMoveMode, showNotes, currentWorkout.sessionNotes, sortedNotes, handlePinNote, handleRemoveNote]);

  const renderDraggableExercises = () => {
    if (currentWorkout.exercises.length === 0) {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {notesHeaderComponent}
          <View style={styles.emptyState}>
            <Dumbbell size={48} color={COLORS.slate[300]} style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateText}>No exercises added yet</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.emptyStateButton}>
              <Text style={styles.emptyStateButtonText}>Add an Exercise</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    return (
      <DraggableFlatList<WorkoutDragItem>
        ref={listRef}
        data={dragItems}
        onDragBegin={handleDragBegin}
        onDragEnd={handleDragEnd}
        keyExtractor={dragKeyExtractor}
        renderItem={renderDragItem}
        contentContainerStyle={styles.dragListContent}
        ListHeaderComponent={notesHeaderComponent}
        ListFooterComponent={
          !isDragging && !readOnly ? (
            <View style={styles.exercisesContainer}>
              <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.addExerciseButton}>
                <Plus size={20} color={COLORS.slate[500]} />
                <Text style={styles.addExerciseButtonText}>ADD EXERCISE</Text>
              </TouchableOpacity>
              {hasExercises && (
                customFinishButton ? customFinishButton : (
                  <TouchableOpacity
                    onPress={() => setFinishModalOpen(true)}
                    style={styles.bottomFinishButton}
                  >
                    <Text style={styles.bottomFinishButtonText}>FINISH WORKOUT</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isMoveMode && (
        <MoveModeBanner
          onCancel={handleCancelMove}
          onDone={handleDoneMove}
          styles={styles}
        />
      )}

      {customHeader ? customHeader : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <ChevronDown size={24} color={COLORS.slate[400]} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <TextInput
              value={currentWorkout.name}
              onChangeText={(text) => handleWorkoutUpdate({ ...currentWorkout, name: text })}
              style={styles.workoutNameInput}
            />
            <View style={styles.headerMeta}>
              <View style={styles.metaItem}>
                <Calendar size={12} color={COLORS.slate[400]} />
                <Text style={styles.metaText}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
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
          {/* Dragging instructions banner with done button */}
          {isDragging && (
            <View style={styles.dragModeInstructions}>
              <Text style={styles.dragModeInstructionsText}>
                Hold & drag to reorder
              </Text>
              <TouchableOpacity
                onPress={handleCancelDrag}
                style={styles.dragModeDoneButton}
              >
                <Text style={styles.dragModeDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main exercise list with DraggableFlatList */}
          {renderDraggableExercises()}

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
                    <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleEditSupersetWrapper(optionsModalExId)}>
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

      <ExercisePicker
        isOpen={showPicker}
        onClose={() => {
          setShowPicker(false);
          setNewlyCreatedExerciseId(null); // Clear the newly created ID when picker closes
        }}
        onAdd={handleAddExercisesFromPicker}
        onCreate={() => {
          // Close ExercisePicker before opening NewExercise (React Native doesn't support nested modals)
          // Use requestAnimationFrame for fastest possible transition
          setShowPicker(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsCreateModalOpen(true);
            });
          });
        }}
        exercises={exercisesLibrary}
        newlyCreatedId={newlyCreatedExerciseId}
      />

      <NewExercise
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          // Reopen ExercisePicker if it was open before (user cancelled creating new exercise)
          // Use requestAnimationFrame for fastest possible transition
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setShowPicker(true);
            });
          });
        }}
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

      <FinishWorkoutModal
        visible={finishModalOpen}
        onClose={() => setFinishModalOpen(false)}
        onFinish={handleFinish}
        styles={styles}
      />

      <CancelWorkoutModal
        visible={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={confirmCancel}
        styles={styles}
      />

      <RestTimerInputModal
        visible={restPeriodModalOpen}
        onClose={() => {
          setRestPeriodModalOpen(false);
          setRestPeriodSetInfo(null);
          setRestTimerInput('');
        }}
        restTimerInput={restTimerInput}
        setRestTimerInput={setRestTimerInput}
        restPeriodSetInfo={restPeriodSetInfo}
        currentWorkout={currentWorkout}
        handleWorkoutUpdate={handleWorkoutUpdate}
        setActiveRestTimer={setActiveRestTimer}
        setRestTimerPopupOpen={setRestTimerPopupOpen}
        onAddRestPeriod={handleAddRestPeriod}
        styles={styles}
      />

      <ActiveRestTimerPopup
        visible={restTimerPopupOpen}
        activeRestTimer={activeRestTimer}
        onClose={() => setRestTimerPopupOpen(false)}
        setActiveRestTimer={setActiveRestTimer}
        currentWorkout={currentWorkout}
        handleWorkoutUpdate={handleWorkoutUpdate}
        styles={styles}
      />

      {/* Superset Selection Mode Overlay */}
      {supersetSelectionMode && (() => {
        // Determine group type: if editing, get from the group; if creating, default to Superset
        let groupType = 'Superset';
        if (supersetSelectionMode.mode === 'edit' && supersetSelectionMode.supersetId) {
          const group = currentWorkout.exercises.find(ex => ex.instanceId === supersetSelectionMode.supersetId);
          if (group && group.groupType) {
            groupType = group.groupType;
          }
        }
        const bannerColorScheme = groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;

        return (
          <Modal visible={true} transparent animationType="fade" onRequestClose={handleCancelSupersetSelection}>
            <View style={styles.supersetSelectionOverlay}>
              <View style={[styles.supersetSelectionBanner, { backgroundColor: bannerColorScheme[600] }]}>
                <Text style={styles.supersetSelectionTitle}>
                  {supersetSelectionMode.mode === 'create' ? `Create ${groupType}` : `Edit ${groupType}`}
                </Text>
                <Text style={[styles.supersetSelectionSubtitle, { color: bannerColorScheme[100] }]}>
                  Select exercises to group together ({selectedExerciseIds.size} selected)
                </Text>
                <View style={styles.supersetSelectionActions}>
                  <TouchableOpacity onPress={handleCancelSupersetSelection} style={[styles.supersetCancelButton, { backgroundColor: bannerColorScheme[500] }]}>
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
                    <Text style={[styles.supersetConfirmButtonText, { color: bannerColorScheme[600] }]}>
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

                    const groupColorScheme = exercise.groupType === 'HIIT' ? defaultHiitColorScheme : defaultSupersetColorScheme;
                    return (
                      <View key={exercise.instanceId}>
                        {canClickGroup ? (
                          // Clickable superset group (for adding to existing superset)
                          <TouchableOpacity
                            style={[
                              styles.supersetGroupLabelClickable,
                              {
                                backgroundColor: groupColorScheme[100],
                                borderColor: groupColorScheme[300],
                              }
                            ]}
                            onPress={() => handleAddToSpecificSuperset(supersetSelectionMode.exerciseId, exercise.instanceId)}
                          >
                            <View style={styles.supersetGroupLabelContent}>
                              <Layers size={14} color={groupColorScheme[600]} />
                              <Text style={[styles.supersetGroupLabelText, { color: groupColorScheme[600] }]}>{exercise.groupType}</Text>
                              <Text style={[styles.supersetGroupLabelSubtext, { color: groupColorScheme[500] }]}>
                                ({exercise.children?.length || 0} exercises)
                              </Text>
                            </View>
                            <ChevronLeft
                              size={16}
                              color={groupColorScheme[600]}
                              style={{ transform: [{ rotate: '180deg' }] }}
                            />
                          </TouchableOpacity>
                        ) : (
                          // Non-clickable group header (when editing that superset)
                          <View style={[
                            styles.supersetGroupLabel,
                            {
                              backgroundColor: groupColorScheme[50],
                            }
                          ]}>
                            <Layers size={14} color={groupColorScheme[600]} />
                            <Text style={[styles.supersetGroupLabelText, { color: groupColorScheme[600] }]}>{exercise.groupType}</Text>
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
                                {
                                  backgroundColor: groupColorScheme[50],
                                  marginLeft: 16,
                                },
                                selectedExerciseIds.has(child.instanceId) && {
                                  backgroundColor: groupColorScheme[100],
                                  borderColor: groupColorScheme[300],
                                },
                                index === array.length - 1 && { marginBottom: 8 } // Add extra margin to last item
                              ]}
                              onPress={() => handleToggleSupersetSelection(child.instanceId)}
                            >
                              <View style={[
                                styles.supersetCheckbox,
                                selectedExerciseIds.has(child.instanceId) && {
                                  backgroundColor: groupColorScheme[600],
                                  borderColor: groupColorScheme[600],
                                }
                              ]}>
                                {selectedExerciseIds.has(child.instanceId) && (
                                  <Text style={styles.supersetCheckmark}>Î“Â£Ã´</Text>
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
                                {
                                  backgroundColor: groupColorScheme[50],
                                  marginLeft: 16,
                                },
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
                          selectedExerciseIds.has(exercise.instanceId) && {
                            backgroundColor: bannerColorScheme[100],
                            borderColor: bannerColorScheme[300],
                          }
                        ]}
                        onPress={() => handleToggleSupersetSelection(exercise.instanceId)}
                      >
                        <View style={[
                          styles.supersetCheckbox,
                          selectedExerciseIds.has(exercise.instanceId) && {
                            backgroundColor: bannerColorScheme[600],
                            borderColor: bannerColorScheme[600],
                          }
                        ]}>
                          {selectedExerciseIds.has(exercise.instanceId) && (
                            <Text style={styles.supersetCheckmark}>Î“Â£Ã´</Text>
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
        );
      })()}

      <CustomNumberKeyboard
        visible={customKeyboardVisible}
        customKeyboardTarget={customKeyboardTarget}
        customKeyboardValue={customKeyboardValue}
        onInput={handleCustomKeyboardInput}
        onNext={handleCustomKeyboardNext}
        onClose={handleCustomKeyboardClose}
        styles={styles}
      />
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
    marginTop: 10,
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
    borderColor: COLORS.slate[200],
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

  // Drag Mode Styles
  dragModeContainer: {
    flex: 1,
  },
  dragModeInstructions: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.blue[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[100],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dragModeInstructionsText: {
    fontSize: 12,
    color: COLORS.blue[700],
    flex: 1,
  },
  dragModeDoneButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dragModeDoneButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  dragListContent: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 100,
  },
  dragGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 0,
    marginTop: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    gap: 8,
  },
  dragGroupHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dragGroupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 4,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  dragExerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginVertical: 2,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  dragExerciseCard__inGroup: {
    borderRadius: 0,
    marginVertical: 0,
    borderWidth: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  dragExerciseCard__firstInGroup: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dragExerciseCard__lastInGroup: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragItem__active: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    transform: [{ scale: 1.02 }],
    zIndex: 999,
  },
  dragExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dragExerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate[900],
    flex: 1,
  },
  dragExerciseSetCount: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.slate[500],
    marginLeft: 12,
  },
});

export default WorkoutTemplate;
