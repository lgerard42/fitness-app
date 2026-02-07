import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Animated, Keyboard, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { ChevronDown, ChevronLeft, ChevronRight, Calendar, Clock, FileText, Plus, Dumbbell, Layers, MoreVertical, Trash2, RefreshCw, X, Flame, Zap, Check, Timer } from 'lucide-react-native';
import type { NavigationProp } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { formatDuration } from '@/constants/data';
import SetRow from './SetRow';
import SavedNoteItem from '@/components/SavedNoteItem';
import ExercisePicker from './modals/ExercisePicker/ExercisePickerIndex';
import EditExercise from './modals/EditExercise';
import { CATEGORIES } from '@/constants/data';
import {
  updateExercisesDeep,
  deleteExerciseDeep,
  findExerciseDeep,
  formatRestTime,
  parseRestTimeInput,
  parseDurationInput,
  findExerciseSuperset,
  isExerciseInSuperset,
  convertWorkoutUnits,
  getGroupColorScheme
} from '@/utils/workoutHelpers';
import { defaultSupersetColorScheme } from '@/constants/defaultStyles';
import { useWorkoutRestTimer } from './hooks/useWorkoutRestTimer';
import { useWorkoutSupersets } from './hooks/useWorkoutSupersets';
import { useWorkoutGroups } from './hooks/useWorkoutGroups';
import { useWorkoutDragDrop, WorkoutDragItem, ExerciseDragItem } from './hooks/useWorkoutDragDrop';
import RestTimerBar from './components/RestTimerBar';
import RestTimerInputModal from './modals/RestTimerInputModal';
import ActiveRestTimerPopup from './modals/ActiveRestTimerPopup';
import CustomNumberKeyboard from './modals/CustomNumberKeyboard';
import SetDragModal from './modals/SetDragModal';
import WorkoutModals from './components/WorkoutModals';
import SetRowHeadersPopup from './components/SetRowHeadersPopup/SetRowHeadersPopup';
import { useSetDragAndDrop } from './hooks/useSetDragAndDrop';
import { useWorkoutNotes, useExerciseNotes } from './hooks/useWorkoutNotes';
import { createExerciseInstance, createExerciseInstanceWithSetGroups } from '@/utils/workoutInstanceHelpers';
import ExerciseHistoryModal from '@/components/ExerciseHistoryModal';
import type { Workout, WorkoutMode, ExerciseLibraryItem, ExerciseStatsMap, ExerciseItem, Exercise, Set, RestPeriodSetInfo, FocusNextSet, GroupType, SetType, ExerciseCategory, ExerciseGroup, Note, GroupSetType } from '@/types/workout';

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
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<ExerciseLibraryItem | null>(null);

  // Exercise Options State
  const [optionsModalExId, setOptionsModalExId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 16, originalTop: 0 });
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView | null>(null);
  const listContainerRef = useRef<View | null>(null);

  // Rest Period Modal State
  const [restPeriodModalOpen, setRestPeriodModalOpen] = useState(false);
  const [restPeriodSetInfo, setRestPeriodSetInfo] = useState<RestPeriodSetInfo | null>(null);
  const [restTimerInput, setRestTimerInput] = useState('');
  const [focusNextSet, setFocusNextSet] = useState<FocusNextSet | null>(null);
  const [restTimerSelectionMode, setRestTimerSelectionMode] = useState(false);
  const [restTimerSelectedSetIds, setRestTimerSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set<string>());

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
    setSelectedSetIds,
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
    itemHeights,
    collapsedItemHeights,
    preCollapsePaddingTop,
    recordTouchPosition,
    setListLayoutY,
    initiateGroupDrag,
    handlePrepareDrag,
    handleDragBegin,
    handleDragEnd,
    alignAfterCollapse,
  } = useWorkoutDragDrop({
    currentWorkout: currentWorkout || dummyWorkout,
    handleWorkoutUpdate,
  });

  const {
    isSetDragActive,
    activeExercise: setDragActiveExercise,
    setDragItems,
    startSetDrag,
    cancelSetDrag,
    saveSetDrag,
    handleSetDragEnd,
    onCreateDropset,
    onUpdateSet,
    onAddSet,
    onUpdateRestTimer,
    onUpdateRestTimerMultiple,
  } = useSetDragAndDrop({
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
        }, 100);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isDragging, pendingDragCallback, pendingDragItemId, dragItems, listRef, collapsedGroupId]);

  // Execute pending drag after group collapse (matches DragAndDropModal pattern)
  // Wait for reorderedDragItems to be set (collapsed state) and then wait for layout to settle
  useEffect(() => {
    if (collapsedGroupId && pendingDragCallback.current && dragItems.length > 0 && pendingDragItemId.current) {
      // Wait for layout to fully settle after collapse before aligning and triggering drag
      // This ensures all collapsed items are rendered and layout calculations are complete
      const timeoutId = setTimeout(() => {
        // Align the collapsed header to keep it at touch position (after all layouts are measured)
        if (pendingDragItemId.current) {
          alignAfterCollapse(pendingDragItemId.current, dragItems);
        }
        // Small additional delay after alignment to let scroll/padding settle
        setTimeout(() => {
          // Ensure we check if we are STILL dragging before calling the callback
          if (pendingDragCallback.current && isDragging) {
            pendingDragCallback.current();
            pendingDragCallback.current = null;
          } else if (pendingDragCallback.current && !isDragging) {
            pendingDragCallback.current = null;
          }
        }, 100);
      }, 100); // Wait for layout to fully settle
      return () => clearTimeout(timeoutId);
    }
  }, [collapsedGroupId, dragItems, alignAfterCollapse, pendingDragItemId, isDragging]);

  // Ensure layout is measured on initial render to fix spacing issue
  useEffect(() => {
    if (listContainerRef.current && !isDragging) {
      // Trigger layout measurement on mount
      listContainerRef.current.measureInWindow?.((_, pageY) => {
        setListLayoutY(pageY);
      });
    }
  }, [isDragging]);

  // Custom Keyboard State
  const [customKeyboardVisible, setCustomKeyboardVisible] = useState(false);
  const [customKeyboardTarget, setCustomKeyboardTarget] = useState<{ exerciseId: string; setId: string; field: 'weight' | 'weight2' | 'reps' | 'duration' | 'distance' } | null>(null);
  const [customKeyboardValue, setCustomKeyboardValue] = useState('');
  const [customKeyboardShouldSelectAll, setCustomKeyboardShouldSelectAll] = useState(false);
  const customKeyboardTextSelectedRef = useRef<boolean>(false);

  // Rest Timer countdown is now handled in useWorkoutRestTimer hook

  // Notes Management - using hooks
  const {
    showNotes,
    setShowNotes,
    isNoteModalOpen,
    setIsNoteModalOpen,
    newNote,
    setNewNote,
    newNoteDate,
    setNewNoteDate,
    sortedNotes,
    handleAddNote,
    handleRemoveNote,
    handlePinNote,
  } = useWorkoutNotes(currentWorkout || dummyWorkout, handleWorkoutUpdate);

  const {
    exerciseNoteModalOpen,
    setExerciseNoteModalOpen,
    currentExerciseNote,
    setCurrentExerciseNote,
    expandedExerciseNotes,
    setExpandedExerciseNotes,
    handleOpenExerciseNote,
    handleSaveExerciseNote,
    handlePinExerciseNote,
    handleRemoveExerciseNote,
    handleUpdateExerciseNote,
    toggleExerciseNotes,
  } = useExerciseNotes(currentWorkout || dummyWorkout, handleWorkoutUpdate);

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

  // Helper to get pinned notes for exercise instance creation
  const getPinnedNotes = (ex: ExerciseLibraryItem): Note[] => {
    const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.id);
    return libraryExercise?.pinnedNotes || [];
  };

  const handleAddExercisesFromPicker = (selectedExercises: (ExerciseLibraryItem & { _setCount?: number; _isDropset?: boolean; _setGroups?: Array<{ count: number; isDropset: boolean }> })[], groupType: GroupType | null, groupsMetadata: any = null) => {
    if (replacingExerciseId) {
      // Handle Replacement
      if (selectedExercises.length > 0) {
        const ex = selectedExercises[0];
        let newEx: Exercise;

        if (ex._setGroups && ex._setGroups.length > 0) {
          // Use setGroups to create sets with proper dropset structure
          newEx = createExerciseInstanceWithSetGroups(ex, ex._setGroups, getPinnedNotes(ex));
        } else {
          // Fallback to old behavior
          const setCount = ex._setCount || 1;
          const isDropset = ex._isDropset || false;
          newEx = createExerciseInstance(ex, setCount, isDropset, getPinnedNotes(ex));
        }

        // Preserve sets if possible? For now, let's just replace with new sets.
        // Or maybe try to map old sets to new? The user said "replace", usually implies a swap.
        // Let's keep it simple: swap the exercise, keep the instanceId? No, new instanceId is safer.
        // But we need to replace in place.

        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updateExercisesDeep(currentWorkout.exercises, replacingExerciseId, (oldEx) => ({
            ...newEx,
            instanceId: oldEx.instanceId // Keep same ID to avoid re-render jumps
          }))
        });
      }
      setReplacingExerciseId(null);
      setShowPicker(false);
      return;
    }

    // Create instances with the specified set count from grouped exercises
    // If _setGroups is provided, use it to create sets with proper dropset grouping
    const newInstances = selectedExercises.map(ex => {
      if (ex._setGroups && ex._setGroups.length > 0) {
        // Use setGroups to create sets with proper dropset structure
        return createExerciseInstanceWithSetGroups(ex, ex._setGroups, getPinnedNotes(ex));
      } else {
        // Fallback to old behavior
        const setCount = ex._setCount || 1; // Use _setCount if provided, otherwise default to 1
        const isDropset = ex._isDropset || false; // Use _isDropset if provided, otherwise default to false
        return createExerciseInstance(ex, setCount, isDropset, getPinnedNotes(ex));
      }
    });

    let itemsToAdd: ExerciseItem[] = [];

    // Process groupsMetadata if provided
    if (groupsMetadata && Array.isArray(groupsMetadata) && groupsMetadata.length > 0) {
      // Create a map: exercise index -> group it belongs to (if any)
      const exerciseToGroup = new Map<number, typeof groupsMetadata[0]>();
      const exercisesInGroups = new Set<number>();

      groupsMetadata.forEach((group) => {
        group.exerciseIndices.forEach((idx: number) => {
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
              .filter((idx: number) => idx < newInstances.length)
              .sort((a: number, b: number) => a - b)
              .map((idx: number) => newInstances[idx]);

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
    // Close the EditExercise modal
    setIsCreateModalOpen(false);
    // Reopen the ExercisePicker so user can see the newly created exercise selected
    // Use requestAnimationFrame for fastest possible transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowPicker(true);
      });
    });
  };

  const handleEditExerciseSave = (updatedExData: ExerciseLibraryItem) => {
    if (selectedExerciseForHistory && selectedExerciseForHistory.id) {
      updateExerciseInLibrary(selectedExerciseForHistory.id, updatedExData);
      setIsCreateModalOpen(false);
      setSelectedExerciseForHistory(null);
    }
  };

  const handleUpdateSet = (exInstanceId: string, updatedSet: Set) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex, sets: ex.sets.map((s: Set) => s.id === updatedSet.id ? updatedSet : s)
        };
      })
    });
  };

  const handleAddSet = (exInstanceId: string) => {
    handleWorkoutUpdate({
      ...currentWorkout,
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => {
        if (ex.type === 'group') return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: Set = {
          id: `s-${Date.now()}-${Math.random()}`, type: "Working" as SetType,
          weight: lastSet ? lastSet.weight : "",
          weight2: lastSet?.weight2 ? lastSet.weight2 : undefined,
          reps: lastSet ? lastSet.reps : "", duration: lastSet ? lastSet.duration : "", distance: lastSet ? lastSet.distance : "",
          completed: false,
          // Copy rest timer if the previous set has one
          ...(lastSet?.restPeriodSeconds && { restPeriodSeconds: lastSet.restPeriodSeconds })
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    });
  };

  const handleToggleComplete = (exInstanceId: string, set: Set) => {
    const isBeingCompleted = !set.completed;

    if (isBeingCompleted) {
      // Helper function to mark rest timers as complete for sets that are completed but don't have restTimerCompleted
      const markInactiveRestTimersComplete = (exercises: ExerciseItem[]): ExerciseItem[] => {
        return exercises.map(item => {
          if (item.type === 'group') {
            return {
              ...item,
              children: markInactiveRestTimersComplete(item.children)
            } as ExerciseItem;
          }
          // For exercises, mark rest timers as complete for sets that:
          // - Have restPeriodSeconds
          // - Are completed
          // - Don't have restTimerCompleted set
          return {
            ...item,
            sets: item.sets.map((s: Set) => {
              if (s.restPeriodSeconds && s.completed && !s.restTimerCompleted) {
                return { ...s, restTimerCompleted: true };
              }
              return s;
            })
          } as ExerciseItem;
        }) as ExerciseItem[];
      };

      // If there's an active rest timer running for a different exercise/set, mark it as complete
      if (activeRestTimer && (activeRestTimer.exerciseId !== exInstanceId || activeRestTimer.setId !== set.id)) {
        // Close the rest timer popup if it's open
        setRestTimerPopupOpen(false);

        // Update both: mark the timer as complete AND mark the new set as complete in one update
        let updatedExercises = updateExercisesDeep(currentWorkout.exercises, activeRestTimer.exerciseId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) => s.id === activeRestTimer.setId ? { ...s, restTimerCompleted: true } : s)
          };
        });

        // Also mark the new set as completed in the same update
        updatedExercises = updateExercisesDeep(updatedExercises, exInstanceId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) => s.id === set.id ? { ...s, completed: true } : s)
          };
        });

        // Mark all inactive rest timers (completed sets with rest timers that aren't marked complete) as complete
        updatedExercises = markInactiveRestTimersComplete(updatedExercises);

        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updatedExercises
        });
        setActiveRestTimer(null);
      } else {
        // Mark set as completed and mark all inactive rest timers as complete
        let updatedExercises = updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) => s.id === set.id ? { ...s, completed: true } : s)
          };
        });

        // Mark all inactive rest timers (completed sets with rest timers that aren't marked complete) as complete
        updatedExercises = markInactiveRestTimersComplete(updatedExercises);

        handleWorkoutUpdate({
          ...currentWorkout,
          exercises: updatedExercises
        });
      }

      // Start rest timer if this set has a rest period
      startRestTimer(exInstanceId, set);

      // Find and focus the next set's input
      const exercise = findExerciseDeep(currentWorkout.exercises, exInstanceId);
      if (exercise) {
        const setIndex = exercise.sets.findIndex(s => s.id === set.id);
        if (setIndex !== -1 && setIndex < exercise.sets.length - 1) {
          const nextSet = exercise.sets[setIndex + 1];
          // Determine which field to focus: first empty one, or reps if both filled
          const libraryExercise = exercisesLibrary.find(libEx => libEx.id === exercise.exerciseId);
          const hasSecondWeight = (exercise.weightEquipTags && exercise.weightEquipTags.length > 1) ||
            (libraryExercise?.weightEquipTags && (libraryExercise.weightEquipTags as string[]).length > 1);

          let fieldToFocus: 'weight' | 'weight2' | 'reps' | 'duration' | 'distance' = 'reps';
          if (exercise.category === 'Lifts') {
            if (!nextSet.weight || nextSet.weight === '') {
              fieldToFocus = 'weight';
            } else if (hasSecondWeight && (!nextSet.weight2 || nextSet.weight2 === '')) {
              fieldToFocus = 'weight2';
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
          } else if (exercise.category === 'Training') {
            // Training exercises use duration and reps
            if (!nextSet.duration || nextSet.duration === '') {
              fieldToFocus = 'duration';
            } else if (!nextSet.reps || nextSet.reps === '') {
              fieldToFocus = 'reps';
            } else {
              fieldToFocus = 'reps';
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

  // Dismiss keyboard and blur inputs when rest timer modal opens
  useEffect(() => {
    if (restPeriodModalOpen) {
      // Dismiss keyboard immediately
      Keyboard.dismiss();
      // Close custom keyboard and clear focus
      setCustomKeyboardVisible(false);
      setCustomKeyboardTarget(null);
      setCustomKeyboardValue('');
      customKeyboardTextSelectedRef.current = false;
      setCustomKeyboardShouldSelectAll(false);
      setFocusNextSet(null);
    }
  }, [restPeriodModalOpen]);

  // Custom keyboard handler
  const handleCustomKeyboardOpen = (exerciseId: string, setId: string, field: 'weight' | 'weight2' | 'reps' | 'duration' | 'distance', value: string) => {
    // Close rest timer modal if open
    if (restPeriodModalOpen) {
      setRestPeriodModalOpen(false);
      setRestPeriodSetInfo(null);
      setRestTimerInput('');
    }
    setCustomKeyboardTarget({ exerciseId, setId, field });

    // For duration, if value is in mm:ss format, convert to raw seconds for editing
    let rawValue = value || '';
    if (field === 'duration' && value && value.includes(':')) {
      const parts = value.split(':');
      if (parts.length === 2) {
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        rawValue = String(mins * 60 + secs);
      }
    }

    setCustomKeyboardValue(rawValue);
    // If there's an existing value, text will be selected due to selectTextOnFocus={true}
    const hasValue = !!(rawValue && rawValue.trim() !== '');
    customKeyboardTextSelectedRef.current = hasValue;
    setCustomKeyboardShouldSelectAll(false);
    setCustomKeyboardVisible(true);
  };

  const handleCustomKeyboardInput = (key: string) => {
    // Only process input if custom keyboard is the active target (not timer modal)
    if (!customKeyboardTarget || restPeriodModalOpen) {
      return;
    }

    let newValue;
    const isTextSelected = customKeyboardTextSelectedRef.current;

    if (key === 'backspace') {
      // If entire value is selected, clear it completely; otherwise remove last character
      if (isTextSelected) {
        newValue = '';
        setCustomKeyboardShouldSelectAll(false);
      } else {
        newValue = customKeyboardValue.slice(0, -1);
      }
    } else if (key === '.') {
      // If text is selected, replace with '.'; otherwise append if no decimal exists
      if (isTextSelected) {
        newValue = '.';
        // After replacing, cursor should be at end (not selecting all)
        setCustomKeyboardShouldSelectAll(false);
      } else if (!customKeyboardValue.includes('.')) {
        newValue = customKeyboardValue + '.';
      } else {
        return; // Don't add another decimal
      }
    } else {
      // If text is selected, replace with the key; otherwise append
      if (isTextSelected) {
        newValue = key;
        // After first number replaces selection, cursor should be at end for subsequent numbers
        setCustomKeyboardShouldSelectAll(false);
        // Mark that user has typed so cursor positions at end
        customKeyboardTextSelectedRef.current = false; // Clear selection flag
      } else {
        newValue = customKeyboardValue + key;
      }
    }

    // Reset selection flag after first input (unless we want to select all for +/-)
    if (!customKeyboardShouldSelectAll) {
      customKeyboardTextSelectedRef.current = false;
    }

    setCustomKeyboardValue(newValue);

    // Also update the set value in real-time
    const { exerciseId, setId, field } = customKeyboardTarget;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (exercise) {
      const set = exercise.sets.find(s => s.id === setId);
      if (set) {
        // Store raw value directly - don't parse duration until blur (handled in SetRow)
        handleUpdateSet(exerciseId, { ...set, [field]: newValue });
      }
    }
  };

  const handleCustomKeyboardSetValue = (value: string, shouldSelectAll: boolean = false) => {
    // Only process set value if custom keyboard is the active target (not timer modal)
    if (!customKeyboardTarget || restPeriodModalOpen) {
      return;
    }

    setCustomKeyboardValue(value);
    setCustomKeyboardShouldSelectAll(shouldSelectAll);
    customKeyboardTextSelectedRef.current = shouldSelectAll;

    // Also update the set value in real-time
    const { exerciseId, setId, field } = customKeyboardTarget;
    const exercise = findExerciseDeep(currentWorkout.exercises, exerciseId);
    if (exercise) {
      const set = exercise.sets.find(s => s.id === setId);
      if (set) {
        // Store raw value directly - don't parse duration until blur (handled in SetRow)
        handleUpdateSet(exerciseId, { ...set, [field]: value });
      }
    }
  };

  const closeCustomKeyboard = () => {
    // Dismiss the native keyboard first - this will blur all TextInputs
    Keyboard.dismiss();
    // Use a small delay to ensure keyboard dismissal completes
    setTimeout(() => {
      setCustomKeyboardVisible(false);
      setCustomKeyboardTarget(null);
      setCustomKeyboardValue('');
      customKeyboardTextSelectedRef.current = false;
      setCustomKeyboardShouldSelectAll(false);
      // Clear any input focus state
      setFocusNextSet(null);
    }, 50);
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
      // Check if exercise has second weight
      const libraryExercise = exercisesLibrary.find(libEx => libEx.id === exercise.exerciseId);
      const hasSecondWeight = (exercise.weightEquipTags && exercise.weightEquipTags.length > 1) ||
        (libraryExercise?.weightEquipTags && (libraryExercise.weightEquipTags as string[]).length > 1);

      const set = exercise.sets[setIndex];
      // Close rest timer modal if open
      if (restPeriodModalOpen) {
        setRestPeriodModalOpen(false);
        setRestPeriodSetInfo(null);
        setRestTimerInput('');
      }

      if (hasSecondWeight) {
        // Move to weight2 of the same set
        setCustomKeyboardTarget({ exerciseId, setId, field: 'weight2' });
        setCustomKeyboardValue(set.weight2 || '');
      } else {
        // Move to reps of the same set
        setCustomKeyboardTarget({ exerciseId, setId, field: 'reps' });
        setCustomKeyboardValue(set.reps || '');
      }
    } else if (field === 'weight2') {
      // Move to reps of the same set
      const set = exercise.sets[setIndex];
      // Close rest timer modal if open
      if (restPeriodModalOpen) {
        setRestPeriodModalOpen(false);
        setRestPeriodSetInfo(null);
        setRestTimerInput('');
      }
      setCustomKeyboardTarget({ exerciseId, setId, field: 'reps' });
      setCustomKeyboardValue(set.reps || '');
    } else if (field === 'reps') {
      // Move to weight of the next set
      if (setIndex < exercise.sets.length - 1) {
        const nextSet = exercise.sets[setIndex + 1];
        // Close rest timer modal if open
        if (restPeriodModalOpen) {
          setRestPeriodModalOpen(false);
          setRestPeriodSetInfo(null);
          setRestTimerInput('');
        }
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
      exercises: updateExercisesDeep(currentWorkout.exercises, exInstanceId, (ex) => {
        if (ex.type === 'group') return ex;
        return {
          ...ex,
          sets: ex.sets.filter((s: Set) => s.id !== setId)
        };
      })
    });
  };


  const [activeSetMenu, setActiveSetMenu] = useState<{ exerciseId: string; setId: string; top: number; left: number; originalTop: number } | null>(null);
  const [columnHeaderMenu, setColumnHeaderMenu] = useState<{ exerciseId: string; field: 'weight' | 'reps' | 'distance' | 'duration'; top: number; left: number } | null>(null);
  const [columnHeaderMenuPage, setColumnHeaderMenuPage] = useState<'main' | 'configure'>('main');
  const [scrollOffset, setScrollOffset] = useState(0);
  // selectionMode and selectedSetIds are now managed by useWorkoutGroups hook

  const handleSetNumberPress = (exerciseId: string, setId: string, pageX: number, pageY: number, width: number, height: number) => {
    // Close exercise-level popup if open
    setOptionsModalExId(null);

    // Calculate position using event coordinates directly
    // Note: ScrollView doesn't have measure, so we use approximate positioning
    const visibleTop = pageY - 100; // Approximate offset
    const contentTop = visibleTop + scrollOffset;
    const popupLeft = pageX + width / 2 + 14;

    // Force popup re-mount and position it correctly
    setPopupKey(prev => prev + 1);
    setActiveSetMenu({
      exerciseId,
      setId,
      top: visibleTop,
      left: popupLeft,
      originalTop: contentTop
    });
  };

  const handleColumnHeaderPress = (exerciseId: string, field: 'weight' | 'reps' | 'distance' | 'duration', event: any) => {
    // Close other popups if open
    setOptionsModalExId(null);
    setActiveSetMenu(null);

    const { pageX, pageY } = event.nativeEvent;
    const screenWidth = Dimensions.get('window').width;
    const popupWidth = 220; // minWidth from styles
    const popupHeight = 150; // Approximate height

    // Calculate position, ensuring it doesn't go off screen
    let popupLeft = pageX - popupWidth / 2; // Center relative to click
    let visibleTop = pageY - 100; // Approximate offset

    // Adjust if popup would go off right edge
    if (popupLeft + popupWidth > screenWidth - 16) {
      popupLeft = screenWidth - popupWidth - 16;
    }
    // Adjust if popup would go off left edge
    if (popupLeft < 16) {
      popupLeft = 16;
    }
    // Adjust if popup would go off bottom (approximate)
    if (visibleTop + popupHeight > Dimensions.get('window').height - 100) {
      visibleTop = pageY - popupHeight - 20; // Position above instead
    }
    // Adjust if popup would go off top
    if (visibleTop < 16) {
      visibleTop = 16;
    }

    // Force popup re-mount and position it correctly
    setPopupKey(prev => prev + 1);
    setColumnHeaderMenu({
      exerciseId,
      field,
      top: visibleTop,
      left: popupLeft
    });
  };

  const handleSetMenuAction = (action: string) => {
    if (!activeSetMenu) return;
    const { exerciseId, setId } = activeSetMenu;

    if (action === 'warmup' || action === 'dropset' || action === 'failure') {
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          if (ex.type === 'group') return ex;
          const newSets = ex.sets.map((s: Set) => {
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
      if (!exercise) {
        setActiveSetMenu(null);
        return;
      }
      const set = exercise.sets.find((s: Set) => s.id === setId);

      if (set?.dropSetId) {
        // Grouped set: Pre-populate selection with all sets in the group
        const groupSetIds = exercise.sets
          .filter((s: Set) => s.dropSetId === set.dropSetId)
          .map((s: Set) => s.id);

        // Check if all sets in the group have the same type
        const groupSets = exercise.sets.filter((s: Set) => s.dropSetId === set.dropSetId);
        const allWarmup = groupSets.length > 0 && groupSets.every((s: Set) => s.isWarmup);
        const allFailure = groupSets.length > 0 && groupSets.every((s: Set) => s.isFailure);

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
        setSelectionMode({ exerciseId, type: 'drop_set', editingGroupId: undefined });
        setSelectedSetIds(new Set([setId]));
      }
      setActiveSetMenu(null);
    } else if (action === 'add_rest') {
      // Open rest timer input modal
      // Close custom keyboard if open and clear all input state
      if (customKeyboardTarget || customKeyboardVisible) {
        closeCustomKeyboard();
      }
      // Ensure all custom keyboard state is cleared
      setCustomKeyboardTarget(null);
      setCustomKeyboardValue('');
      setCustomKeyboardVisible(false);
      setFocusNextSet(null);
      setRestPeriodSetInfo({ exerciseId, setId });
      setRestTimerInput('');
      setRestPeriodModalOpen(true);
      setActiveSetMenu(null);
    } else if (action === 'remove_rest') {
      // Remove rest period from this set
      handleWorkoutUpdate({
        ...currentWorkout,
        exercises: updateExercisesDeep(currentWorkout.exercises, exerciseId, (ex) => {
          if (ex.type === 'group') return ex;
          return {
            ...ex,
            sets: ex.sets.map((s: Set) => {
              if (s.id === setId) {
                const { restPeriodSeconds, ...rest } = s;
                return rest;
              }
              return s;
            })
          };
        })
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
          if (ex.type === 'group') return ex;
          const currentSetIndex = ex.sets.findIndex((s: Set) => s.id === setId);
          if (currentSetIndex === -1) return ex;

          const currentSet = ex.sets[currentSetIndex];
          const newSet: Set = {
            id: `s-${Date.now()}-${Math.random()}`,
            type: "Working" as SetType,
            weight: currentSet.weight || "",
            weight2: currentSet.weight2 ? currentSet.weight2 : undefined,
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
      // Before finishing, multiply weights or reps by 2 for exercises with the toggle active
      // Create a modified workout with multiplied values
      const modifiedWorkout = {
        ...currentWorkout,
        exercises: currentWorkout.exercises.map(ex => {
          if (ex.type === 'group') {
            return {
              ...ex,
              children: ex.children.map(child => {
                if (child.multiplyWeightBy2) {
                  return {
                    ...child,
                    sets: child.sets.map(set => ({
                      ...set,
                      weight: set.weight && set.weight !== '' ? String((parseFloat(set.weight) || 0) * 2) : set.weight,
                      weight2: set.weight2 && set.weight2 !== '' ? String((parseFloat(set.weight2) || 0) * 2) : set.weight2
                    }))
                  };
                } else if (child.alternatingRepsBy2) {
                  return {
                    ...child,
                    sets: child.sets.map(set => ({
                      ...set,
                      reps: set.reps && set.reps !== '' ? String((parseFloat(set.reps) || 0) * 2) : set.reps
                    }))
                  };
                }
                return child;
              })
            };
          } else {
            if (ex.multiplyWeightBy2) {
              return {
                ...ex,
                sets: ex.sets.map(set => ({
                  ...set,
                  weight: set.weight && set.weight !== '' ? String((parseFloat(set.weight) || 0) * 2) : set.weight,
                  weight2: set.weight2 && set.weight2 !== '' ? String((parseFloat(set.weight2) || 0) * 2) : set.weight2
                }))
              };
            } else if (ex.alternatingRepsBy2) {
              return {
                ...ex,
                sets: ex.sets.map(set => ({
                  ...set,
                  reps: set.reps && set.reps !== '' ? String((parseFloat(set.reps) || 0) * 2) : set.reps
                }))
              };
            }
          }
          return ex;
        })
      };

      // Update the workout with multiplied weights, then finish after update completes
      handleWorkoutUpdate(modifiedWorkout);

      // Use requestAnimationFrame to ensure the update is processed before finishing
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (onFinish) {
            onFinish();
          }
        }, 50);
      });
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

    // Calculate position using event coordinates directly
    // Note: ScrollView doesn't have measure, so we use approximate positioning
    const visibleTop = pageY - 100; // Approximate offset
    const contentTop = visibleTop + scrollOffset;
    setDropdownPos({ top: visibleTop, right: 16, originalTop: contentTop });
    setOptionsModalExId(instanceId);
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
        if (ex.type === 'group') return ex;
        return convertWorkoutUnits(ex);
      })
    });
    setOptionsModalExId(null);
  };

  // Exercise note handlers are now in useExerciseNotes hook
  // Wrapper to handle replacingExerciseId state for exercise replacement
  const handleOpenExerciseNoteWrapper = (instanceId: string) => {
    setReplacingExerciseId(instanceId);
    setOptionsModalExId(null);
    handleOpenExerciseNote(instanceId);
  };

  // --- Superset Handlers ---
  // (Now handled by useWorkoutSupersets hook)

  // Wrapper to close options modal when editing superset
  const handleEditSupersetWrapper = (exerciseId: string) => {
    setOptionsModalExId(null);
    handleEditSuperset(exerciseId);
  };



  const hasExercises = currentWorkout.exercises.length > 0;

  // Helper function to determine which columns should be visible for an exercise
  const getVisibleColumns = (exercise: Exercise, libraryExercise?: ExerciseLibraryItem): {
    showDuration: boolean;
    showDistance: boolean;
    showWeight: boolean;
    showReps: boolean;
  } => {
    // Use exercise instance fields first, fallback to library exercise if needed
    const trackDuration = exercise.trackDuration ?? (libraryExercise?.trackDuration as boolean | undefined) ?? false;
    const trackReps = exercise.trackReps ?? (libraryExercise?.trackReps as boolean | undefined) ?? false;
    const trackDistance = exercise.trackDistance ?? (libraryExercise?.trackDistance as boolean | undefined) ?? false;
    const weightEquipTags = exercise.weightEquipTags ?? (libraryExercise?.weightEquipTags as string[] | undefined) ?? [];
    const hasWeightEquip = Array.isArray(weightEquipTags) && weightEquipTags.length > 0;

    return {
      // Show duration if category is Cardio OR trackDuration is true
      showDuration: exercise.category === 'Cardio' || trackDuration === true,
      // Show distance for Cardio OR for Training if trackDistance is true
      showDistance: exercise.category === 'Cardio' || (exercise.category === 'Training' && trackDistance === true),
      // Show weight for Lifts always, OR for Cardio/Training if weightEquipTags is used
      showWeight: exercise.category === 'Lifts' || (hasWeightEquip && (exercise.category === 'Cardio' || exercise.category === 'Training')),
      // Show reps for Lifts always, OR for Training if trackReps is true
      showReps: exercise.category === 'Lifts' || (exercise.category === 'Training' && trackReps === true)
    };
  };

  const renderExerciseCard = (ex: Exercise, isGroupChild: boolean = false, isLastChild: boolean = false, parentGroupType: GroupType | null = null, parentGroupId: string | null = null, isFirstChild: boolean = false) => {
    const historyEntries = exerciseStats[ex.exerciseId]?.history || [];
    const groupColorScheme = isGroupChild && parentGroupType
      ? getGroupColorScheme(parentGroupType)
      : null;

    // Helper function to compute indices for historical sets
    const computeHistoricalIndices = (historicalSets: Array<{
      weight: string;
      weight2?: string;
      reps: string;
      duration: string;
      distance: string;
      isWarmup: boolean;
      isFailure: boolean;
      dropSetId: string | null;
    }>) => {
      const indices = [];
      let warmupGroupNum = 0;
      let workingGroupNum = 0;
      const seenWarmupGroups = new Set();
      const seenWorkingGroups = new Set();

      for (let i = 0; i < historicalSets.length; i++) {
        const s = historicalSets[i];
        let warmupIdx: { group: number; subIndex: number | null } | null = null;
        let workingIdx: { group: number; subIndex: number | null } | null = null;

        if (s.isWarmup) {
          if (s.dropSetId) {
            if (!seenWarmupGroups.has(s.dropSetId)) {
              seenWarmupGroups.add(s.dropSetId);
              warmupGroupNum++;
            }
            // Find sub-index within warmup dropset
            const warmupGroupSets = historicalSets.filter((hs: typeof s) => hs.dropSetId === s.dropSetId && hs.isWarmup);
            const subIdx = warmupGroupSets.findIndex((hs: typeof s) => hs === s) + 1;
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
            const workingGroupSets = historicalSets.filter((hs: typeof s) => hs.dropSetId === s.dropSetId && !hs.isWarmup);
            const subIdx = workingGroupSets.findIndex((hs: typeof s) => hs === s) + 1;
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
    const getPreviousSetData = (
      currentSet: Set,
      currentWarmupIndex: { group: number; subIndex: number | null } | null,
      currentWorkingIndex: { group: number; subIndex: number | null } | null
    ) => {
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
    const convertPreviousSet = (prevSet: {
      weight: string;
      weight2?: string;
      reps: string;
      duration: string;
      distance: string;
      isWarmup: boolean;
      isFailure: boolean;
      dropSetId: string | null;
      isFromOlderHistory?: boolean;
    } | null): Set | null => {
      if (!prevSet) return null;

      // Create a Set object from the previous set data
      const convertedSet: Set = {
        id: `prev-${Date.now()}`,
        type: prevSet.isWarmup ? 'Warmup' as SetType : prevSet.isFailure ? 'Failure' as SetType : 'Working' as SetType,
        weight: prevSet.weight,
        weight2: prevSet.weight2,
        reps: prevSet.reps,
        duration: prevSet.duration,
        distance: prevSet.distance,
        completed: false,
        isWarmup: prevSet.isWarmup,
        isFailure: prevSet.isFailure,
        dropSetId: prevSet.dropSetId || undefined
      };

      // If current unit is kg, convert previous (assumed lbs) to kg
      if (ex.weightUnit === 'kg' && ex.category === 'Lifts') {
        if (convertedSet.weight) {
          const val = parseFloat(convertedSet.weight);
          if (!isNaN(val)) {
            convertedSet.weight = (val / 2.20462).toFixed(1);
          }
        }
        if (convertedSet.weight2) {
          const val = parseFloat(convertedSet.weight2);
          if (!isNaN(val)) {
            convertedSet.weight2 = (val / 2.20462).toFixed(1);
          }
        }
      }
      return convertedSet;
    };

    const cardContent = (
      <View
        key={ex.instanceId}
        style={[
          styles.exerciseCard,
          isGroupChild && styles.exerciseCard__groupChild,
          isGroupChild && isFirstChild && styles.exerciseCard__groupChild__first,
          isGroupChild && isLastChild && styles.exerciseCard__groupChild__last,
          isGroupChild && groupColorScheme && {
            borderColor: groupColorScheme[100],
          },
          isLastChild && styles.groupChildWrapper__last
        ]}
      >
        <View style={[
          styles.exerciseHeader,
          isGroupChild && styles.exerciseHeader__groupChild,
          isGroupChild && groupColorScheme && {
            backgroundColor: groupColorScheme[50],
          }
        ]}>
          <View style={styles.exerciseHeaderContent}>
            <View style={styles.exerciseHeaderRow}>
              <View style={styles.exerciseHeaderLeft}>
                <View style={styles.exerciseNameRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
                      if (libraryExercise) {
                        setSelectedExerciseForHistory(libraryExercise);
                        setHistoryModalVisible(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exerciseName}>{ex.name}</Text>
                  </TouchableOpacity>
                  <View style={styles.exerciseHeaderIcons}>
                    <TouchableOpacity
                      onPress={() => {
                        if (!ex.notes || ex.notes.length === 0) {
                          handleOpenExerciseNoteWrapper(ex.instanceId);
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
                </View>
              </View>

              {!expandedExerciseNotes[ex.instanceId] && !readOnly && (
                <View style={styles.exerciseHeaderActions}>
                  <TouchableOpacity onPress={(e) => handleOpenOptions(ex.instanceId, e)} style={styles.optionsButton}>
                    <MoreVertical size={20} color={COLORS.slate[400]} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {expandedExerciseNotes[ex.instanceId] && ex.notes && ex.notes.length > 0 && (
              <View style={styles.expandedNotesContainer}>
                {[...ex.notes].sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return 0;
                }).map((note) => (
                  <SavedNoteItem
                    key={note.id}
                    note={note}
                    onPin={(noteId) => handlePinExerciseNote(ex.instanceId, noteId, exercisesLibrary, updateExerciseInLibrary)}
                    onRemove={(noteId) => handleRemoveExerciseNote(ex.instanceId, noteId)}
                    onUpdate={(updatedNote) => handleUpdateExerciseNote(ex.instanceId, updatedNote)}
                  />
                ))}

                <View style={styles.expandedNotesActions}>
                  <View style={styles.expandedNotesLeftActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenExerciseNoteWrapper(ex.instanceId)}
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
                    <TouchableOpacity onPress={(e) => handleOpenOptions(ex.instanceId, e)} style={styles.optionsButton}>
                      <MoreVertical size={20} color={COLORS.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
        <View style={styles.exerciseContent}>
          {(() => {
            // Get library exercise for configuration lookup if needed
            const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
            const visibleColumns = getVisibleColumns(ex, libraryExercise);

            // Determine if exercise has second weight equipment
            const hasSecondWeight: boolean = (ex.weightEquipTags && ex.weightEquipTags.length > 1) ||
              (!!(libraryExercise?.weightEquipTags) && (libraryExercise.weightEquipTags as string[]).length > 1);

            return (
              <View style={styles.columnHeaders}>
                <View style={styles.colIndex}><Text style={styles.colHeaderText}>Set</Text></View>
                <View style={styles.colPrevious}><Text style={styles.colHeaderText}>Previous</Text></View>
                {visibleColumns.showDuration && (
                  <TouchableOpacity
                    style={styles.colDuration}
                    onPress={(e) => !readOnly && handleColumnHeaderPress(ex.instanceId, 'duration', e)}
                    disabled={readOnly}
                  >
                    <Text style={styles.colHeaderText}>Duration</Text>
                  </TouchableOpacity>
                )}
                {visibleColumns.showDistance && (
                  <TouchableOpacity
                    style={styles.colDistance}
                    onPress={(e) => !readOnly && handleColumnHeaderPress(ex.instanceId, 'distance', e)}
                    disabled={readOnly}
                  >
                    <Text style={styles.colHeaderText}>
                      {(() => {
                        const system = ex.distanceUnitSystem || 'US';
                        const unit = ex.distanceUnit || (system === 'US' ? 'mi' : 'm');
                        let unitText = '';
                        if (system === 'US') {
                          unitText = unit === 'ft' ? 'ft' : unit === 'yd' ? 'yd' : 'mi';
                        } else {
                          unitText = unit === 'km' ? 'km' : 'm';
                        }
                        return `Dist. (${unitText})`;
                      })()}
                    </Text>
                  </TouchableOpacity>
                )}
                {visibleColumns.showWeight && (
                  <TouchableOpacity
                    style={[styles.colWeight, hasSecondWeight && styles.colWeight__twoInputs]}
                    onPress={(e) => !readOnly && handleColumnHeaderPress(ex.instanceId, 'weight', e)}
                    disabled={readOnly}
                  >
                    <Text style={styles.colHeaderText}>
                      {`${ex.weightUnit || 'lbs'}${ex.multiplyWeightBy2 ? ' (x2)' : ''}`}
                    </Text>
                  </TouchableOpacity>
                )}
                {visibleColumns.showReps && (
                  <TouchableOpacity
                    style={[styles.colReps, hasSecondWeight && styles.colReps__twoWeightInputs]}
                    onPress={(e) => !readOnly && handleColumnHeaderPress(ex.instanceId, 'reps', e)}
                    disabled={readOnly}
                  >
                    <Text style={styles.colHeaderText}>
                      {`Reps${ex.alternatingRepsBy2 ? ' (x2)' : ''}`}
                    </Text>
                  </TouchableOpacity>
                )}
                <View style={styles.colCheck}><Text style={styles.colHeaderText}>-</Text></View>
              </View>
            );
          })()}
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
              const isBeingEdited = restPeriodSetInfo?.setId === set.id && restPeriodModalOpen;
              const showRestTimer = (set.restPeriodSeconds || isBeingEdited) && !readOnly;
              const isRestTimerActive = activeRestTimer?.setId === set.id;

              const isRestTimerSelected = restTimerSelectedSetIds.has(set.id);
              const shouldWrapInSelectionBorder = restTimerSelectionMode;
              const isRestTimerDropSetStart = !!(set.dropSetId && (idx === 0 || ex.sets[idx - 1]?.dropSetId !== set.dropSetId));
              const isRestTimerDropSetEnd = !!(set.dropSetId && (idx === ex.sets.length - 1 || ex.sets[idx + 1]?.dropSetId !== set.dropSetId));
              const toggleRestTimerSelection = () => {
                setRestTimerSelectedSetIds((prev: globalThis.Set<string>) => {
                  const newSet = new globalThis.Set<string>(prev);
                  if (newSet.has(set.id)) {
                    newSet.delete(set.id);
                  } else {
                    newSet.add(set.id);
                  }
                  return newSet;
                });
              };

              // Get visible columns for this exercise
              const libraryExercise = exercisesLibrary.find(libEx => libEx.id === ex.exerciseId);
              const visibleColumns = getVisibleColumns(ex, libraryExercise);

              // Determine if exercise has second weight equipment
              const hasSecondWeight: boolean = (ex.weightEquipTags && ex.weightEquipTags.length > 1) ||
                (!!(libraryExercise?.weightEquipTags) && (libraryExercise.weightEquipTags as string[]).length > 1);

              const setRowProps = {
                index: idx,
                set,
                category: ex.category,
                weightUnit: ex.weightUnit,
                previousSet: previousData ? convertPreviousSet(previousData) : null,
                previousSetIsFromOlderHistory: previousData?.isFromOlderHistory || false,
                onUpdate: (s: Set) => handleUpdateSet(ex.instanceId, s),
                onToggle: () => handleToggleComplete(ex.instanceId, set),
                onDelete: () => handleDeleteSet(ex.instanceId, set.id),
                isLast: idx === ex.sets.length - 1,
                onPressSetNumber: (pageX: number, pageY: number, width: number, height: number) => handleSetNumberPress(ex.instanceId, set.id, pageX, pageY, width, height),
                isSelectionMode: selectionMode?.exerciseId === ex.instanceId,
                isSelected: selectedSetIds.has(set.id),
                onToggleSelection: (isAddToGroupAction?: boolean) => handleToggleSetSelection(set.id, isAddToGroupAction),
                isRestTimerSelectionMode: restTimerSelectionMode,
                isRestTimerSelected: restTimerSelectedSetIds.has(set.id),
                onToggleRestTimerSelection: toggleRestTimerSelection,
                dropSetId: set.dropSetId,
                isDropSetStart: !!(set.dropSetId && (idx === 0 || ex.sets[idx - 1].dropSetId !== set.dropSetId)),
                isDropSetEnd: !!(set.dropSetId && (idx === ex.sets.length - 1 || ex.sets[idx + 1]?.dropSetId !== set.dropSetId) && !set.restPeriodSeconds),
                groupSetNumber: groupSetNumber ?? 0,
                indexInGroup: indexInGroup ?? 0,
                overallSetNumber: overallSetNumber,
                warmupIndex,
                workingIndex,
                editingGroupId: selectionMode?.editingGroupId,
                isGroupChild,
                parentGroupType,
                readOnly,
                shouldFocus: focusNextSet?.setId === set.id ? (focusNextSet.field === 'weight' || focusNextSet.field === 'weight2' || focusNextSet.field === 'reps' || focusNextSet.field === 'duration' || focusNextSet.field === 'distance' ? focusNextSet.field : null) : null,
                onFocusHandled: () => setFocusNextSet(null),
                onCustomKeyboardOpen: !readOnly && !restTimerSelectionMode ? ({ field, value }: { field: 'weight' | 'weight2' | 'reps' | 'duration' | 'distance'; value: string }) => handleCustomKeyboardOpen(ex.instanceId, set.id, field, value) : null,
                customKeyboardActive: customKeyboardTarget?.exerciseId === ex.instanceId && customKeyboardTarget?.setId === set.id,
                customKeyboardField: customKeyboardTarget?.exerciseId === ex.instanceId && customKeyboardTarget?.setId === set.id ? (customKeyboardTarget.field === 'weight' || customKeyboardTarget.field === 'weight2' || customKeyboardTarget.field === 'reps' || customKeyboardTarget.field === 'duration' || customKeyboardTarget.field === 'distance' ? customKeyboardTarget.field : null) : null,
                hasSecondWeight,
                customKeyboardShouldSelectAll: customKeyboardTarget?.exerciseId === ex.instanceId && customKeyboardTarget?.setId === set.id ? customKeyboardShouldSelectAll : false,
                onLongPressRow: () => startSetDrag(ex),
                showDuration: visibleColumns.showDuration,
                showDistance: visibleColumns.showDistance,
                showWeight: visibleColumns.showWeight,
                showReps: visibleColumns.showReps,
              };

              const restTimerBarProps = {
                set,
                exerciseId: ex.instanceId,
                currentWorkout,
                handleWorkoutUpdate,
                activeRestTimer,
                setActiveRestTimer,
                setRestPeriodSetInfo,
                setRestTimerInput,
                setRestPeriodModalOpen,
                setRestTimerPopupOpen,
                isRestTimerDropSetStart,
                isRestTimerDropSetEnd,
                displayGroupSetType: displayGroupSetType as GroupSetType,
                isBeingEdited,
                onClearInputFocus: closeCustomKeyboard,
                isRestTimerSelectionMode: restTimerSelectionMode,
                isRestTimerSelected,
                onToggleRestTimerSelection: toggleRestTimerSelection,
              };

              const setRowAndTimer = (
                <>
                  <SetRow {...setRowProps} />
                  {showRestTimer && <RestTimerBar {...restTimerBarProps} />}
                </>
              );

              return (
                <React.Fragment key={set.id}>
                  {shouldWrapInSelectionBorder ? (
                    <View style={[
                      styles.restTimerSelectionWrapper,
                      isRestTimerSelected && styles.restTimerSelectionWrapper__selected
                    ]}>
                      {setRowAndTimer}
                    </View>
                  ) : (
                    setRowAndTimer
                  )}
                </React.Fragment>
              );
            })}
            {!readOnly && (
              <TouchableOpacity
                onPress={() => handleAddSet(ex.instanceId)}
                style={[
                  styles.addSetButton,
                  isGroupChild && groupColorScheme && {
                    borderColor: groupColorScheme[200],
                    backgroundColor: groupColorScheme[50],
                  }
                ]}
              >
                <Text style={[
                  styles.addSetButtonText,
                  isGroupChild && groupColorScheme && { color: groupColorScheme[600] }
                ]}>+ Set</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectionMode?.exerciseId === ex.instanceId && (
            <View style={[
              styles.selectionModeFooter,
              isGroupChild && groupColorScheme && {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[100],
              },
            ]}>
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

      </View>
    );

    if (isGroupChild) {
      // Determine marginBottom: 16 if in drag mode and group is unselected (collapsed), 0 otherwise
      const shouldHaveMargin = isDragging && collapsedGroupId && parentGroupId && collapsedGroupId !== parentGroupId;

      return (
        <View
          key={ex.instanceId}
          style={[
            styles.groupChildWrapper,
            groupColorScheme && {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
            },
            isLastChild && styles.groupChildWrapper__last,
            isLastChild && groupColorScheme && {
              borderBottomColor: groupColorScheme[200],
            },
            isLastChild && shouldHaveMargin && { marginBottom: 16 },
            isLastChild && !shouldHaveMargin && { marginBottom: 0 }
          ]}
        >
          {cardContent}
        </View>
      );
    }

    return cardContent;
  };

  // Draggable list item renderer - shows collapsed cards when dragging, full view otherwise
  const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<WorkoutDragItem>) => {
    // Helper to initiate drag with two-phase approach - passes item ID for scroll centering
    const initiateDelayedDrag = () => {
      handlePrepareDrag(drag, item.id);
    };

    if (item.type === 'GroupHeader') {
      const groupColorScheme = getGroupColorScheme(item.groupType);
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;
      const shouldRenderGhosts = isCollapsed && !isDraggedGroup;
      const isActivelyDragging = isActive && isDraggedGroup;

      const itemsInThisGroup = dragItems.filter(i =>
        i.groupId === item.groupId && i.type === 'Exercise'
      );
      const isActuallyEmpty = itemsInThisGroup.length === 0;

      return (
        <TouchableOpacity
          onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
          onLongPress={() => {
            if (item.groupId && !shouldRenderGhosts) {
              initiateGroupDrag(item.groupId, drag);
            }
          }}
          disabled={isActive || shouldRenderGhosts}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            styles.dragGroupHeaderContainer,
            isDragging && !isActive && styles.dragGroupHeaderContainer__exerciseDrag,
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20,
              zIndex: 9999,
              marginTop: 4,
              transform: [{ scale: 1.02 }],
              position: 'relative',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              if (isDragging || isActive) {
                collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
              } else {
                itemHeights.current.set(item.id, e.nativeEvent.layout.height);
              }
            }}
            style={[
              styles.dragGroupHeader,
              isDraggedGroup && styles.dragGroupHeader__collapsed,
              {
                borderColor: groupColorScheme[200],
                backgroundColor: groupColorScheme[100],
              },
              isDraggedGroup && isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 9999,
                elevation: 20,
              },
              isDraggedGroup && !isActive && {
                borderColor: groupColorScheme[300],
                zIndex: 900,
              },
            ]}
          >
            <View style={styles.dragGroupHeaderContent}>
              <Layers size={16} color={groupColorScheme[600]} />
              <Text style={[styles.dragGroupHeaderText, { color: groupColorScheme[700] }]}>
                {item.groupType}
              </Text>
            </View>
          </View>

          {shouldRenderGhosts && !isActivelyDragging && (
            <View>
              {dragItems
                .filter((i): i is ExerciseDragItem => i.groupId === item.groupId && i.type === 'Exercise')
                .map((ghostItem, index, array) => {
                  const isFirst = index === 0;
                  const isLast = index === array.length - 1;
                  return (
                    <View
                      key={ghostItem.id}
                      style={[
                        styles.dragExerciseCard,
                        styles.dragExerciseCard__inGroup,
                        groupColorScheme && {
                          backgroundColor: groupColorScheme[50],
                          borderColor: groupColorScheme[200],
                        },
                        isFirst && styles.dragExerciseCard__firstInGroup,
                        isLast && styles.dragExerciseCard__lastInGroup,
                      ]}
                    >
                      <View style={styles.dragExerciseContent}>
                        <Text style={styles.dragExerciseName}>{ghostItem.exercise.name}</Text>
                        <Text style={[
                          styles.dragExerciseSetCount,
                          groupColorScheme && { color: groupColorScheme[600] }
                        ]}>
                          {ghostItem.setCount} sets
                        </Text>
                      </View>
                    </View>
                  );
                })}
              <View
                style={[
                  styles.dragGroupFooter,
                  styles.dragGroupFooter__dragging,
                  {
                    borderColor: groupColorScheme[200],
                    backgroundColor: groupColorScheme[100],
                  },
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (item.type === 'GroupFooter') {
      const groupColorScheme = getGroupColorScheme(item.groupType);
      const isCollapsed = item.isCollapsed || collapsedGroupId === item.groupId;
      const isDraggedGroup = collapsedGroupId === item.groupId;

      // Hide collapsed group footers only if they're part of the dragged group
      // Other collapsed groups show their footer as part of the ghost rendering
      if (isCollapsed && isDraggedGroup) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      // Don't render footer if it's part of a collapsed group (ghost rendering handles it)
      if (isCollapsed && !isDraggedGroup) {
        return <View style={{ height: 0, overflow: 'hidden' }} />;
      }

      return (
        <View
          onLayout={(e) => {
            if (isDragging) {
              collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
            } else {
              itemHeights.current.set(item.id, e.nativeEvent.layout.height);
            }
          }}
          style={[
            styles.dragGroupFooter,
            isDragging && !isDraggedGroup && styles.dragGroupFooter__exerciseDrag,
            {
              borderColor: groupColorScheme[200],
              backgroundColor: groupColorScheme[100],
              opacity: isDragging ? 1 : 0, // Visible only when dragging
            },
          ]}
        />
      );
    }

    // Exercise item
    const groupColorScheme = item.groupId
      ? getGroupColorScheme((dragItems.find(d => d.type === 'GroupHeader' && d.groupId === item.groupId) as any)?.groupType)
      : null;

    const isCollapsed = item.isCollapsed || (collapsedGroupId && item.groupId === collapsedGroupId);
    const isDraggedGroup = collapsedGroupId === item.groupId;

    // Hide collapsed exercises only if they're part of the dragged group
    // Other collapsed groups show their exercises as ghosts in the header
    if (isCollapsed && isDraggedGroup) {
      return <View style={{ height: 0, overflow: 'hidden' }} />;
    }

    // Hide exercises that are part of other collapsed groups (frozen groups - shown as ghosts in header)
    if (isCollapsed && !isDraggedGroup) {
      return <View style={{ height: 0, overflow: 'hidden' }} />;
    }

    // When dragging or active, show collapsed card
    if (isDragging || isActive) {
      return (
        <TouchableOpacity
          onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={150}
          activeOpacity={1}
          style={[
            isActive && {
              opacity: 0.9,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 20,
              zIndex: 9999,
              transform: [{ scale: 1.02 }],
              position: 'relative',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              if (isDragging || isActive) {
                collapsedItemHeights.current.set(item.id, e.nativeEvent.layout.height);
              } else {
                itemHeights.current.set(item.id, e.nativeEvent.layout.height);
              }
            }}
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
              isActive && item.groupId && groupColorScheme && {
                borderColor: groupColorScheme[300],
                zIndex: 9999,
                elevation: 20,
              },
              // Add bottom border for grouped exercises (not last in group) when dragging
              // Applies when dragging individual exercise OR when a collapsed group is being dragged
              // When dragging a collapsed group, collapsedGroupId is set; when dragging individual exercise, isDragging is true
              // Other groups are frozen (collapsed) when dragging a collapsed group, so only non-collapsed exercises in the dragged group receive this styling
              ((isDragging && !isActive) || (collapsedGroupId && !isDraggedGroup)) && item.groupId && !isCollapsed && !item.isLastInGroup && groupColorScheme && {
                borderBottomWidth: 1,
                borderBottomColor: groupColorScheme[200],
              },
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
        : null,
      item.groupId || null,
      item.isFirstInGroup
    );

    // Wrap with TouchableOpacity that triggers two-phase drag
    // Note: Keys are handled by FlatList's keyExtractor, don't add key prop here
    return (
      <TouchableOpacity
        onPressIn={(e) => recordTouchPosition(item.id, e.nativeEvent.pageY)}
        onLongPress={initiateDelayedDrag}
        delayLongPress={200}
        activeOpacity={1}
        disabled={isActive}
      >
        <View
          onLayout={(e) => {
            if (!isDragging && !isActive) {
              itemHeights.current.set(item.id, e.nativeEvent.layout.height);
            }
          }}
        >
          {fullCard}
        </View>
      </TouchableOpacity>
    );
  }, [dragItems, isDragging, collapsedGroupId, renderExerciseCard, handlePrepareDrag, initiateGroupDrag]);

  const dragKeyExtractor = useCallback((item: WorkoutDragItem) => item.id, []);

  const notesHeaderComponent = useMemo(() => {
    if (isDragging) return null;
    return (
      <View style={[
        styles.notesSection,
        !showNotes && styles.notesSection__collapsed,
        showNotes && styles.notesSection__expanded,
      ]}>
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
              sortedNotes.map((note) => <SavedNoteItem key={note.id} note={note} onPin={handlePinNote} onRemove={handleRemoveNote} onUpdate={(updatedNote) => {
                handleWorkoutUpdate({
                  ...currentWorkout,
                  sessionNotes: (currentWorkout.sessionNotes || []).map(n => n.id === updatedNote.id ? updatedNote : n)
                });
              }} />)
            ) : (
              <Text style={styles.emptyNotesText}>No notes added yet.</Text>
            )}
          </View>
        )}
      </View>
    );
  }, [isDragging, showNotes, currentWorkout.sessionNotes, sortedNotes, handlePinNote, handleRemoveNote]);

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
      <View
        ref={listContainerRef}
        onLayout={() => {
          listContainerRef.current?.measureInWindow?.((_, pageY) => {
            setListLayoutY(pageY);
          });
        }}
        style={{ flex: 1 }}
      >
        <DraggableFlatList<WorkoutDragItem>
          ref={listRef}
          data={dragItems}
          onDragBegin={() => {
            handleDragBegin();
          }}
          onDragEnd={(params) => {
            handleDragEnd(params);
          }}
          keyExtractor={dragKeyExtractor}
          renderItem={renderDragItem}
          contentContainerStyle={[
            styles.dragListContent,
            { paddingTop: preCollapsePaddingTop ?? 0 },
          ]}
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {customHeader ? customHeader : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerButton}>
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
          <TouchableOpacity
            onPress={handleCancel}
            style={[styles.finishButton, styles.finishButton__cancelWorkout]}
          >
            <Text style={styles.finishButtonText}>CANCEL</Text>
          </TouchableOpacity>
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
          if (columnHeaderMenu) {
            setColumnHeaderMenu(null);
          }
        }}
      >
        <View style={styles.mainContentWrapper}>
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
                      <Layers size={18} color={defaultSupersetColorScheme[600]} />
                      <Text style={styles.setPopupOptionText}>{isGrouped ? 'Edit dropset(s)' : 'Edit dropset'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.setPopupOptionItem,
                        hasRestPeriod && styles.setPopupOptionItem__activeRest
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSetMenuAction(hasRestPeriod ? 'remove_rest' : 'add_rest');
                      }}
                    >
                      <Timer size={18} color={hasRestPeriod ? COLORS.white : COLORS.blue[500]} />
                      <Text style={[
                        styles.setPopupOptionText,
                        hasRestPeriod && styles.setPopupOptionText__active
                      ]}>{hasRestPeriod ? `Rest: ${formatRestTime(set.restPeriodSeconds!)}` : 'Add rest timer'}</Text>
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
                const isInGroup = currentExercise ? isExerciseInSuperset(currentWorkout.exercises, optionsModalExId) : false;

                return (
                  <>
                    <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleReplaceExercise(optionsModalExId)}>
                      <RefreshCw size={18} color={COLORS.slate[600]} />
                      <Text style={styles.setPopupOptionText}>Replace Exercise</Text>
                    </TouchableOpacity>

                    {/* Superset Options */}
                    <TouchableOpacity style={styles.setPopupOptionItem} onPress={() => handleEditSupersetWrapper(optionsModalExId)}>
                      <Layers size={18} color={defaultSupersetColorScheme[600]} />
                      <Text style={styles.setPopupOptionText}>{isInGroup ? 'Edit superset' : 'Create Group'}</Text>
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

          {/* Column Header Menu Popup */}
          <SetRowHeadersPopup
            visible={!!columnHeaderMenu}
            columnHeaderMenu={columnHeaderMenu}
            columnHeaderMenuPage={columnHeaderMenuPage}
            setColumnHeaderMenuPage={setColumnHeaderMenuPage}
            onClose={() => {
              setColumnHeaderMenu(null);
              setColumnHeaderMenuPage('main');
            }}
            currentWorkout={currentWorkout}
            exercisesLibrary={exercisesLibrary}
            handleWorkoutUpdate={handleWorkoutUpdate}
            handleToggleUnit={handleToggleUnit}
            getVisibleColumns={getVisibleColumns}
            popupKey={popupKey}
          />
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
          // Close ExercisePicker before opening EditExercise (React Native doesn't support nested modals)
          // Use requestAnimationFrame for fastest possible transition
          setShowPicker(false);
          setSelectedExerciseForHistory(null); // Clear any selected exercise to ensure create mode
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsCreateModalOpen(true);
            });
          });
        }}
        exercises={exercisesLibrary}
        newlyCreatedId={newlyCreatedExerciseId}
      />

      <EditExercise
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          // If we were editing from history modal, clear the selected exercise
          if (selectedExerciseForHistory) {
            setSelectedExerciseForHistory(null);
          } else {
            // Reopen ExercisePicker if it was open before (user cancelled creating new exercise)
            // Use requestAnimationFrame for fastest possible transition
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setShowPicker(true);
              });
            });
          }
        }}
        onSave={selectedExerciseForHistory ? handleEditExerciseSave : handleCreateExerciseSave}
        categories={CATEGORIES as ExerciseCategory[]}
        exercise={selectedExerciseForHistory || undefined}
      />

      <ExerciseHistoryModal
        visible={historyModalVisible}
        onClose={() => {
          setHistoryModalVisible(false);
          setSelectedExerciseForHistory(null);
        }}
        exercise={selectedExerciseForHistory}
        stats={selectedExerciseForHistory ? (exerciseStats[selectedExerciseForHistory.id] || {}) : {}}
        defaultTab="About"
        onEdit={(exercise) => {
          setHistoryModalVisible(false);
          // Open EditExercise modal in edit mode
          setSelectedExerciseForHistory(exercise);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsCreateModalOpen(true);
            });
          });
        }}
      />

      <WorkoutModals
        isNoteModalOpen={isNoteModalOpen}
        setIsNoteModalOpen={setIsNoteModalOpen}
        newNote={newNote}
        setNewNote={setNewNote}
        newNoteDate={newNoteDate}
        setNewNoteDate={setNewNoteDate}
        onAddNote={handleAddNote}
        exerciseNoteModalOpen={exerciseNoteModalOpen}
        setExerciseNoteModalOpen={setExerciseNoteModalOpen}
        currentExerciseNote={currentExerciseNote}
        setCurrentExerciseNote={setCurrentExerciseNote}
        onSaveExerciseNote={handleSaveExerciseNote}
        finishModalOpen={finishModalOpen}
        setFinishModalOpen={setFinishModalOpen}
        cancelModalOpen={cancelModalOpen}
        setCancelModalOpen={setCancelModalOpen}
        onFinish={handleFinish}
        onConfirmCancel={confirmCancel}
      />

      <RestTimerInputModal
        visible={restPeriodModalOpen}
        onClose={() => {
          setRestPeriodModalOpen(false);
          setRestPeriodSetInfo(null);
          setRestTimerInput('');
          setRestTimerSelectionMode(false);
          setRestTimerSelectedSetIds(new globalThis.Set<string>());
        }}
        restTimerInput={restTimerInput}
        setRestTimerInput={setRestTimerInput}
        restPeriodSetInfo={restPeriodSetInfo}
        currentWorkout={currentWorkout}
        handleWorkoutUpdate={handleWorkoutUpdate}
        setActiveRestTimer={setActiveRestTimer}
        setRestTimerPopupOpen={setRestTimerPopupOpen}
        onAddRestPeriod={handleAddRestPeriod}
        onSetSelectionMode={setRestTimerSelectionMode}
        selectedSetIds={restTimerSelectedSetIds}
        onToggleSetSelection={(exerciseId, setId) => {
          setRestTimerSelectedSetIds((prev: globalThis.Set<string>) => {
            const newSet = new globalThis.Set<string>(prev);
            if (newSet.has(setId)) {
              newSet.delete(setId);
            } else {
              newSet.add(setId);
            }
            return newSet;
          });
        }}
      />

      <ActiveRestTimerPopup
        visible={restTimerPopupOpen}
        activeRestTimer={activeRestTimer}
        onClose={() => setRestTimerPopupOpen(false)}
        setActiveRestTimer={setActiveRestTimer}
        currentWorkout={currentWorkout}
        handleWorkoutUpdate={handleWorkoutUpdate}
      />

      {/* Superset Selection Mode Overlay */}
      {supersetSelectionMode && (() => {
        // Determine group type: if editing, get from the group; if creating, default to Superset
        let groupType: GroupType = 'Superset';
        if (supersetSelectionMode.mode === 'edit' && supersetSelectionMode.supersetId) {
          const group = currentWorkout.exercises.find(ex => ex.instanceId === supersetSelectionMode.supersetId);
          if (group && group.type === 'group') {
            groupType = group.groupType;
          }
        }
        const bannerColorScheme = getGroupColorScheme(groupType);

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

                    const groupColorScheme = getGroupColorScheme(exercise.groupType);
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
                                  <Check size={16} color="#fff" strokeWidth={3} />
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
                            <Check size={16} color="#fff" strokeWidth={3} />
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
        visible={customKeyboardVisible && !restPeriodModalOpen}
        customKeyboardTarget={customKeyboardTarget && (customKeyboardTarget.field === 'weight' || customKeyboardTarget.field === 'weight2' || customKeyboardTarget.field === 'reps' || customKeyboardTarget.field === 'duration' || customKeyboardTarget.field === 'distance') ? {
          exerciseId: customKeyboardTarget.exerciseId,
          setId: customKeyboardTarget.setId,
          field: customKeyboardTarget.field as 'weight' | 'weight2' | 'reps' | 'duration' | 'distance'
        } : null}
        customKeyboardValue={customKeyboardValue}
        onInput={handleCustomKeyboardInput}
        onSetValue={handleCustomKeyboardSetValue}
        onNext={handleCustomKeyboardNext}
        onClose={handleCustomKeyboardClose}
      />

      <SetDragModal
        visible={isSetDragActive}
        exercise={setDragActiveExercise}
        setDragItems={setDragItems}
        onDragEnd={handleSetDragEnd}
        onCancel={cancelSetDrag}
        onSave={saveSetDrag}
        onCreateDropset={onCreateDropset}
        onUpdateSet={onUpdateSet}
        onAddSet={onAddSet}
        onUpdateRestTimer={onUpdateRestTimer}
        onUpdateRestTimerMultiple={onUpdateRestTimerMultiple}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 18,
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
    marginHorizontal: -6,
  },
  notesSection__collapsed: {
    borderBottomWidth: 0, // Remove double border effect when collapsed
  },
  notesSection__expanded: {
    borderBottomWidth: 1, // Keep border when expanded
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
    marginTop: 8,
    marginHorizontal: 8,
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
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.slate[100],
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  exerciseCard__groupChild: {
    marginHorizontal: 0,
    marginBottom: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 2,
  },
  exerciseCard__groupChild__first: {
    marginTop: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  exerciseCard__groupChild__last: {
    marginBottom: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.slate[50],
    borderBottomWidth: 0,
  },
  exerciseHeader__groupChild: {
    paddingBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  exerciseContent: {
    paddingTop: 8,
    paddingHorizontal: 0,
    paddingBottom: 4,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 0,
    paddingBottom: 4,
    gap: 8,
  },
  colIndex: {
    width: 36, // 32px indexBadge + 4px marginRight
    alignItems: 'center', // Left align
    justifyContent: 'center',
  },
  colPrevious: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  colDuration: {
    width: 80, // Fixed width for duration column header (matches input width)
    alignItems: 'center',
    justifyContent: 'center',
  },
  colDistance: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  colWeight: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  colWeight__twoInputs: {
    flex: 2, // Takes 2/3 of space when there are 2 weight inputs (so each input gets 1/3)
  },
  colReps: {
    flex: 1,
    flexBasis: 0, // Force equal width distribution
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  colReps__twoWeightInputs: {
    flex: 1, // Takes 1/3 of space when there are 2 weight inputs (same as each weight input)
  },
  colCheck: {
    width: 26, // Match checkButton width
    alignItems: 'center', // Right align
    justifyContent: 'center',
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
  addSetButton: {
    marginTop: 4,
    marginHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.slate[200],
    borderStyle: 'dashed',
    backgroundColor: COLORS.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
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
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 0,
    marginHorizontal: -2,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    minHeight: 8,
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
  groupTypeOption__warmup: {
    backgroundColor: COLORS.orange[500],
    borderColor: COLORS.orange[500],
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


  // Group child wrapper
  groupChildWrapper: {
    marginHorizontal: -2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    paddingHorizontal: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  groupChildWrapper__last: {
    borderBottomWidth: 2,
    marginBottom: 0, // Will be conditionally set to 16 in drag mode for unselected groups
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingBottom: 0,
  },

  // Move mode banner

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
    borderRadius: 8,
    borderWidth: 2,
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
    textTransform: 'uppercase',
  },
  supersetGroupLabelSubtext: {
    fontSize: 11,
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
  supersetCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
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
  // Drag Mode Styles
  dragListContent: {
    paddingHorizontal: 6,
    paddingTop: 0,
    paddingBottom: 100,
  },
  dragGroupHeaderContainer: {
    marginTop: 0,
    marginBottom: 0,
    position: 'relative',
    marginHorizontal: -2,
  },
  dragGroupHeaderContainer__exerciseDrag: {
    marginHorizontal: 0,
  },
  dragGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 0,
    marginTop: 4,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragGroupHeader__collapsed: {
    borderBottomWidth: 2,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderStyle: 'dashed',
    marginBottom: 4,
    zIndex: 999,
    elevation: 10,
  },
  dragGroupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restTimerSelectionWrapper: {
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderRadius: 6,
    marginVertical: 4,
    marginHorizontal: 8,
    padding: 2,
  },
  restTimerSelectionWrapper__selected: {
    borderColor: COLORS.blue[500],
    backgroundColor: COLORS.blue[50],
  },
  dragGroupHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dragGroupFooter: {
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    minHeight: 1,
  },
  dragGroupFooter__dragging: {
    minHeight: 8, // Taller footer when collapsed and being dragged
  },
  dragGroupFooter__exerciseDrag: {
    minHeight: 8, // Taller footer when dragging an individual exercise
  },
  dragExerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    marginTop: 4,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  dragExerciseCard__inGroup: {
    borderRadius: 0,
    marginTop: 0,
    marginBottom: 0,
    marginVertical: 0,
    borderWidth: 0,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  dragExerciseCard__firstInGroup: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
  },
  dragExerciseCard__lastInGroup: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  dragItem__active: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.slate[300],
    borderStyle: 'dashed',
    borderRadius: 6,
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
